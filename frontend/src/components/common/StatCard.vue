<script setup lang="ts">
import { computed } from "vue";
import { formatNumber } from "../../utils/formatters";

const props = withDefaults(
  defineProps<{
    label: string;
    value: number | string;
    tone?: "default" | "danger" | "warning" | "success";
    hint?: string;
  }>(),
  { tone: "default", hint: "" }
);

const display = computed(() =>
  typeof props.value === "number" ? formatNumber(props.value) : props.value
);
</script>

<template>
  <div class="stat-card" :class="`tone-${tone}`">
    <span class="stat-label">{{ label }}</span>
    <strong class="stat-value">{{ display }}</strong>
    <small v-if="hint" class="stat-hint">{{ hint }}</small>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.stat-value {
  font-size: 30px;
  line-height: 1.15;
  color: var(--color-text);
}
.tone-danger .stat-value {
  color: var(--el-color-danger);
}
.tone-warning .stat-value {
  color: var(--el-color-warning-dark-2);
}
.tone-success .stat-value {
  color: var(--el-color-success-dark-2);
}
.stat-hint {
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
