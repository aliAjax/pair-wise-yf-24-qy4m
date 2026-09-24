import type { DiffResult } from "../types/DiffResult";
import type { PolicySection } from "../types/PolicySection";
import type { ReviewNote } from "../types/ReviewNote";
import type { PolicyDocument } from "../types/PolicyDocument";
import { buildDiffResult } from "../constructors/DiffResultConstructor";
import { createReopenHistoryEntry } from "../constructors/ReviewNoteConstructor";
import { DiffTypeText } from "../constants/DiffType";
import * as sectionApi from "../api/PolicySection";
import * as diffApi from "../api/DiffResult";
import * as noteApi from "../api/ReviewNote";
import { PolicyDiffError } from "../utils/errors";
import { recordLog } from "../utils/logger";

interface SectionPair {
  oldSection: PolicySection | null;
  newSection: PolicySection | null;
}

const normHeading = (value: string): string => value.replace(/\s+/g, "");

/** 以标题为身份做 LCS 对齐，锚定新增/删除位置 */
function lcsHeadingPairs(oldRows: PolicySection[], newRows: PolicySection[]): {
  pairs: SectionPair[];
  added: SectionPair[];
  removed: SectionPair[];
} {
  const m = oldRows.length;
  const n = newRows.length;
  const dp: Uint16Array[] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        normHeading(oldRows[i].heading) === normHeading(newRows[j].heading)
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lcsPairs: SectionPair[] = [];
  const matchedOld = new Set<number>();
  const matchedNew = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (normHeading(oldRows[i].heading) === normHeading(newRows[j].heading)) {
      lcsPairs.push({ oldSection: oldRows[i], newSection: newRows[j] });
      matchedOld.add(i);
      matchedNew.add(j);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  // LCS 未对上的条款：同标题的跨位置配对（换序候选，如位置整体移动的条款）
  const leftoverOld = oldRows
    .map((section, index) => ({ section, index }))
    .filter((item) => !matchedOld.has(item.index));
  const leftoverNew = newRows
    .map((section, index) => ({ section, index }))
    .filter((item) => !matchedNew.has(item.index));

  const movedPairs: SectionPair[] = [];
  const usedOld = new Set<number>();
  const usedNew = new Set<number>();
  for (const oldItem of leftoverOld) {
    const newIndex = leftoverNew.findIndex(
      (newItem) =>
        !usedNew.has(newItem.index) &&
        normHeading(oldItem.section.heading) === normHeading(newItem.section.heading)
    );
    if (newIndex >= 0) {
      movedPairs.push({ oldSection: oldItem.section, newSection: leftoverNew[newIndex].section });
      usedOld.add(oldItem.index);
      usedNew.add(leftoverNew[newIndex].index);
    }
  }

  const removed = leftoverOld
    .filter((item) => !usedOld.has(item.index))
    .map((item) => ({ oldSection: item.section, newSection: null }));
  const added = leftoverNew
    .filter((item) => !usedNew.has(item.index))
    .map((item) => ({ oldSection: null, newSection: item.section }));

  return { pairs: [...lcsPairs, ...movedPairs], added, removed };
}

const lastOrdinal = (section: PolicySection): number =>
  section.order_path[section.order_path.length - 1] || 0;

/**
 * 判断“内容相同、位置变化”的条款是真换序还是新增/删除造成的顺延：
 * 沿 LCS 对齐序列线性推进，累计新增/删除带来的净偏移，
 * 实际新位置 == 旧位置 + 净偏移 即顺延（未变），否则为换序。
 */
function findMovedPairs(pairs: SectionPair[], added: SectionPair[], removed: SectionPair[]) {
  const contentPairs = pairs.filter(
    (pair): pair is { oldSection: PolicySection; newSection: PolicySection } =>
      pair.oldSection !== null && pair.newSection !== null
  );
  const matchedByOld = new Map(contentPairs.map((pair) => [pair.oldSection.id, pair]));
  const matchedByNew = new Map(contentPairs.map((pair) => [pair.newSection.id, pair]));

  const movedOldIds = new Set<number>();
  let shift = 0;
  let oi = 0;
  let ni = 0;

  const oldAll = contentPairs.map((p) => p.oldSection).concat(
    removed.map((p) => p.oldSection!)
  );
  const newAll = contentPairs.map((p) => p.newSection).concat(
    added.map((p) => p.newSection!)
  );
  oldAll.sort((a, b) => lastOrdinal(a) - lastOrdinal(b));
  newAll.sort((a, b) => lastOrdinal(a) - lastOrdinal(b));

  while (oi < oldAll.length || ni < newAll.length) {
    const oldSection = oi < oldAll.length ? oldAll[oi] : null;
    const newSection = ni < newAll.length ? newAll[ni] : null;
    const pairOld = oldSection ? matchedByOld.get(oldSection.id) : undefined;
    const pairNew = newSection ? matchedByNew.get(newSection.id) : undefined;

    if (pairOld && pairNew && pairOld === pairNew && oldSection && newSection) {
      const expectedNewOrd = lastOrdinal(oldSection) + shift;
      if (
        pairOld.oldSection.content_hash === pairOld.newSection.content_hash &&
        expectedNewOrd !== lastOrdinal(newSection)
      ) {
        movedOldIds.add(oldSection.id);
      }
      oi += 1;
      ni += 1;
    } else if (newSection && pairNew) {
      // 对应旧条款还在后面，先遇到新侧匹配项：说明它整体前移（换序）
      if (pairNew.oldSection.content_hash === pairNew.newSection.content_hash) {
        movedOldIds.add(pairNew.oldSection.id);
      }
      shift += 1;
      ni += 1;
    } else if (newSection && !pairNew) {
      shift += 1;
      ni += 1;
    } else if (oldSection && pairOld) {
      shift -= 1;
      oi += 1;
    } else {
      shift -= 1;
      oi += 1;
    }
  }

  return contentPairs
    .filter((pair) => movedOldIds.has(pair.oldSection.id))
    .map((pair) => pair as SectionPair);
}

export interface PairDiffResult {
  diffs: DiffResult[];
  reopened: ReviewNote[];
  counts: Record<"ADDED" | "REMOVED" | "MODIFIED" | "MOVED" | "UNCHANGED", number>;
}

/** 按编号识别条款，生成两版差异（新增/移除/改写/换序/未变） */
export async function computePairDiff(
  oldDocument: PolicyDocument,
  newDocument: PolicyDocument
): Promise<PairDiffResult> {
  if (oldDocument.id === newDocument.id) {
    throw new PolicyDiffError("SAME_VERSION");
  }
  const [oldRows, newRows] = await Promise.all([
    sectionApi.listPolicySection(oldDocument.id),
    sectionApi.listPolicySection(newDocument.id)
  ]);
  oldRows.sort((a, b) => a.order_path.join(".").localeCompare(b.order_path.join("."), undefined, { numeric: true }));
  newRows.sort((a, b) => a.order_path.join(".").localeCompare(b.order_path.join("."), undefined, { numeric: true }));

  const { pairs: matchedPairs, added, removed } = lcsHeadingPairs(oldRows, newRows);
  const movedPairs = findMovedPairs(matchedPairs, added, removed);
  const movedPairSet = new Set(movedPairs.map((pair) => pair.oldSection?.id));

  const now = new Date().toISOString();
  let diffId = Date.now() % 1_000_000;
  const buildOne = (
    pair: SectionPair,
    diffType: DiffResult["diff_type"],
    index: number
  ): DiffResult =>
    buildDiffResult({
      oldDocumentId: oldDocument.id,
      newDocumentId: newDocument.id,
      oldSection: pair.oldSection,
      newSection: pair.newSection,
      diffType,
      ordinal: index,
      id: diffId++,
      createdAt: now
    });

  // 最终按新版位置排序；新增/移除条款各自占一个差异项
  const classified: Array<{ pair: SectionPair; diffType: DiffResult["diff_type"] }> =
    matchedPairs.map((pair) => {
    if (!pair.oldSection || !pair.newSection) return { pair, diffType: "UNCHANGED" as const };
    if (pair.oldSection.content_hash !== pair.newSection.content_hash) {
      return { pair, diffType: "MODIFIED" as const };
    }
    if (movedPairSet.has(pair.oldSection.id)) return { pair, diffType: "MOVED" as const };
    return { pair, diffType: "UNCHANGED" as const };
  });
  added.forEach((pair) => classified.push({ pair, diffType: "ADDED" as const }));
  removed.forEach((pair) => classified.push({ pair, diffType: "REMOVED" as const }));

  classified.sort((a, b) => {
    const ao =
      a.pair.newSection?.order_path.join(".") ?? `z${a.pair.oldSection?.order_path.join(".")}`;
    const bo =
      b.pair.newSection?.order_path.join(".") ?? `z${b.pair.oldSection?.order_path.join(".")}`;
    return ao.localeCompare(bo, undefined, { numeric: true });
  });

  const diffs = classified.map((item, index) => buildOne(item.pair, item.diffType, index));
  const counts = { ADDED: 0, REMOVED: 0, MODIFIED: 0, MOVED: 0, UNCHANGED: 0 };
  diffs.forEach((diff) => {
    counts[diff.diff_type] += 1;
  });

  await diffApi.replaceDiffResults(oldDocument.id, newDocument.id, diffs);
  const reopened = await applyContentChangeReopen(diffs, oldDocument, newDocument);

  recordLog("DiffResult", "CREATE", {
    oldLabel: oldDocument.version_label,
    newLabel: newDocument.version_label,
    count: diffs.filter((d) => d.diff_type !== "UNCHANGED").length,
    added: counts.ADDED,
    removed: counts.REMOVED,
    modified: counts.MODIFIED,
    moved: counts.MOVED
  });
  if (reopened.length > 0) {
    recordLog("DiffResult", "UPDATE", {
      oldLabel: oldDocument.version_label,
      newLabel: newDocument.version_label,
      changed: reopened.length
    });
  }

  return { diffs, reopened, counts };
}

/**
 * 内容变化后回退结论：
 * 待处理状态认准所审新版版本。同一 match_key 的 RESOLVED 备注，
 * 若 resolved_hash 与当前新版内容指纹不一致，自动回到 OPEN，旧记录留档。
 */
async function applyContentChangeReopen(
  diffs: DiffResult[],
  oldDocument: PolicyDocument,
  newDocument: PolicyDocument
): Promise<ReviewNote[]> {
  const notes = await noteApi.listReviewNote();
  const pairNotes = notes.filter(
    (note) =>
      note.old_document_id === oldDocument.id && note.new_document_id === newDocument.id
  );
  const diffByKey = new Map(diffs.map((diff) => [diff.match_key, diff]));
  // 换序导致编号变化时的兜底：按旧 match_key 中的旧编号回查 diff.old_section_no
  const diffByOldNo = new Map(
    diffs
      .filter((diff) => diff.old_section_no)
      .map((diff) => [diff.old_section_no, diff])
  );
  const reopened: ReviewNote[] = [];

  for (const note of pairNotes) {
    let diff = diffByKey.get(note.match_key);
    if (!diff) {
      const hashIndex = note.match_key.indexOf("#");
      const oldNo = hashIndex >= 0 ? note.match_key.slice(hashIndex + 1).trim() : "";
      diff = oldNo ? diffByOldNo.get(oldNo) : undefined;
    }
    if (diff) {
      note.diff_result_id = diff.id;
      note.match_key = diff.match_key;
    }
    if (
      note.status === "RESOLVED" &&
      diff &&
      note.resolved_hash &&
      note.resolved_hash !== diff.content_hash
    ) {
      note.status = "OPEN";
      note.reopen_count += 1;
      note.history = [createReopenHistoryEntry(note, diff.content_hash), ...note.history];
      note.updated_at = new Date().toISOString();
      note.resolved_hash = "";
      reopened.push(note);
      recordLog("DiffResult", "STATUS_CHANGE", { matchKey: note.match_key });
      recordLog("ReviewNote", "REOPEN", {
        id: note.id,
        reopenCount: note.reopen_count
      });
    }
  }

  if (pairNotes.some((note) => diffByKey.has(note.match_key)) || reopened.length > 0) {
    await noteApi.bulkUpdateReviewNote(pairNotes);
  }
  return reopened;
}

/** 差异类型中文摘要（组件与导出共用） */
export function describeDiffType(diffType: DiffResult["diff_type"]): string {
  return DiffTypeText[diffType];
}
