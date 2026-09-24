<script setup lang="ts">
import { computed } from "vue";
import { diffLines } from "../../hooks/useTextDiff";
import type { DiffResult } from "../../types/DiffResult";
import { formatDiffType } from "../../utils/formatters";

const props = defineProps<{ diff: DiffResult }>();

/** 句级对比结果：旧版栏隐藏新增句，新版栏隐藏删除句 */
const lines = computed(() => diffLines(props.diff.old_text, props.diff.new_text));
const oldLines = computed(() => lines.value.filter((line) => line.type !== "add"));
const newLines = computed(() => lines.value.filter((line) => line.type !== "del"));
</script>

<template>
  <div class="diff-viewer">
    <header class="diff-head">
      <span class="badge">{{ formatDiffType(diff.diff_type) }}</span>
      <strong>{{ diff.summary }}</strong>
    </header>
    <div class="diff-grid">
      <section class="diff-pane">
        <h3>旧版 · 第{{ diff.old_no || "—" }}条 {{ diff.old_heading || "（无对应条款）" }}</h3>
        <p v-if="!diff.old_text" class="diff-empty">旧版中不存在该条款</p>
        <p v-for="(line, index) in oldLines" v-else :key="index" class="diff-line" :class="line.type">{{ line.text }}</p>
      </section>
      <section class="diff-pane">
        <h3>新版 · 第{{ diff.new_no || "—" }}条 {{ diff.new_heading || "（无对应条款）" }}</h3>
        <p v-if="!diff.new_text" class="diff-empty">新版中不存在该条款</p>
        <p v-for="(line, index) in newLines" v-else :key="index" class="diff-line" :class="line.type">{{ line.text }}</p>
      </section>
    </div>
  </div>
</template>
