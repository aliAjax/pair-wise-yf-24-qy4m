<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useReviewSessionStore } from "../stores/ReviewSessionStore";
import { useAuditLogStore } from "../stores/AuditLogStore";
import { ReviewStatusText, ReviewStatusOptions } from "../constants/ReviewStatus";
import type { ReviewStatus } from "../constants/ReviewStatus";
import { ReviewTagText } from "../constants/ReviewTag";
import { DiffTypeText } from "../constants/DiffType";
import { buildReviewMarkdown, downloadMarkdown } from "../utils/exportMarkdown";
import { formatDate } from "../utils/formatters";
import type { ReviewNote } from "../types/ReviewNote";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import RiskTag from "../components/common/RiskTag.vue";
import DiffViewer from "../components/common/DiffViewer.vue";
import EmptyState from "../components/common/EmptyState.vue";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();
const sessionStore = useReviewSessionStore();
const auditStore = useAuditLogStore();

const statusFilter = ref<ReviewStatus | "ALL">("OPEN");
const expandedId = ref<number | null>(null);

const oldDocument = computed(() => documentStore.byId(sessionStore.old_document_id));
const newDocument = computed(() => documentStore.byId(sessionStore.new_document_id));
const pairDiffs = computed(() =>
  diffStore.rows.filter(
    (diff) =>
      diff.old_document_id === sessionStore.old_document_id &&
      diff.new_document_id === sessionStore.new_document_id
  )
);
const diffById = computed(() => new Map(pairDiffs.value.map((diff) => [diff.id, diff])));

/** 清单只包含当前所审新版版本的备注 */
const items = computed(() =>
  noteStore.scopedRows
    .filter((note) => note.old_document_id === sessionStore.old_document_id)
    .filter((note) => (statusFilter.value === "ALL" ? true : note.status === statusFilter.value))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
);

const stats = computed(() => ({ ...noteStore.statusStats }));

function diffOf(note: ReviewNote) {
  return diffById.value.get(note.diff_result_id);
}
function riskOf(note: ReviewNote) {
  const diff = diffOf(note);
  if (diff?.section_id) {
    return sectionStore.rows.find((row) => row.id === diff.section_id)?.risk_level ?? null;
  }
  return null;
}

async function changeStatus(note: ReviewNote, status: ReviewStatus): Promise<void> {
  const diff = diffOf(note);
  if (!diff) {
    ElMessage.error("对应的差异结果不存在，请回到版本对比页重新计算");
    return;
  }
  const ok = await noteStore.changeStatus(note, status, diff);
  auditStore.refresh();
  if (ok) ElMessage.success(`已标记为「${ReviewStatusText[status]}」`);
}

async function exportMarkdown(): Promise<void> {
  if (!oldDocument.value || !newDocument.value) {
    ElMessage.error("请先在版本对比页选择两版政策");
    return;
  }
  if (pairDiffs.value.length === 0) {
    ElMessage.warning("还没有差异结果，请先在版本对比页执行对比");
    return;
  }
  const markdown = buildReviewMarkdown({
    oldDocument: oldDocument.value,
    newDocument: newDocument.value,
    diffs: pairDiffs.value,
    notes: noteStore.scopedRows.filter((note) => note.old_document_id === sessionStore.old_document_id),
    newSections: sectionStore.byDocument(newDocument.value.id)
  });
  downloadMarkdown(
    `审阅摘要_${newDocument.value.version_label}_${new Date().toISOString().slice(0, 10)}.md`,
    markdown
  );
  auditStore.refresh();
  ElMessage.success("Markdown 摘要已导出");
}

onMounted(async () => {
  sessionStore.load();
  await documentStore.load();
  await sectionStore.load();
  await noteStore.load(sessionStore.new_document_id);
  await diffStore.loadPair(sessionStore.old_document_id, sessionStore.new_document_id);
});
</script>

<template>
  <div class="stack">
    <section class="panel">
      <div class="panel-title">
        当前审阅会话
        <div style="flex:1" />
        <el-tag v-if="newDocument" type="warning" effect="dark">
          所审新版：{{ newDocument.title }} {{ newDocument.version_label }}
        </el-tag>
        <el-tag v-if="oldDocument" effect="plain">旧版：{{ oldDocument.version_label }}</el-tag>
        <el-button type="primary" :disabled="!oldDocument || !newDocument" @click="exportMarkdown">
          导出 Markdown 摘要
        </el-button>
      </div>
      <p v-if="!newDocument" class="text-muted" style="margin:0">
        尚未选择所审新版版本，请到「版本对比」选择旧版与新版后开始处理待办。
      </p>
    </section>

    <section class="metric-grid">
      <StatCard label="待处理" :value="stats.OPEN" tone="danger" hint="只统计所审新版版本" />
      <StatCard label="已确认风险" :value="stats.CONFIRMED" tone="warning" />
      <StatCard label="已忽略" :value="stats.IGNORED" />
      <StatCard label="已解决" :value="stats.RESOLVED" tone="success" />
    </section>

    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" size="small">
        <el-radio-button value="ALL">全部 {{ noteStore.scopedRows.length }}</el-radio-button>
        <el-radio-button
          v-for="option in ReviewStatusOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }} {{ stats[option.value] }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <EmptyState
      v-if="items.length === 0"
      title="当前状态下没有待办"
      :description="statusFilter === 'OPEN'
        ? '在版本对比页展开差异条款并填写审阅意见，或先执行对比生成差异。'
        : '切换其他状态查看历史处理记录。'"
      icon="✅"
    />

    <section v-for="note in items" :key="note.id" class="panel note-card">
      <header class="note-card-head">
        <StatusBadge :value="note.status" :reopened="note.reopen_count > 0" />
        <el-tag
          v-if="diffOf(note)"
          size="small"
          effect="plain"
          :type="diffOf(note)?.diff_type === 'MODIFIED' ? 'warning' : 'info'"
        >
          {{ DiffTypeText[diffOf(note)!.diff_type] }}
        </el-tag>
        <el-tag v-if="note.tag" size="small">{{ ReviewTagText[note.tag] }}</el-tag>
        <RiskTag v-if="riskOf(note)" :level="riskOf(note)!" size="small" />
        <strong v-if="diffOf(note)">
          条款 {{ diffOf(note)?.new_section_no || diffOf(note)?.old_section_no }}
          {{ diffOf(note)?.new_heading || diffOf(note)?.old_heading }}
        </strong>
        <div style="flex:1" />
        <span class="text-muted">{{ note.reviewer }} · {{ formatDate(note.updated_at) }}</span>
      </header>

      <el-alert
        v-if="note.reopen_count > 0 && note.status === 'OPEN'"
        class="reopen-alert"
        type="error"
        :closable="false"
        show-icon
        :title="`该条款所审新版内容已变化，原「已解决」结论第 ${note.reopen_count} 次自动回到待处理；历史处理记录仍完整留档`"
      />

      <p class="note-text">{{ note.comment || "（无文字说明）" }}</p>

      <el-button
        v-if="diffOf(note)"
        size="small"
        text
        @click="expandedId = expandedId === note.id ? null : note.id"
      >
        {{ expandedId === note.id ? "收起两版段落" : "查看两版对应段落" }}
      </el-button>
      <DiffViewer
        v-if="expandedId === note.id && diffOf(note)"
        :old-no="diffOf(note)?.old_section_no"
        :new-no="diffOf(note)?.new_section_no"
        :old-heading="diffOf(note)?.old_heading"
        :new-heading="diffOf(note)?.new_heading"
        :old-text="diffOf(note)?.old_content ?? ''"
        :new-text="diffOf(note)?.new_content ?? ''"
        :diff-type="diffOf(note)?.diff_type"
      />

      <div v-if="note.history.length > 0" class="history">
        <div class="history-title">处理记录（{{ note.history.length }}）</div>
        <el-timeline>
          <el-timeline-item
            v-for="(entry, index) in note.history"
            :key="index"
            :timestamp="formatDate(entry.at)"
            size="large"
          >
            <div class="history-entry">
              <StatusBadge
                :value="entry.to_status"
                :reopened="entry.action.includes('回到待处理')"
              />
              <span class="history-action">{{ entry.action }}</span>
            </div>
            <p v-if="entry.comment" class="history-comment">{{ entry.comment }}</p>
            <small class="text-muted">
              {{ entry.reviewer }}<template v-if="entry.tag"> · {{ ReviewTagText[entry.tag] }}</template>
            </small>
          </el-timeline-item>
        </el-timeline>
      </div>

      <footer class="note-actions">
        <el-button
          v-for="option in ReviewStatusOptions"
          :key="option.value"
          size="small"
          :type="option.value === 'RESOLVED' ? 'success' : option.value === 'CONFIRMED' ? 'warning' : 'default'"
          :disabled="note.status === option.value"
          @click="changeStatus(note, option.value)"
        >
          {{ option.label }}
        </el-button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.note-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.note-text {
  margin: 0;
  white-space: pre-wrap;
}
.reopen-alert {
  margin: 0;
}
.history {
  border-top: 1px dashed var(--color-border);
  padding-top: 8px;
}
.history-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}
.history-entry {
  display: flex;
  gap: 8px;
  align-items: center;
}
.history-action {
  font-size: 13px;
  font-weight: 600;
}
.history-comment {
  margin: 4px 0;
  font-size: 13px;
  white-space: pre-wrap;
}
.note-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
}
</style>
