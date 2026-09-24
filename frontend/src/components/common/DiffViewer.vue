<script setup lang="ts">
import { computed } from "vue";
import { useTextDiff } from "../../hooks/useTextDiff";
import type { DiffSegment } from "../../hooks/useTextDiff";
import StatusBadge from "./StatusBadge.vue";
import type { DiffType } from "../../constants/DiffType";

const props = withDefaults(
  defineProps<{
    oldNo?: string;
    newNo?: string;
    oldHeading?: string;
    newHeading?: string;
    oldText: string;
    newText: string;
    diffType?: DiffType;
    showHeader?: boolean;
  }>(),
  {
    oldNo: "",
    newNo: "",
    oldHeading: "",
    newHeading: "",
    diffType: undefined,
    showHeader: true
  }
);

const oldSource = computed(() => props.oldText);
const newSource = computed(() => props.newText);
const { segments, sideBySide, changeCount } = useTextDiff(oldSource, newSource);

/** 把片段按换行切成多行，保证新旧两列行级对齐展示 */
function toLines(parts: DiffSegment[]): DiffSegment[][] {
  const lines: DiffSegment[][] = [[]];
  for (const segment of parts) {
    const chunks = segment.text.split("\n");
    chunks.forEach((chunk, index) => {
      if (index > 0) lines.push([]);
      if (chunk) lines[lines.length - 1].push({ type: segment.type, text: chunk });
    });
  }
  return lines;
}

const oldLines = computed(() => toLines(sideBySide.value.left));
const newLines = computed(() => toLines(sideBySide.value.right));
const rowCount = computed(() => Math.max(oldLines.value.length, newLines.value.length));

/** 用空行补齐两列，使行号对齐 */
const alignedOldLines = computed(() =>
  Array.from({ length: rowCount.value }, (_, index) => oldLines.value[index] ?? [])
);
const alignedNewLines = computed(() =>
  Array.from({ length: rowCount.value }, (_, index) => newLines.value[index] ?? [])
);
</script>

<template>
  <div class="diff-viewer">
    <div v-if="showHeader" class="diff-head">
      <StatusBadge v-if="diffType" kind="diff" :value="diffType" />
      <span v-if="changeCount" class="change-count">改动片段 {{ changeCount }} 处</span>
    </div>
    <div class="diff-grid">
      <div class="diff-col diff-old">
        <div class="col-title">
          <span class="col-no">{{ oldNo || "—" }}</span>
          <span>{{ oldHeading || "（旧版无此条款）" }}</span>
        </div>
        <div class="col-body">
          <div
            v-for="(line, lineIndex) in alignedOldLines"
            :key="`o-${lineIndex}`"
            class="diff-line"
            :class="{ 'is-empty': line.length === 0 }"
          >
            <template v-for="(seg, segIndex) in line" :key="segIndex">
              <span :class="`seg-${seg.type}`">{{ seg.text }}</span>
            </template>
            <span v-if="line.length === 0" class="placeholder">∅</span>
          </div>
        </div>
      </div>
      <div class="diff-col diff-new">
        <div class="col-title">
          <span class="col-no">{{ newNo || "—" }}</span>
          <span>{{ newHeading || "（新版已移除）" }}</span>
        </div>
        <div class="col-body">
          <div
            v-for="(line, lineIndex) in alignedNewLines"
            :key="`n-${lineIndex}`"
            class="diff-line"
            :class="{ 'is-empty': line.length === 0 }"
          >
            <template v-for="(seg, segIndex) in line" :key="segIndex">
              <span :class="`seg-${seg.type}`">{{ seg.text }}</span>
            </template>
            <span v-if="line.length === 0" class="placeholder">∅</span>
          </div>
        </div>
      </div>
    </div>
    <!-- 供测试取用的内联片段（屏幕阅读器可见） -->
    <span class="sr-only" v-for="(seg, index) in segments" :key="`sr-${index}`">
      {{ seg.type }}:{{ seg.text }}
    </span>
  </div>
</template>

<style scoped>
.diff-viewer {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}
.diff-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-alt);
}
.change-count {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.diff-col {
  min-width: 0;
}
.diff-old {
  border-right: 1px solid var(--color-border);
}
.col-title {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-alt);
}
.col-no {
  color: var(--el-color-primary);
  font-variant-numeric: tabular-nums;
}
.col-body {
  padding: 10px 12px;
  font-family: "SFMono-Regular", Consolas, "PingFang SC", monospace;
  font-size: 13px;
  line-height: 1.75;
}
.diff-line {
  min-height: 1.5em;
  border-radius: 3px;
  white-space: pre-wrap;
  word-break: break-word;
}
.diff-line.is-empty {
  color: var(--color-border-strong);
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 6px,
    var(--color-fill-light) 6px,
    var(--color-fill-light) 12px
  );
}
.placeholder {
  padding: 0 8px;
  user-select: none;
}
.seg-equal {
  color: inherit;
}
.seg-added {
  background: rgba(103, 194, 58, 0.22);
  border-bottom: 2px solid var(--el-color-success);
  border-radius: 2px;
}
.seg-removed {
  background: rgba(245, 108, 108, 0.22);
  text-decoration: line-through;
  text-decoration-color: var(--el-color-danger);
  border-radius: 2px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
