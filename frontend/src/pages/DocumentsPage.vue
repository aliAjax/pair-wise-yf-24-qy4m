<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewSessionStore } from "../stores/ReviewSessionStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useAuditLogStore } from "../stores/AuditLogStore";
import { parseDocumentSections } from "../constructors/PolicyDocumentConstructor";
import { formatDate, truncate } from "../utils/formatters";
import { recordLog } from "../utils/logger";
import ImportPanel from "../components/common/ImportPanel.vue";
import StatCard from "../components/common/StatCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import type { PolicyDocument } from "../types/PolicyDocument";

const router = useRouter();
const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const sessionStore = useReviewSessionStore();
const noteStore = useReviewNoteStore();
const auditStore = useAuditLogStore();
const { rows, loading } = storeToRefs(documentStore);

const showImport = ref(false);
const editing = ref<PolicyDocument | null>(null);

const totalSections = computed(() =>
  rows.value.reduce((sum, doc) => sum + parseDocumentSections(doc).length, 0)
);

function newForm() {
  editing.value = null;
  showImport.value = true;
}

function editDocument(doc: PolicyDocument) {
  editing.value = doc;
  showImport.value = true;
}

async function handleSubmit(form: { title: string; version_label: string; raw_text: string }) {
  if (editing.value) {
    const ok = await documentStore.reimport(editing.value.id, form);
    if (!ok) {
      ElMessage.error(documentStore.error);
      return;
    }
    const updated = documentStore.rows.find((row) => row.id === editing.value?.id);
    if (updated) {
      sectionStore.replaceFor(updated.id, parseDocumentSections(updated));
      // 内容变化后重算涉及该文档的对比，已解决结论会按指纹自动回退
      await refreshRelatedPairs(updated);
    }
    ElMessage.success("版本已更新，差异结果与审阅状态已同步重算");
  } else {
    const created = await documentStore.importDocument(form);
    if (!created) {
      ElMessage.error(documentStore.error);
      return;
    }
    sectionStore.replaceFor(created.id, parseDocumentSections(created));
    ElMessage.success(`导入成功，已自动分段为 ${parseDocumentSections(created).length} 个条款`);
  }
  auditStore.refresh();
  showImport.value = false;
  editing.value = null;
}

async function refreshRelatedPairs(changed: PolicyDocument) {
  const others = documentStore.rows.filter((row) => row.id !== changed.id);
  for (const other of others) {
    if (sessionStore.old_document_id === other.id && sessionStore.new_document_id === changed.id) {
      await diffStore.recompute(other, changed);
    } else if (sessionStore.old_document_id === changed.id && sessionStore.new_document_id === other.id) {
      await diffStore.recompute(changed, other);
    }
  }
  await noteStore.load(sessionStore.new_document_id);
}

async function removeDocument(doc: PolicyDocument) {
  try {
    await ElMessageBox.confirm(
      `确定删除《${doc.title}》版本 ${doc.version_label}？相关对比结果将一并失效。`,
      "删除版本",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  const ok = await documentStore.remove(doc.id);
  if (ok) {
    await sectionStore.load();
    if (sessionStore.old_document_id === doc.id || sessionStore.new_document_id === doc.id) {
      sessionStore.reset();
      noteStore.setScope(null);
      diffStore.loadPair(null, null);
    }
    ElMessage.success("版本已删除");
  }
}

function setAsVersion(doc: PolicyDocument, role: "old" | "new") {
  const oldId = role === "old" ? doc.id : sessionStore.old_document_id;
  const newId = role === "new" ? doc.id : sessionStore.new_document_id;
  if (oldId !== null && oldId === newId) {
    ElMessage.warning("旧版与新版不能选择同一份政策文档");
    return;
  }
  const oldDoc = documentStore.rows.find((row) => row.id === oldId) ?? null;
  const newDoc = documentStore.rows.find((row) => row.id === newId) ?? null;
  sessionStore.select(oldDoc, newDoc);
  noteStore.setScope(newDoc?.id ?? null);
  ElMessage.success(
    role === "new" ? `已将 ${doc.version_label} 设为所审新版版本` : "旧版版本已设置"
  );
}

function exportDocument(doc: PolicyDocument) {
  const sections = parseDocumentSections(doc);
  const content = [
    `# ${doc.title}（${doc.version_label}）`,
    "",
    `导入时间：${formatDate(doc.imported_at)}`,
    "",
    ...sections.map(
      (section) =>
        `## ${section.section_no} ${section.heading}\n\n- 类别：${section.category}\n- 风险等级：${section.risk_level}\n- 判定理由：${section.risk_reason}\n\n${section.content}\n`
    )
  ].join("\n");
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${doc.title}-${doc.version_label}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
  recordLog("PolicyDocument", "EXPORT", { count: 1, version: doc.version_label });
  auditStore.refresh();
}

function goCompare(doc: PolicyDocument) {
  router.push({ path: "/compare", query: { pick: doc.id } });
}

onMounted(async () => {
  sessionStore.load();
  await Promise.all([documentStore.load(), sectionStore.load(), noteStore.load(sessionStore.new_document_id)]);
});
</script>

<template>
  <div class="stack">
    <section class="metric-grid">
      <StatCard label="已导入版本" :value="rows.length" />
      <StatCard label="条款总数" :value="totalSections" />
      <StatCard
        label="当前所审新版"
        :value="documentStore.byId(sessionStore.new_document_id)?.version_label ?? '未选择'"
        tone="warning"
      />
    </section>

    <section class="panel">
      <div class="panel-title">
        版本列表
        <span class="sub">粘贴政策文本后按编号自动分段，数据收集/共享/保存期限条款自动标注风险</span>
        <div style="flex:1" />
        <el-button type="primary" :icon="'Plus'" @click="newForm">
          粘贴新版本
        </el-button>
      </div>

      <el-table v-loading="loading" :data="rows" stripe>
        <el-table-column label="版本" min-width="200">
          <template #default="{ row }">
            <strong>{{ row.title }}</strong>
            <el-tag size="small" class="version-tag">{{ row.version_label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="条款数" width="90">
          <template #default="{ row }">{{ parseDocumentSections(row).length }}</template>
        </el-table-column>
        <el-table-column label="正文预览" min-width="260">
          <template #default="{ row }">
            <span class="text-muted">{{ truncate(row.raw_text.replace(/\s+/g, " "), 70) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="导入时间" width="170">
          <template #default="{ row }">{{ formatDate(row.imported_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="330" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="setAsVersion(row, 'old')">设为旧版</el-button>
            <el-button size="small" type="warning" @click="setAsVersion(row, 'new')">
              设为所审新版
            </el-button>
            <el-button size="small" text @click="editDocument(row)">重新粘贴</el-button>
            <el-button size="small" text @click="exportDocument(row)">导出</el-button>
            <el-button size="small" text type="primary" @click="goCompare(row)">去对比</el-button>
            <el-button size="small" text type="danger" @click="removeDocument(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState title="还没有政策版本" description="点击「粘贴新版本」，把旧版或新版隐私政策全文导入。" icon="📄" />
        </template>
      </el-table>
    </section>

    <el-drawer
      v-model="showImport"
      :title="editing ? `重新粘贴：${editing.version_label}` : '粘贴政策版本'"
      size="560px"
      destroy-on-close
    >
      <ImportPanel
        v-if="showImport"
        :model-value="
          editing
            ? {
                title: editing.title,
                version_label: editing.version_label,
                raw_text: editing.raw_text
              }
            : undefined
        "
        :submit-text="editing ? '保存并重新分段' : '导入并自动分段'"
        @submit="handleSubmit"
        @cancel="showImport = false"
      />
    </el-drawer>
  </div>
</template>

<style scoped>
.version-tag {
  margin-left: 8px;
}
</style>
