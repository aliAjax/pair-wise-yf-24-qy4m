<script setup lang="ts">
import { computed, reactive } from "vue";
import { createPolicyDocumentForm, type PolicyDocumentForm } from "../../constructors/PolicyDocumentConstructor";
import { parsePolicyText } from "../../hooks/usePolicyParser";

const emit = defineEmits<{ (event: "import", form: PolicyDocumentForm): void }>();

const form = reactive<PolicyDocumentForm>(createPolicyDocumentForm());

/** 实时解析预览：按编号识别条款，让用户粘贴后即可确认识别效果 */
const preview = computed(() => (form.raw_text.trim() ? parsePolicyText(form.raw_text) : []));

const submit = () => {
  emit("import", { ...form });
};

const reset = () => Object.assign(form, createPolicyDocumentForm());
defineExpose({ reset });
</script>

<template>
  <div class="import-panel">
    <div class="field-row">
      <label>
        文档标题
        <input v-model="form.title" type="text" placeholder="例如：隐私政策" />
      </label>
      <label>
        版本标识
        <input v-model="form.version_label" type="text" placeholder="例如：v2.0 新版" />
      </label>
    </div>
    <label class="field-block">
      政策全文（按「一、」「1.」「第X条」「（一）」等编号自动识别条款）
      <textarea v-model="form.raw_text" rows="10" placeholder="在此粘贴政策全文…"></textarea>
    </label>
    <div v-if="preview.length" class="parse-preview">
      <strong>识别到 {{ preview.length }} 个条款：</strong>
      <span v-for="section in preview.slice(0, 8)" :key="section.section_no" class="chip">第{{ section.section_no }}条 {{ section.heading }}</span>
      <span v-if="preview.length > 8" class="chip">…共 {{ preview.length }} 条</span>
    </div>
    <div class="actions">
      <button class="btn btn-primary" :disabled="!form.raw_text.trim()" @click="submit">导入并分段</button>
      <button class="btn btn-ghost" @click="reset">清空</button>
    </div>
  </div>
</template>
