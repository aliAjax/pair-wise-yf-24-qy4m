<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import DiffViewer from "../components/common/DiffViewer.vue";
import EmptyState from "../components/common/EmptyState.vue";
import RiskTag from "../components/common/RiskTag.vue";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import { DiffType } from "../constants/DiffType";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { formatDiffType } from "../utils/formatters";

const navigate = inject<(route: string) => void>("navigate", () => {});

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

/** 记住上次选择的对比组合，刷新后自动恢复 */
const pair = useLocalStorageState<{ oldId: number | null; newId: number | null }>(STORAGE_KEYS.comparePair, { oldId: null, newId: null });

const documents = computed(() => [...documentStore.rows].sort((a, b) => a.id - b.id));
const activeType = ref<string>("ALL");
const selectedId = ref<number | null>(null);

const filteredRows = computed(() =>
  activeType.value === "ALL" ? diffStore.pairRows : diffStore.pairRows.filter((row) => row.diff_type === activeType.value)
);
const selected = computed(() => diffStore.pairRows.find((row) => row.id === selectedId.value) ?? null);
const selectedRisk = computed(() => {
  const section = sectionStore.rows.find((row) => row.id === selected.value?.new_section_id);
  return section?.risk_level ?? null;
});
const todoCount = computed(() => noteStore.todoCount(diffStore.pairRows));

const ensureDefaultPair = () => {
  if (pair.value.oldId && pair.value.newId) return;
  const docs = documents.value;
  if (docs.length >= 2) {
    pair.value = { oldId: docs[docs.length - 2].id, newId: docs[docs.length - 1].id };
  }
};

const run = async () => {
  if (pair.value.oldId === null || pair.value.newId === null) return;
  const ok = await diffStore.runComparison(pair.value.oldId, pair.value.newId);
  if (ok) selectedId.value = diffStore.pairRows[0]?.id ?? null;
};

onMounted(async () => {
  ensureDefaultPair();
  if (pair.value.oldId !== null && pair.value.newId !== null) {
    const exists = diffStore.rows.some(
      (row) => row.old_document_id === pair.value.oldId && row.new_document_id === pair.value.newId
    );
    if (!exists) await run();
    else {
      diffStore.pair = { oldId: pair.value.oldId, newId: pair.value.newId };
      selectedId.value = diffStore.pairRows[0]?.id ?? null;
    }
  }
});

watch(documents, ensureDefaultPair);
</script>

<template>
  <section class="stack">
    <div class="panel">
      <h2>选择对比版本</h2>
      <div class="compare-bar">
        <label>
          旧版
          <select v-model.number="pair.oldId">
            <option :value="null" disabled>选择旧版文档</option>
            <option v-for="document in documents" :key="document.id" :value="document.id">
              {{ document.title }} · {{ document.version_label }}
            </option>
          </select>
        </label>
        <span class="arrow">→</span>
        <label>
          新版
          <select v-model.number="pair.newId">
            <option :value="null" disabled>选择新版文档</option>
            <option v-for="document in documents" :key="document.id" :value="document.id">
              {{ document.title }} · {{ document.version_label }}
            </option>
          </select>
        </label>
        <button class="btn btn-primary" :disabled="diffStore.loading" @click="run">
          {{ diffStore.loading ? "对比中…" : "开始对比" }}
        </button>
      </div>
      <p v-if="diffStore.error" class="error-text">{{ diffStore.error }}</p>
    </div>

    <template v-if="diffStore.pairRows.length">
      <div class="metrics five">
        <StatCard v-for="type in DiffType" :key="type" :label="formatDiffType(type)" :value="diffStore.typeCounts[type] ?? 0" />
      </div>

      <div class="panel">
        <div class="filter-bar">
          <button class="chip clickable" :class="{ on: activeType === 'ALL' }" @click="activeType = 'ALL'">
            全部 {{ diffStore.pairRows.length }}
          </button>
          <button
            v-for="type in DiffType"
            :key="type"
            class="chip clickable"
            :class="{ on: activeType === type }"
            @click="activeType = type"
          >
            {{ formatDiffType(type) }} {{ diffStore.typeCounts[type] ?? 0 }}
          </button>
          <span class="spacer" />
          <span class="todo-hint">待处理 {{ todoCount }} 项</span>
        </div>

        <EmptyState v-if="!filteredRows.length" text="该类型下没有差异记录" />
        <article
          v-for="row in filteredRows"
          :key="row.id"
          class="diff-row"
          :class="{ active: selectedId === row.id }"
          @click="selectedId = row.id"
        >
          <span class="badge">{{ formatDiffType(row.diff_type) }}</span>
          <span class="diff-summary">{{ row.summary }}</span>
          <StatusBadge :value="noteStore.effectiveStatus(row)" />
        </article>
      </div>

      <div v-if="selected" class="panel">
        <div class="detail-head">
          <h2>对应段落</h2>
          <div class="actions">
            <RiskTag v-if="selectedRisk" :level="selectedRisk" />
            <button class="btn" @click="navigate('/risks')">去标注风险</button>
            <button class="btn" @click="navigate('/review')">去处理</button>
          </div>
        </div>
        <DiffViewer :diff="selected" />
      </div>
    </template>
    <EmptyState v-else text="选择两个版本后点击「开始对比」" />
  </section>
</template>
