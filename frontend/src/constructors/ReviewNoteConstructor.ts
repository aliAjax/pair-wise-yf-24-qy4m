import type { ReviewNote, ReviewHistoryEntry } from "../types/ReviewNote";
import type { ReviewStatus } from "../types/ReviewStatus";
import type { ReviewTag } from "../constants/ReviewTag";
import type { DiffResult } from "../types/DiffResult";

/** 默认审阅备注 */
export function createDefaultReviewNote(overrides: Partial<ReviewNote> = {}): ReviewNote {
  return {
    id: 0,
    diff_result_id: 0,
    match_key: "",
    new_document_id: 0,
    old_document_id: 0,
    tag: "",
    comment: "",
    reviewer: "",
    status: "OPEN",
    resolved_hash: "",
    reopen_count: 0,
    created_at: "",
    updated_at: "",
    history: [],
    ...overrides
  };
}

/** 新建备注表单对象 */
export function createReviewNoteForm(
  overrides: {
    tag?: ReviewTag | "";
    comment?: string;
    reviewer?: string;
  } = {}
): { tag: ReviewTag | ""; comment: string; reviewer: string } {
  return {
    tag: "",
    comment: "",
    reviewer: "",
    ...overrides
  };
}

/** 针对某个差异结果创建备注（factory） */
export function createReviewNoteForDiff(
  diff: DiffResult,
  form: { tag: ReviewTag | ""; comment: string; reviewer: string },
  id: number,
  now: string
): ReviewNote {
  const historyEntry: ReviewHistoryEntry = {
    action: "创建备注",
    from_status: null,
    to_status: "OPEN",
    comment: form.comment,
    reviewer: form.reviewer,
    tag: form.tag,
    content_hash: diff.content_hash,
    at: now
  };
  return createDefaultReviewNote({
    id,
    diff_result_id: diff.id,
    match_key: diff.match_key,
    new_document_id: diff.new_document_id,
    old_document_id: diff.old_document_id,
    tag: form.tag,
    comment: form.comment,
    reviewer: form.reviewer,
    status: "OPEN",
    resolved_hash: "",
    reopen_count: 0,
    created_at: now,
    updated_at: now,
    history: [historyEntry]
  });
}

/** 追加一条处理留档（历史只增不删） */
export function appendReviewHistory(
  note: ReviewNote,
  entry: Omit<ReviewHistoryEntry, "at"> & { at?: string }
): ReviewHistoryEntry[] {
  return [
    { ...entry, at: entry.at ?? new Date().toISOString() },
    ...note.history
  ];
}

/** 内容变化后回到待处理时构造的留档条目 */
export function createReopenHistoryEntry(
  note: ReviewNote,
  newHash: string
): ReviewHistoryEntry {
  return {
    action: "新版内容变化，已解决结论自动回到待处理",
    from_status: "RESOLVED" as ReviewStatus,
    to_status: "OPEN",
    comment: note.comment,
    reviewer: note.reviewer,
    tag: note.tag,
    content_hash: newHash,
    at: new Date().toISOString()
  };
}

/** API 响应对象 */
export function createReviewNoteResponse(row: ReviewNote): ReviewNote {
  return { ...row, history: [...row.history] };
}
