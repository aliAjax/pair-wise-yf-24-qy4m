import type { DiffType } from "../constants/DiffType";
import type { PolicySection } from "../types/PolicySection";

export interface SectionPair {
  key: string;
  diffType: DiffType;
  oldSection: PolicySection | null;
  newSection: PolicySection | null;
  oldIndex: number;
  newIndex: number;
  summary: string;
}

export interface DiffLine {
  type: "same" | "add" | "del";
  text: string;
}

const normalize = (section: PolicySection) => `${section.heading}${section.content}`.replace(/\s+/g, "");

/** 字符二元组 Dice 相似度，对中文条款文本友好 */
export function similarity(a: string, b: string): number {
  const left = a.replace(/\s+/g, "");
  const right = b.replace(/\s+/g, "");
  if (left.length < 2 || right.length < 2) return left === right ? 1 : 0;
  const counts = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const gram = left.slice(index, index + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const gram = right.slice(index, index + 2);
    const available = counts.get(gram) ?? 0;
    if (available > 0) {
      overlap += 1;
      counts.set(gram, available - 1);
    }
  }
  return (2 * overlap) / (left.length - 1 + (right.length - 1));
}

/** 最长递增子序列（返回下标集合），用于识别相对顺序发生变化的条款 */
function longestIncreasing(values: number[]): Set<number> {
  const size = values.length;
  const dp = new Array<number>(size).fill(1);
  const prev = new Array<number>(size).fill(-1);
  let best = 0;
  for (let index = 0; index < size; index += 1) {
    for (let before = 0; before < index; before += 1) {
      if (values[before] < values[index] && dp[before] + 1 > dp[index]) {
        dp[index] = dp[before] + 1;
        prev[index] = before;
      }
    }
    if (dp[index] > dp[best]) best = index;
  }
  const result = new Set<number>();
  let cursor = size > 0 ? best : -1;
  while (cursor !== -1) {
    result.add(cursor);
    cursor = prev[cursor];
  }
  return result;
}

const SIMILARITY_THRESHOLD = 0.55;

/**
 * 条款级对比：
 * 1. 编号一致加分、内容相似度主导，统一打分后贪心配对
 *    （覆盖重新编号：编号相同但内容迥异的条款不会被错误配对）；
 * 2. 内容一致但相对顺序变化 → MOVED，内容变化 → MODIFIED；
 * 3. 未配对的为 ADDED / REMOVED。
 */
export function computeSectionDiff(oldSections: PolicySection[], newSections: PolicySection[]): SectionPair[] {
  const usedOld = new Set<number>();
  const usedNew = new Set<number>();
  const matched: Array<{ oldIndex: number; newIndex: number }> = [];

  const candidates: Array<{ oldIndex: number; newIndex: number; score: number }> = [];
  oldSections.forEach((oldSection, oldIndex) => {
    newSections.forEach((newSection, newIndex) => {
      const sameNo = oldSection.section_no === newSection.section_no;
      const score = similarity(normalize(oldSection), normalize(newSection));
      if (sameNo || score >= SIMILARITY_THRESHOLD) {
        candidates.push({ oldIndex, newIndex, score: score + (sameNo ? 0.5 : 0) });
      }
    });
  });
  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    if (usedOld.has(candidate.oldIndex) || usedNew.has(candidate.newIndex)) continue;
    usedOld.add(candidate.oldIndex);
    usedNew.add(candidate.newIndex);
    matched.push({ oldIndex: candidate.oldIndex, newIndex: candidate.newIndex });
  }

  const byNewOrder = [...matched].sort((a, b) => a.newIndex - b.newIndex);
  const stable = longestIncreasing(byNewOrder.map((pair) => pair.oldIndex));

  const pairs: SectionPair[] = byNewOrder.map((pair, position) => {
    const oldSection = oldSections[pair.oldIndex];
    const newSection = newSections[pair.newIndex];
    const sameContent = normalize(oldSection) === normalize(newSection);
    const moved = !stable.has(position);
    let diffType: DiffType = "UNCHANGED";
    if (!sameContent) diffType = "MODIFIED";
    else if (moved) diffType = "MOVED";
    let summary = `第${newSection.section_no}条「${newSection.heading}」内容一致`;
    if (diffType === "MODIFIED") {
      summary =
        oldSection.section_no === newSection.section_no
          ? `第${oldSection.section_no}条「${oldSection.heading}」内容改写`
          : `第${oldSection.section_no}条「${oldSection.heading}」调整为第${newSection.section_no}条，内容改写`;
    } else if (diffType === "MOVED") {
      summary = `「${newSection.heading}」从第${oldSection.section_no}条移至第${newSection.section_no}条`;
    }
    return {
      key: `pair:${oldSection.section_no}`,
      diffType,
      oldSection,
      newSection,
      oldIndex: pair.oldIndex,
      newIndex: pair.newIndex,
      summary
    };
  });

  const added: SectionPair[] = newSections
    .map((section, newIndex) => ({ section, newIndex }))
    .filter(({ newIndex }) => !usedNew.has(newIndex))
    .map(({ section, newIndex }) => ({
      key: `added:${section.section_no}`,
      diffType: "ADDED" as DiffType,
      oldSection: null,
      newSection: section,
      oldIndex: -1,
      newIndex,
      summary: `新增第${section.section_no}条「${section.heading}」`
    }));

  const removed: SectionPair[] = oldSections
    .map((section, oldIndex) => ({ section, oldIndex }))
    .filter(({ oldIndex }) => !usedOld.has(oldIndex))
    .map(({ section, oldIndex }) => ({
      key: `removed:${section.section_no}`,
      diffType: "REMOVED" as DiffType,
      oldSection: section,
      newSection: null,
      oldIndex,
      newIndex: -1,
      summary: `移除第${section.section_no}条「${section.heading}」`
    }));

  return [...pairs, ...added]
    .sort((a, b) => a.newIndex - b.newIndex)
    .concat(removed.sort((a, b) => a.oldIndex - b.oldIndex));
}

/** 句级 LCS 对比：长段落按句读切分，供双栏视图高亮增删 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const split = (text: string) =>
    text
      .split(/(?<=[。；！？!?])|\n/)
      .map((unit) => unit.trim())
      .filter(Boolean);
  const oldUnits = split(oldText);
  const newUnits = split(newText);
  const rows = oldUnits.length;
  const cols = newUnits.length;
  const dp: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let col = cols - 1; col >= 0; col -= 1) {
      dp[row][col] = oldUnits[row] === newUnits[col] ? dp[row + 1][col + 1] + 1 : Math.max(dp[row + 1][col], dp[row][col + 1]);
    }
  }
  const lines: DiffLine[] = [];
  let row = 0;
  let col = 0;
  while (row < rows && col < cols) {
    if (oldUnits[row] === newUnits[col]) {
      lines.push({ type: "same", text: oldUnits[row] });
      row += 1;
      col += 1;
    } else if (dp[row + 1][col] >= dp[row][col + 1]) {
      lines.push({ type: "del", text: oldUnits[row] });
      row += 1;
    } else {
      lines.push({ type: "add", text: newUnits[col] });
      col += 1;
    }
  }
  while (row < rows) {
    lines.push({ type: "del", text: oldUnits[row] });
    row += 1;
  }
  while (col < cols) {
    lines.push({ type: "add", text: newUnits[col] });
    col += 1;
  }
  return lines;
}

export function useTextDiff() {
  return { computeSectionDiff, diffLines, similarity };
}
