<script setup lang="ts">
import { computed } from "vue";
import { formatStatus } from "../../utils/formatters";

const props = defineProps<{ value: string }>();
const text = computed(() => formatStatus(props.value));
const className = computed(() => `badge status-${props.value.toLowerCase()}`);
</script>

<template>
  <span :class="className">{{ text }}</span>
</template>
