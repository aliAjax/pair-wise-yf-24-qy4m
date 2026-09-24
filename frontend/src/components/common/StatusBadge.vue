<script setup lang="ts">
import { computed } from "vue";
import { ReviewStatusText } from "../../constants/ReviewStatus";
import type { ReviewStatus } from "../../constants/ReviewStatus";
import { DiffTypeText } from "../../constants/DiffType";
import type { DiffType } from "../../constants/DiffType";
import { statusTagType, diffTagType } from "../../utils/formatters";

const props = defineProps<{
  kind?: "status" | "diff";
  value: ReviewStatus | DiffType;
  reopened?: boolean;
}>();

const text = computed(() =>
  props.kind === "diff"
    ? DiffTypeText[props.value as DiffType]
    : ReviewStatusText[props.value as ReviewStatus]
);

const type = computed(() =>
  props.kind === "diff"
    ? diffTagType(props.value as DiffType)
    : statusTagType(props.value as ReviewStatus)
);
</script>

<template>
  <el-tag :type="type" size="small" class="status-badge">
    {{ text }}
    <span v-if="reopened" class="reopen-dot" title="内容变化后自动回到待处理">↺</span>
  </el-tag>
</template>

<style scoped>
.status-badge {
  font-weight: 600;
}
.reopen-dot {
  margin-left: 3px;
  color: var(--el-color-danger);
  font-weight: 800;
}
</style>
