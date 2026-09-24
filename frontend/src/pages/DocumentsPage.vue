<script setup lang="ts">
import { computed, ref } from "vue";
import ImportPanel from "../components/common/ImportPanel.vue";
import SectionCard from "../components/common/SectionCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import type { PolicyDocumentForm } from "../constructors/PolicyDocumentConstructor";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { formatDate } from "../utils/formatters";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();

const importPanel = ref<InstanceType<typeof ImportPanel> | null>(null);
const expandedId = ref<number | null>(null);
const editingId = ref<number | null>(null);
const editingText = ref("");

const documents = computed(() => [...documentStore.rows].sort((a, b) => b.id - a.id));
const sectionCount = (documentId: number) => sectionStore.byDocument(documentId).length;

const onImport = async (form: PolicyDocumentForm) => {
  const created = await documentStore.importDocument(form);
  if (created) importPanel.value?.reset();
};

const startEdit = (id: number, rawText: string) => {
  editingId.value = id;
  editingText.value = rawText;
};

const saveEdit = async () => {
  if (editingId.value === null) return;
  const ok = await documentStore.updateDocumentText(editingId.value, editingText.value);
  if (ok) {
    editingId.value = null;
    editingText.value = "";
  }
};

const remove = async (id: number) => {
  await documentStore.removeDocument(id);
  if (expandedId.value === id) expandedId.value = null;
};
</script>

<template>
  <section class="stack">
    <div class="panel">
      <h2>导入政策文档</h2>
      <ImportPanel ref="importPanel" @import="onImport" />
      <p v-if="documentStore.error" class="error-text">{{ documentStore.error }}</p>
    </div>

    <div class="panel">
      <h2>版本列表（{{ documents.length }}）</h2>
      <EmptyState v-if="!documents.length" text="尚未导入任何政策文档" />
      <article v-for="document in documents" :key="document.id" class="doc-item">
        <header class="doc-head">
          <div>
            <strong>{{ document.title }}</strong>
            <span class="chip">{{ document.version_label }}</span>
          </div>
          <div class="doc-meta">
            <span>{{ sectionCount(document.id) }} 个条款</span>
            <span>{{ formatDate(document.imported_at) }}</span>
          </div>
          <div class="actions">
            <button class="btn" @click="expandedId = expandedId === document.id ? null : document.id">
              {{ expandedId === document.id ? "收起条款" : "查看条款" }}
            </button>
            <button class="btn" @click="startEdit(document.id, document.raw_text)">更新文本</button>
            <button class="btn btn-danger" @click="remove(document.id)">删除</button>
          </div>
        </header>

        <div v-if="editingId === document.id" class="edit-block">
          <p class="hint">更新文本后会重新分段；若该文档是某次对比的新版，重新对比后原审阅结论将按内容变化自动失效并留档。</p>
          <textarea v-model="editingText" rows="10"></textarea>
          <div class="actions">
            <button class="btn btn-primary" @click="saveEdit">保存并重新分段</button>
            <button class="btn btn-ghost" @click="editingId = null">取消</button>
          </div>
        </div>

        <div v-if="expandedId === document.id" class="section-list">
          <SectionCard v-for="section in sectionStore.byDocument(document.id)" :key="section.id" :section="section" />
        </div>
      </article>
    </div>
  </section>
</template>
