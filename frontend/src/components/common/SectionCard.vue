<script setup lang="ts">
import { computed } from "vue";
import type { PolicySection } from "../../types/PolicySection";
import { formatCategory } from "../../utils/formatters";
import RiskTag from "./RiskTag.vue";

const props = withDefaults(
  defineProps<{
    section: PolicySection;
    extraNo?: string;
    selectable?: boolean;
    dimmed?: boolean;
  }>(),
  { extraNo: "", selectable: false, dimmed: false }
);

const emit = defineEmits<{
  (e: "select", section: PolicySection): void;
}>();

const noText = computed(() =>
  props.extraNo && props.extraNo !== props.section.section_no
    ? `${props.extraNo} → ${props.section.section_no}`
    : props.section.section_no
);
</script>

<template>
  <article class="section-card" :class="{ dimmed }">
    <header class="section-head">
      <button
        v-if="selectable"
        class="section-title section-title-btn"
        type="button"
        @click="emit('select', section)"
      >
        <span class="section-no">{{ noText }}</span>
        <span>{{ section.heading }}</span>
      </button>
      <div v-else class="section-title">
        <span class="section-no">{{ noText }}</span>
        <span>{{ section.heading }}</span>
      </div>
      <div class="section-meta">
        <el-tag size="small" effect="plain">{{ formatCategory(section.category) }}</el-tag>
        <RiskTag :level="section.risk_level" :reason="section.risk_reason" size="small" />
      </div>
    </header>
    <p class="section-content">{{ section.content }}</p>
    <footer v-if="section.risk_reason" class="section-reason">
      风险判定：{{ section.risk_reason }}
    </footer>
  </article>
</template>

<style scoped>
.section-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-card.dimmed {
  opacity: 0.55;
}
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
.section-title {
  font-weight: 700;
  display: flex;
  gap: 8px;
  align-items: baseline;
  color: var(--color-text);
}
.section-title-btn {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.section-title-btn:hover span:last-child {
  color: var(--el-color-primary);
  text-decoration: underline;
}
.section-no {
  color: var(--el-color-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.section-meta {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.section-content {
  margin: 0;
  white-space: pre-wrap;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.7;
}
.section-reason {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  border-top: 1px dashed var(--color-border);
  padding-top: 6px;
}
</style>
