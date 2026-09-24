<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PolicyDocumentForm } from "../../types/PolicyDocument";
import { parsePolicyText } from "../../hooks/usePolicyParser";
import { PolicyDiffError } from "../../utils/errors";

const props = withDefaults(
  defineProps<{
    modelValue?: PolicyDocumentForm;
    submitText?: string;
    compact?: boolean;
  }>(),
  {
    modelValue: () => ({ title: "", version_label: "", raw_text: "" }),
    submitText: "导入并自动分段",
    compact: false
  }
);

const emit = defineEmits<{
  (e: "submit", form: PolicyDocumentForm): void;
  (e: "cancel"): void;
}>();

const title = ref(props.modelValue.title);
const versionLabel = ref(props.modelValue.version_label);
const rawText = ref(props.modelValue.raw_text);

watch(
  () => props.modelValue,
  (form) => {
    title.value = form.title;
    versionLabel.value = form.version_label;
    rawText.value = form.raw_text;
  }
);

const preview = computed(() => {
  if (!rawText.value.trim()) return null;
  try {
    const sections = parsePolicyText(rawText.value);
    return { count: sections.length, first: sections[0]?.heading ?? "" };
  } catch (error) {
    return {
      error: error instanceof PolicyDiffError ? error.message : "无法识别条款编号"
    };
  }
});

const canSubmit = computed(
  () => title.value.trim() && versionLabel.value.trim() && rawText.value.trim().length >= 10
);

function submit(): void {
  emit("submit", {
    title: title.value,
    version_label: versionLabel.value,
    raw_text: rawText.value
  });
}

function loadSample(): void {
  title.value = "示例隐私政策";
  versionLabel.value = `draft-${new Date().toISOString().slice(0, 10)}`;
  rawText.value = "1. 引言\n本政策说明我们如何处理您的个人信息。\n\n2. 我们如何收集个人信息\n我们在您注册时收集手机号码，并在您使用服务时收集设备信息。\n\n3. 信息的保存期限\n我们仅在最短期限内保留您的个人信息，注销后三十日内删除。";
}
</script>

<template>
  <el-form label-position="top" class="import-panel" :class="{ compact }">
    <el-form-item label="政策标题" required>
      <el-input v-model="title" placeholder="例如：XX 产品隐私政策" maxlength="60" show-word-limit />
    </el-form-item>
    <el-form-item label="版本号" required>
      <el-input v-model="versionLabel" placeholder="例如：2026-v2 / v3.1" maxlength="30" />
    </el-form-item>
    <el-form-item label="政策正文（按编号粘贴，如 “1.” “3.1 ” “第3条”）" required>
      <el-input
        v-model="rawText"
        type="textarea"
        :rows="compact ? 8 : 14"
        placeholder="将旧版或新版隐私政策全文粘贴到这里，系统会按条款编号自动分段并标注高风险条款"
      />
    </el-form-item>

    <div class="import-preview">
      <template v-if="preview && 'error' in preview">
        <el-alert :title="preview.error" type="error" :closable="false" show-icon />
      </template>
      <template v-else-if="preview">
        <el-alert type="success" :closable="false" show-icon>
          <template #title>
            已识别 {{ preview.count }} 个条款，首个条款：《{{ preview.first }}》
          </template>
        </el-alert>
      </template>
      <el-button v-else text type="primary" @click="loadSample">
        没有文本？点此填入一段示例政策
      </el-button>
    </div>

    <div class="import-actions">
      <el-button @click="emit('cancel')">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="submit">{{ submitText }}</el-button>
    </div>
  </el-form>
</template>

<style scoped>
.import-panel :deep(.el-textarea__inner) {
  font-family: "SFMono-Regular", Consolas, "PingFang SC", monospace;
  line-height: 1.6;
}
.import-preview {
  margin-bottom: 14px;
}
.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
