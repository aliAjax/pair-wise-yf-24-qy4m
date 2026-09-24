<script setup lang="ts">
import { reactive } from "vue";
import type { ReviewNote } from "../../types/ReviewNote";
import type { ReviewStatus } from "../../types/ReviewStatus";
import type { ReviewItem } from "../../types/ReviewItem";
import { formatDate, formatDiffType, formatStatus } from "../../utils/formatters";
import StatusBadge from "./StatusBadge.vue";

export interface ReviewActionPayload {
  diffId: number;
  status: ReviewStatus;
  tag: string;
  comment: string;
  reviewer: string;
}

defineProps<{ items: ReviewItem[] }>();
const emit = defineEmits<{ (event: "action", payload: ReviewActionPayload): void }>();

interface DraftForm {
  tag: string;
  comment: string;
  reviewer: string;
}

const drafts = reactive<Record<number, DraftForm>>({});
const draftFor = (diffId: number): DraftForm => {
  if (!drafts[diffId]) drafts[diffId] = { tag: "", comment: "", reviewer: "" };
  return drafts[diffId];
};

/** 记录所审内容指纹与当前新版指纹不一致 → 历史留档 */
const isArchived = (item: ReviewItem, note: ReviewNote) => note.content_hash !== item.diff.new_hash;

const submit = (diffId: number, status: ReviewStatus) => {
  const draft = draftFor(diffId);
  emit("action", { diffId, status, tag: draft.tag, comment: draft.comment, reviewer: draft.reviewer });
  draft.comment = "";
};
</script>

<template>
  <div class="review-list">
    <article v-for="item in items" :key="item.diff.id" class="review-item">
      <header class="review-head">
        <span class="badge">{{ formatDiffType(item.diff.diff_type) }}</span>
        <strong>{{ item.diff.summary }}</strong>
        <StatusBadge :value="item.status" />
      </header>

      <ul v-if="item.notes.length" class="note-history">
        <li v-for="note in item.notes" :key="note.id" :class="{ archived: isArchived(item, note) }">
          <StatusBadge :value="note.status" />
          <span v-if="note.tag" class="chip">{{ note.tag }}</span>
          <span class="note-comment">{{ note.comment }}</span>
          <span class="note-meta">{{ note.reviewer || "未署名" }} · {{ formatDate(note.created_at) }}</span>
          <span v-if="isArchived(item, note)" class="badge badge-stale">历史留档</span>
        </li>
      </ul>
      <p v-else class="note-empty">暂无处理记录</p>

      <div class="review-form">
        <input v-model="draftFor(item.diff.id).tag" type="text" placeholder="标签，如：需法务复核" />
        <input v-model="draftFor(item.diff.id).reviewer" type="text" placeholder="处理人" />
        <input v-model="draftFor(item.diff.id).comment" type="text" placeholder="处理说明（必填）" class="grow" />
        <button class="btn" @click="submit(item.diff.id, 'CONFIRMED')">{{ formatStatus("CONFIRMED") }}</button>
        <button class="btn" @click="submit(item.diff.id, 'IGNORED')">{{ formatStatus("IGNORED") }}</button>
        <button class="btn btn-primary" @click="submit(item.diff.id, 'RESOLVED')">{{ formatStatus("RESOLVED") }}</button>
      </div>
    </article>
  </div>
</template>
