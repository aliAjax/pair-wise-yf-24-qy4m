<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import EmptyState from "../components/common/EmptyState.vue";
import RiskTag from "../components/common/RiskTag.vue";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import { SECTION_CATEGORIES } from "../constants/clauseCategories";
import { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import { createReviewNoteForm } from "../constructors/ReviewNoteConstructor";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import type { PolicySection } from "../types/PolicySection";
import { formatDate, formatRisk } from "../utils/formatters";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

const selectedDocId = ref<number | null>(null);
const filterCategory = ref("ALL");
const filterRisk = ref("ALL");

const documents = computed(() => [...documentStore.rows].sort((a, b) => a.id - b.id));
const sections = computed(() => (selectedDocId.value === null ? [] : sectionStore.byDocument(selectedDocId.value)));

const filteredSections = computed(() =>
  sections.value.filter(
    (section) =>
      (filterCategory.value === "ALL" || section.category === filterCategory.value) &&
      (filterRisk.value === "ALL" || section.risk_level === filterRisk.value)
  )
);

const riskCounts = computed(() => {
  const counts: Record<string, number> = Object.fromEntries(PrivacyRiskLevel.map((level) => [level, 0]));
  for (const section of sections.value) counts[section.risk_level] = (counts[section.risk_level] ?? 0) + 1;
  return counts;
});

/** 当前对比组中该条款对应的差异记录（处理记录挂在差异上） */
const diffFor = (section: PolicySection) => diffStore.pairRows.find((row) => row.new_section_id === section.id) ?? null;

const noteDrafts = reactive<Record<number, ReturnType<typeof createReviewNoteForm>>>({});
const draftFor = (diffId: number) => {
  if (!noteDrafts[diffId]) noteDrafts[diffId] = createReviewNoteForm(diffId);
  return noteDrafts[diffId];
};

const setRisk = async (section: PolicySection, level: string) => {
  await sectionStore.setRiskLevel(section.id, level as PolicySection["risk_level"]);
};

const addNote = async (section: PolicySection) => {
  const diff = diffFor(section);
  if (!diff) return;
  const form = draftFor(diff.id);
  const created = await noteStore.addNote({ ...form }, diff);
  if (created) Object.assign(form, createReviewNoteForm(diff.id));
};

watch(
  documents,
  () => {
    if (selectedDocId.value !== null && documents.value.some((doc) => doc.id === selectedDocId.value)) return;
    selectedDocId.value = diffStore.pair.newId ?? documents.value[documents.value.length - 1]?.id ?? null;
  },
  { immediate: true }
);
</script>

<template>
  <section class="stack">
    <div class="panel">
      <div class="detail-head">
        <h2>风险标注</h2>
        <label class="inline-field">
          标注对象
          <select v-model.number="selectedDocId">
            <option v-for="document in documents" :key="document.id" :value="document.id">
              {{ document.title }} · {{ document.version_label }}
            </option>
          </select>
        </label>
      </div>
      <div class="metrics four">
        <StatCard v-for="level in PrivacyRiskLevel" :key="level" :label="`风险·${formatRisk(level)}`" :value="riskCounts[level] ?? 0" />
      </div>
      <div class="filter-bar">
        <select v-model="filterCategory">
          <option value="ALL">全部类目</option>
          <option v-for="category in SECTION_CATEGORIES" :key="category" :value="category">{{ category }}</option>
        </select>
        <select v-model="filterRisk">
          <option value="ALL">全部等级</option>
          <option v-for="level in PrivacyRiskLevel" :key="level" :value="level">{{ formatRisk(level) }}</option>
        </select>
      </div>
      <p v-if="sectionStore.error" class="error-text">{{ sectionStore.error }}</p>
      <p v-if="noteStore.error" class="error-text">{{ noteStore.error }}</p>
    </div>

    <EmptyState v-if="!filteredSections.length" text="没有符合条件的条款" />

    <article v-for="section in filteredSections" :key="section.id" class="panel risk-item">
      <header class="review-head">
        <strong>第{{ section.section_no }}条 {{ section.heading }}</strong>
        <span class="chip">{{ section.category }}</span>
        <RiskTag :level="section.risk_level" />
        <span class="spacer" />
        <label class="inline-field">
          风险等级
          <select :value="section.risk_level" @change="setRisk(section, ($event.target as HTMLSelectElement).value)">
            <option v-for="level in PrivacyRiskLevel" :key="level" :value="level">{{ formatRisk(level) }}</option>
          </select>
        </label>
      </header>
      <pre class="section-content">{{ section.content }}</pre>

      <template v-if="diffFor(section)">
        <ul v-if="noteStore.notesForDiff(diffFor(section)!.id).length" class="note-history">
          <li
            v-for="note in noteStore.notesForDiff(diffFor(section)!.id)"
            :key="note.id"
            :class="{ archived: noteStore.isArchived(note, diffFor(section)!) }"
          >
            <StatusBadge :value="note.status" />
            <span v-if="note.tag" class="chip">{{ note.tag }}</span>
            <span class="note-comment">{{ note.comment }}</span>
            <span class="note-meta">{{ note.reviewer || "未署名" }} · {{ formatDate(note.created_at) }}</span>
            <span v-if="noteStore.isArchived(note, diffFor(section)!)" class="badge badge-stale">历史留档</span>
          </li>
        </ul>
        <div class="review-form">
          <input v-model="draftFor(diffFor(section)!.id).tag" type="text" placeholder="标签，如：需法务复核" />
          <input v-model="draftFor(diffFor(section)!.id).reviewer" type="text" placeholder="处理人" />
          <input v-model="draftFor(diffFor(section)!.id).comment" type="text" placeholder="处理说明（必填）" class="grow" />
          <button class="btn btn-primary" @click="addNote(section)">留下处理记录</button>
        </div>
      </template>
      <p v-else class="hint">该条款不在当前对比组中，请先在「版本对比」页运行包含本文档的对比，再留下处理记录。</p>
    </article>
  </section>
</template>
