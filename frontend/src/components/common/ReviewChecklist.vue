<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import type { DiffResult } from "../../types/DiffResult";
import { useReviewNoteStore } from "../../stores/ReviewNoteStore";
import { ReviewStatusText, ReviewStatusOptions } from "../../constants/ReviewStatus";
import type { ReviewStatus } from "../../constants/ReviewStatus";
import { ReviewTagOptions, ReviewTagText } from "../../constants/ReviewTag";
import type { ReviewTag } from "../../constants/ReviewTag";
import { formatDate } from "../../utils/formatters";
import StatusBadge from "./StatusBadge.vue";
import EmptyState from "./EmptyState.vue";

const props = defineProps<{ diff: DiffResult }>();

const noteStore = useReviewNoteStore();
const { rows } = storeToRefs(noteStore);

const notes = computed(() =>
  rows.value
    .filter((note) => note.diff_result_id === props.diff.id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
);
const active = computed(() => notes.value[0] ?? null);

const comment = ref("");
const reviewer = ref("");
const tag = ref<ReviewTag | "">("");
const saving = ref(false);

async function submitNote(status: ReviewStatus = "CONFIRMED"): Promise<void> {
  if (!comment.value.trim() && !tag.value) return;
  saving.value = true;
  if (!active.value) {
    await noteStore.add(props.diff, {
      tag: tag.value,
      comment: comment.value,
      reviewer: reviewer.value
    });
  }
  const target = noteStore.rows.find((row) => row.diff_result_id === props.diff.id);
  if (target) {
    await noteStore.changeStatus(target, status, props.diff, {
      tag: tag.value,
      comment: comment.value,
      reviewer: reviewer.value
    });
  }
  comment.value = "";
  tag.value = "";
  saving.value = false;
}

async function quickStatus(status: ReviewStatus): Promise<void> {
  if (!active.value) {
    await noteStore.add(props.diff, {
      tag: tag.value || "NEED_LEGAL",
      comment: comment.value || ReviewStatusText[status],
      reviewer: reviewer.value
    });
  }
  const target = noteStore.rows.find((row) => row.diff_result_id === props.diff.id);
  if (target) {
    await noteStore.changeStatus(target, status, props.diff, {
      comment: comment.value || target.comment,
      reviewer: reviewer.value
    });
  }
  comment.value = "";
}
</script>

<template>
  <div class="review-checklist">
    <template v-if="notes.length === 0">
      <EmptyState
        title="该条款还没有处理记录"
        description="填写审阅意见并选择状态，已解决结论会按所审新版版本记录指纹，新版变化后自动回到待处理。"
        icon="📝"
      />
    </template>

    <el-timeline v-else class="note-timeline">
      <el-timeline-item
        v-for="note in notes"
        :key="note.id"
        :timestamp="formatDate(note.updated_at)"
        placement="top"
      >
        <div class="note-item">
          <div class="note-head">
            <StatusBadge :value="note.status" :reopened="note.reopen_count > 0" />
            <el-tag v-if="note.tag" size="small" type="info" effect="plain">
              {{ ReviewTagText[note.tag] }}
            </el-tag>
            <span class="note-reviewer">{{ note.reviewer }}</span>
            <el-tooltip v-if="note.reopen_count > 0" content="内容变化导致已解决结论失效，历史记录已留档">
              <el-tag size="small" type="danger" effect="dark">重开 {{ note.reopen_count }} 次</el-tag>
            </el-tooltip>
          </div>
          <p class="note-comment">{{ note.comment || "（无文字说明）" }}</p>
        </div>
      </el-timeline-item>
    </el-timeline>

    <div class="note-form">
      <el-input
        v-model="comment"
        type="textarea"
        :rows="2"
        placeholder="留下处理意见：风险是否接受、需要法务复核或补充披露……"
      />
      <div class="note-form-row">
        <el-select v-model="tag" placeholder="快捷标签" clearable style="width: 150px">
          <el-option
            v-for="option in ReviewTagOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-input v-model="reviewer" placeholder="处理人" style="width: 130px" maxlength="20" />
        <div class="note-spacer" />
        <el-button-group>
          <el-button
            v-for="option in ReviewStatusOptions.filter((o) => o.value !== 'RESOLVED')"
            :key="option.value"
            size="small"
            :loading="saving"
            @click="quickStatus(option.value)"
          >
            {{ option.label }}
          </el-button>
          <el-button size="small" type="success" :loading="saving" @click="quickStatus('RESOLVED')">
            标记已解决
          </el-button>
        </el-button-group>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.note-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.note-reviewer {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.note-comment {
  margin: 6px 0 0;
  font-size: 13px;
  white-space: pre-wrap;
}
.note-form {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.note-form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.note-spacer {
  flex: 1;
}
</style>
