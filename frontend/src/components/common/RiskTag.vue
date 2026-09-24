<script setup lang="ts">
import { computed } from "vue";
import { formatRisk } from "../../utils/formatters";

const props = defineProps<{ level: string }>();
const text = computed(() => formatRisk(props.level));
const className = computed(() => `badge risk-${props.level.toLowerCase()}`);
</script>

<template>
  <span :class="className">风险·{{ text }}</span>
</template>
