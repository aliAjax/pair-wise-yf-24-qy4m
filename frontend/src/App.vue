<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { routes } from "./router/routes";
import { useReviewNoteStore } from "./stores/ReviewNoteStore";
import { useReviewSessionStore } from "./stores/ReviewSessionStore";
import { APP_CONFIG } from "./config";

const route = useRoute();
const noteStore = useReviewNoteStore();
const sessionStore = useReviewSessionStore();
const { scopedRows } = storeToRefs(noteStore);

/** 全局待办数量：只认准当前所审新版版本 */
const openCount = computed(
  () => scopedRows.value.filter((note) => note.status === "OPEN").length
);
const newVersionLabel = computed(() => sessionStore.new_document_id ?? "未选择");

onMounted(async () => {
  sessionStore.load();
  await noteStore.load(sessionStore.new_document_id);
  noteStore.setScope(sessionStore.new_document_id);
});
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="brand">
        <strong>隐私政策差异对比器</strong>
        <span>policy-diff · 本地审阅</span>
      </div>
      <nav class="app-nav">
        <RouterLink
          v-for="item in routes"
          :key="item.path"
          :to="item.path"
          class="nav-link"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
          <el-badge
            v-if="item.name === 'review' && openCount > 0"
            :value="openCount"
            class="nav-badge"
            type="danger"
          />
        </RouterLink>
      </nav>
      <div class="sidebar-foot">
        待办认准所审新版版本<br />
        当前新版文档 ID：{{ newVersionLabel || "未选择" }}<br />
        数据仅保存在浏览器 localStorage
      </div>
    </aside>
    <main class="app-main">
      <header class="page-header">
        <div>
          <div class="eyebrow">{{ APP_CONFIG.title }}</div>
          <h1>{{ route.meta.title }}</h1>
          <p>{{ route.meta.description }}</p>
        </div>
        <slot name="actions" />
      </header>
      <RouterView v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
    </main>
  </div>
</template>
