<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string; icon?: string }>(), {
  title: "暂无数据",
  description: "",
  icon: "📭"
});
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  border: 1px dashed var(--color-border-strong);
  border-radius: 10px;
  padding: 36px 20px;
  text-align: center;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
}
.empty-icon {
  font-size: 32px;
}
.empty-state p {
  margin: 0;
  font-size: 13px;
  max-width: 380px;
}
</style>
