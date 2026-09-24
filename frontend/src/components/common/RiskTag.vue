<script setup lang="ts">
import { computed } from "vue";
import { PrivacyRiskLevelText } from "../../constants/PrivacyRiskLevel";
import type { PrivacyRiskLevel } from "../../constants/PrivacyRiskLevel";
import { riskTagType } from "../../utils/formatters";

const props = withDefaults(
  defineProps<{ level: PrivacyRiskLevel; reason?: string; size?: "small" | "default" }>(),
  { reason: "", size: "default" }
);

const label = computed(() => PrivacyRiskLevelText[props.level]);
</script>

<template>
  <el-tooltip v-if="reason" :content="reason" placement="top" :show-after="200">
    <el-tag :type="riskTagType(level)" :size="size" effect="dark" class="risk-tag">
      {{ label }}风险
    </el-tag>
  </el-tooltip>
  <el-tag v-else :type="riskTagType(level)" :size="size" effect="dark" class="risk-tag">
    {{ label }}风险
  </el-tag>
</template>

<style scoped>
.risk-tag {
  font-weight: 700;
}
</style>
