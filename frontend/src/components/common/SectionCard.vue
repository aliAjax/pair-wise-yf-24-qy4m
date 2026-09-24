<script setup lang="ts">
import type { PolicySection } from "../../types/PolicySection";
import { formatDiffType } from "../../utils/formatters";
import RiskTag from "./RiskTag.vue";

defineProps<{ section: PolicySection; diffType?: string }>();
</script>

<template>
  <article class="section-card">
    <header>
      <strong>第{{ section.section_no }}条 {{ section.heading }}</strong>
      <span class="chip">{{ section.category }}</span>
      <RiskTag :level="section.risk_level" />
      <span v-if="diffType" class="badge">{{ formatDiffType(diffType) }}</span>
    </header>
    <pre>{{ section.content }}</pre>
  </article>
</template>
