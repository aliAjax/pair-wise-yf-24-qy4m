<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useReviewSessionStore } from "../stores/ReviewSessionStore";
import { useAuditLogStore } from "../stores/AuditLogStore";
import type { DiffResult } from "../types/DiffResult";
import type { DiffType } from "../constants/DiffType";
import { DiffTypeOptions } from "../constants/DiffType";
import { HighRiskLevels } from "../constants/PrivacyRiskLevel";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import DiffViewer from "../components/common/DiffViewer.vue";
import ReviewChecklist from "../components/common/ReviewChecklist.vue";
import EmptyState from "../components/common/EmptyState.vue";
import RiskTag from "../components/common/RiskTag.vue";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();
const sessionStore = useReviewSessionStore();
const auditStore = useAuditLogStore();
const { rows: diffs, computing, lastReopenedIds } = storeToRefs(diffStore);

const oldId = ref<number | null>(sessionStore.old_document_id);
const newId = ref<number | null>(sessionStore.new_document_id);
const activeFilter = ref<DiffType | "ALL">("ALL");
const highRiskOnly = ref(false);
const hideUnchanged = ref(true);
const activeDiffId = ref<number | null>(null);

const oldDocument = computed(() => documentStore.byId(oldId.value));
const newDocument = computed(() => documentStore.byId(newId.value));

const newSections = computed(() =>
  newDocument.value ? sectionStore.byDocument(newDocument.value.id) : []
);
const oldSections = computed(() =>
  oldDocument.value ? sectionStore.byDocument(oldDocument.value.id) : []
);
const sectionById = computed(() => {
  const map = new Map<number, (typeof newSections.value)[number]>();
  newSections.value.forEach((section) => map.set(section.id, section));
  return map;
});
const oldSectionById = computed(() => {
  const map = new Map<number, (typeof oldSections.value)[number]>();
  oldSections.value.forEach((section) => map.set(section.id, section));
  return map;
});

function riskOfDiff(diff: DiffResult) {
  if (diff.section_id && sectionById.value.has(diff.section_id)) {
    return sectionById.value.get(diff.section_id)!.risk_level;
  }
  if (diff.old_section_id && oldSectionById.value.has(diff.old_section_id)) {
    return oldSectionById.value.get(diff.old_section_id)!.risk_level;
  }
  return null;
}

const stats = computed(() => ({ ...diffStore.diffStats }));
const visibleDiffs = computed(() =>
  diffs.value.filter((diff) => {
    if (hideUnchanged.value && diff.diff_type === "UNCHANGED") return false;
    if (activeFilter.value !== "ALL" && diff.diff_type !== activeFilter.value) return false;
    if (highRiskOnly.value) {
      const risk = riskOfDiff(diff);
      if (!risk || !HighRiskLevels.includes(risk)) return false;
    }
    return true;
  })
);

const activeDiff = computed(
  () => visibleDiffs.value.find((diff) => diff.id === activeDiffId.value) ?? null
);

const reopenedSet = computed(() => new Set(lastReopenedIds.value));

/** 该差异下是否存在“因内容变化刚回退到待处理”的备注 */
function hasReopenedNote(diff: DiffResult): boolean {
  return noteStore.rows.some(
    (note) => note.diff_result_id === diff.id && reopenedSet.value.has(note.id)
  );
}

function openCountOfDiff(diff: DiffResult): number {
  return noteStore.byDiffId(diff.id).filter((note) => note.status === "OPEN").length;
}

const pairReady = computed(() => oldId.value !== null && newId.value !== null && oldId.value !== newId.value);

watch([oldId, newId], async ([oldVal, newVal]) => {
  if (oldVal === newVal && oldVal !== null) {
    ElMessage.warning("旧版与新版不能选择同一份政策文档");
    return;
  }
  const oldDoc = documentStore.byId(oldVal) ?? null;
  const newDoc = documentStore.byId(newVal) ?? null;
  sessionStore.select(oldDoc, newDoc);
  noteStore.setScope(newDoc?.id ?? null);
  await noteStore.load(newDoc?.id ?? null);
  await diffStore.loadPair(oldVal, newVal);
});

async function runCompare(): Promise<void> {
  if (!pairReady.value || !oldDocument.value || !newDocument.value) {
    ElMessage.error(oldId.value === newId.value ? "旧版与新版不能选择同一份政策文档" : "请先选择旧版与新版政策");
    return;
  }
  const ok = await diffStore.recompute(oldDocument.value, newDocument.value);
  await noteStore.load(newId.value);
  auditStore.refresh();
  if (!ok) {
    ElMessage.error(diffStore.error);
    return;
  }
  const reopened = lastReopenedIds.value.length;
  ElMessage.success(
    reopened > 0
      ? `对比完成：${reopened} 条已解决结论因新版内容变化回到待处理`
      : "对比完成：已按条款编号生成差异清单"
  );
}

function scrollToDiff(diff: DiffResult): void {
  activeDiffId.value = diff.id;
}

const openCountForPair = computed(() => {
  if (newId.value === null) return 0;
  return noteStore.scopedRows.filter(
    (note) =>
      note.status === "OPEN" &&
      note.old_document_id === oldId.value
  ).length;
});

onMounted(async () => {
  await documentStore.load();
  await sectionStore.load();
  sessionStore.load();
  oldId.value = sessionStore.old_document_id;
  newId.value = sessionStore.new_document_id;
  await noteStore.load(sessionStore.new_document_id);
  if (pairReady.value) {
    await diffStore.loadPair(oldId.value, newId.value);
    // 首次打开还没计算过则自动计算一次
    if (diffStore.rows.length === 0) {
      await runCompare();
    }
  }
});
</script>

<template>
  <div class="stack">
    <section class="panel">
      <div class="panel-title">
        选择对比版本
        <span class="sub">待处理状态认准右侧选定的“所审新版版本”</span>
      </div>
      <div class="version-picker">
        <el-select v-model="oldId" placeholder="旧版政策" style="flex:1">
          <el-option
            v-for="option in documentStore.versionOptions"
            :key="`old-${option.value}`"
            :label="option.label"
            :value="option.value"
            :disabled="option.value === newId"
          />
        </el-select>
        <el-icon class="arrow-icon"><Right /></el-icon>
        <el-select v-model="newId" placeholder="所审新版版本" style="flex:1">
          <el-option
            v-for="option in documentStore.versionOptions"
            :key="`new-${option.value}`"
            :label="option.label"
            :value="option.value"
            :disabled="option.value === oldId"
          />
        </el-select>
        <el-button type="primary" :loading="computing" @click="runCompare">
          {{ diffs.length ? "重新计算差异" : "开始对比" }}
        </el-button>
      </div>
    </section>

    <section class="metric-grid">
      <StatCard label="新增条款" :value="stats.ADDED" tone="success" />
      <StatCard label="移除条款" :value="stats.REMOVED" tone="danger" />
      <StatCard label="改写条款" :value="stats.MODIFIED" tone="warning" />
      <StatCard label="换序条款" :value="stats.MOVED" />
      <StatCard label="未变条款" :value="stats.UNCHANGED" />
      <StatCard label="当前版本待办" :value="openCountForPair" tone="danger" hint="只统计所审新版版本" />
    </section>

    <template v-if="pairReady">
      <div class="filter-bar">
        <el-radio-group v-model="activeFilter" size="small">
          <el-radio-button value="ALL">全部</el-radio-button>
          <el-radio-button
            v-for="option in DiffTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }} {{ stats[option.value] }}
          </el-radio-button>
        </el-radio-group>
        <div style="flex:1" />
        <el-checkbox v-model="highRiskOnly">仅看高/严重风险条款</el-checkbox>
        <el-checkbox v-model="hideUnchanged">隐藏未变条款</el-checkbox>
      </div>

      <div v-if="visibleDiffs.length === 0 && !computing" class="panel">
        <EmptyState
          title="没有符合筛选条件的差异"
          :description="diffs.length === 0 ? '点击「开始对比」按条款编号生成差异。' : '试着调整差异类型或风险筛选。'"
          icon="🔍"
        />
      </div>

      <section
        v-for="diff in visibleDiffs"
        :id="`diff-${diff.id}`"
        :key="diff.id"
        class="panel diff-block"
        :class="{ active: activeDiffId === diff.id }"
      >
        <header class="diff-block-head">
          <StatusBadge kind="diff" :value="diff.diff_type" />
          <span class="diff-no">
            旧 {{ diff.old_section_no || "—" }} → 新 {{ diff.new_section_no || "—" }}
          </span>
          <strong class="diff-heading">
            {{ diff.new_heading || diff.old_heading }}
          </strong>
          <RiskTag v-if="riskOfDiff(diff)" :level="riskOfDiff(diff)!" />
          <el-tag v-if="hasReopenedNote(diff)" size="small" type="danger" effect="plain">
            结论已回退待处理
          </el-tag>
          <div style="flex:1" />
          <el-button size="small" text @click="scrollToDiff(diff)">跳转段落</el-button>
        </header>
        <p class="diff-summary">{{ diff.summary }}</p>
        <DiffViewer
          :old-no="diff.old_section_no"
          :new-no="diff.new_section_no"
          :old-heading="diff.old_heading"
          :new-heading="diff.new_heading"
          :old-text="diff.old_content"
          :new-text="diff.new_content"
          :diff-type="diff.diff_type"
          :show-header="false"
        />
        <el-collapse class="review-collapse">
          <el-collapse-item :name="diff.id">
            <template #title>
              <span class="review-toggle">
                审阅处理
                <el-badge
                  v-if="openCountOfDiff(diff)"
                  :value="openCountOfDiff(diff)"
                  type="danger"
                  class="review-badge"
                />
              </span>
            </template>
            <ReviewChecklist :diff="diff" />
          </el-collapse-item>
        </el-collapse>
      </section>
    </template>

    <section v-else class="panel">
      <EmptyState
        title="请先选择两版政策"
        description="在上方分别选择旧版与新版（或到「文档导入」粘贴新版本），然后点击开始对比。"
        icon="🆚"
      />
    </section>
  </div>
</template>

<style scoped>
.version-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}
.arrow-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}
.diff-block {
  scroll-margin-top: 12px;
}
.diff-block.active {
  outline: 2px solid var(--el-color-primary-light-5);
}
.diff-block-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.diff-no {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}
.diff-heading {
  font-size: 15px;
}
.diff-summary {
  margin: 0 0 10px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.review-collapse {
  margin-top: 10px;
  border-top: 1px solid var(--color-border);
}
.review-toggle {
  font-weight: 600;
  color: var(--el-color-primary);
}
.review-badge {
  margin-left: 8px;
}
</style>
