<script setup lang="ts">
import { computed, ref } from "vue";
import EmptyState from "../components/common/EmptyState.vue";
import ReviewChecklist, { type ReviewActionPayload } from "../components/common/ReviewChecklist.vue";
import StatCard from "../components/common/StatCard.vue";
import { ReviewStatus } from "../constants/ReviewStatus";
import { createReviewNoteForm } from "../constructors/ReviewNoteConstructor";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import type { ReviewItem } from "../types/ReviewItem";
import { formatDate, formatDiffType, formatStatus, nowIso } from "../utils/formatters";
import { logAction } from "../utils/logger";

const documentStore = usePolicyDocumentStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

const filterStatus = ref("ALL");

/** 待办口径：未变更条款无需处理 */
const actionable = computed(() => diffStore.pairRows.filter((row) => row.diff_type !== "UNCHANGED"));

const items = computed<ReviewItem[]>(() =>
  actionable.value.map((diff) => ({
    diff,
    status: noteStore.effectiveStatus(diff),
    notes: noteStore.notesForDiff(diff.id)
  }))
);

const filteredItems = computed(() =>
  filterStatus.value === "ALL" ? items.value : items.value.filter((item) => item.status === filterStatus.value)
);

const statusCounts = computed(() => {
  const counts: Record<string, number> = Object.fromEntries(ReviewStatus.map((status) => [status, 0]));
  for (const item of items.value) counts[item.status] = (counts[item.status] ?? 0) + 1;
  return counts;
});

const onAction = async (payload: ReviewActionPayload) => {
  const diff = diffStore.pairRows.find((row) => row.id === payload.diffId);
  if (!diff) return;
  const form = { ...createReviewNoteForm(payload.diffId), tag: payload.tag, comment: payload.comment, reviewer: payload.reviewer, status: payload.status };
  await noteStore.addNote(form, diff);
};

const pairLabel = () => {
  const oldDoc = diffStore.pair.oldId === null ? null : documentStore.byId(diffStore.pair.oldId);
  const newDoc = diffStore.pair.newId === null ? null : documentStore.byId(diffStore.pair.newId);
  return { oldDoc, newDoc };
};

const exportMarkdown = () => {
  const { oldDoc, newDoc } = pairLabel();
  const lines: string[] = [
    "# 隐私政策对比审阅摘要",
    "",
    `- 旧版：${oldDoc ? `${oldDoc.title} ${oldDoc.version_label}` : "-"}`,
    `- 新版：${newDoc ? `${newDoc.title} ${newDoc.version_label}` : "-"}`,
    `- 生成时间：${formatDate(nowIso())}`,
    "",
    "## 统计",
    ...ReviewStatus.map((status) => `- ${formatStatus(status)}：${statusCounts.value[status] ?? 0}`),
    "",
    "## 明细"
  ];
  for (const item of items.value) {
    lines.push("", `### [${formatDiffType(item.diff.diff_type)}] ${item.diff.summary}`);
    lines.push(`- 状态：${formatStatus(item.status)}`);
    if (item.notes.length) {
      lines.push("- 处理记录：");
      for (const note of item.notes) {
        const stale = note.content_hash !== item.diff.new_hash ? "（历史留档）" : "";
        lines.push(`  - ${formatDate(note.created_at)} ${note.reviewer || "未署名"}【${formatStatus(note.status)}】${note.tag ? ` #${note.tag}` : ""}：${note.comment}${stale}`);
      }
    } else {
      lines.push("- 处理记录：无");
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "privacy-review-summary.md";
  anchor.click();
  URL.revokeObjectURL(url);
  logAction("ReviewNote", "export", { count: items.value.length });
};
</script>

<template>
  <section class="stack">
    <template v-if="diffStore.pairRows.length">
      <div class="metrics four">
        <StatCard v-for="status in ReviewStatus" :key="status" :label="formatStatus(status)" :value="statusCounts[status] ?? 0" />
      </div>

      <div class="panel">
        <div class="filter-bar">
          <button class="chip clickable" :class="{ on: filterStatus === 'ALL' }" @click="filterStatus = 'ALL'">
            全部 {{ items.length }}
          </button>
          <button
            v-for="status in ReviewStatus"
            :key="status"
            class="chip clickable"
            :class="{ on: filterStatus === status }"
            @click="filterStatus = status"
          >
            {{ formatStatus(status) }} {{ statusCounts[status] ?? 0 }}
          </button>
          <span class="spacer" />
          <button class="btn" @click="exportMarkdown">导出 Markdown 摘要</button>
        </div>
        <p v-if="noteStore.error" class="error-text">{{ noteStore.error }}</p>
        <EmptyState v-if="!filteredItems.length" text="该状态下没有待办事项" />
        <ReviewChecklist v-else :items="filteredItems" @action="onAction" />
      </div>
    </template>
    <EmptyState v-else text="请先在「版本对比」页运行对比，再回到审阅清单" />
  </section>
</template>
