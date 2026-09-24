<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import { routes } from "./router/routes";
import { STORAGE_KEYS } from "./constants/storageKeys";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import { useDiffResultStore } from "./stores/DiffResultStore";
import { usePolicyDocumentStore } from "./stores/PolicyDocumentStore";
import { usePolicySectionStore } from "./stores/PolicySectionStore";
import { useReviewNoteStore } from "./stores/ReviewNoteStore";
import ComparePage from "./pages/ComparePage.vue";
import DocumentsPage from "./pages/DocumentsPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";
import RisksPage from "./pages/RisksPage.vue";
import StatCard from "./components/common/StatCard.vue";

const pages: Record<string, unknown> = {
  "/documents": DocumentsPage,
  "/compare": ComparePage,
  "/risks": RisksPage,
  "/review": ReviewPage
};

const active = useLocalStorageState<string>(STORAGE_KEYS.activeRoute, "/documents");
const current = computed(() => routes.find((route) => route.route === active.value) ?? routes[0]);
const currentPage = computed(() => pages[current.value?.route ?? "/documents"] ?? DocumentsPage);

const navigate = (route: string) => {
  active.value = route;
};
provide("navigate", navigate);

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

const ready = ref(false);
onMounted(async () => {
  await documentStore.bootstrap();
  await sectionStore.load();
  await diffStore.load();
  await noteStore.load();
  ready.value = true;
});

/** 待办数量：当前对比组中有效状态仍为待处理的差异数 */
const todoCount = computed(() => noteStore.todoCount(diffStore.pairRows));
const changedCount = computed(() => diffStore.pairRows.filter((row) => row.diff_type !== "UNCHANGED").length);
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策差异对比器</div>
      <nav>
        <button v-for="route in routes" :key="route.route" :class="{ active: active === route.route }" @click="navigate(route.route)">
          {{ route.name }}
          <span v-if="route.route === '/review' && todoCount > 0" class="nav-badge">{{ todoCount }}</span>
        </button>
      </nav>
    </aside>
    <main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">policy-diff</p>
          <h1>{{ current?.name }}</h1>
        </div>
        <span class="badge">LOCAL_DATA</span>
      </section>
      <section class="metrics">
        <StatCard label="政策文档" :value="documentStore.rows.length" />
        <StatCard label="当前对比差异" :value="changedCount" />
        <StatCard label="待处理" :value="todoCount" />
      </section>
      <component :is="currentPage" v-if="ready" />
      <p v-else class="empty">正在加载本地数据…</p>
    </main>
  </div>
</template>
