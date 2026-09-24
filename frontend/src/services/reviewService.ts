import type { ReviewNote } from "../types/ReviewNote";
import type { ReviewStatus } from "../constants/ReviewStatus";
import type { ReviewTag } from "../constants/ReviewTag";
import type { DiffResult } from "../types/DiffResult";
import * as noteApi from "../api/ReviewNote";
import {
  appendReviewHistory,
  createReviewNoteForDiff
} from "../constructors/ReviewNoteConstructor";
import { PolicyDiffError } from "../utils/errors";
import { recordLog } from "../utils/logger";
import { ReviewStatusText } from "../constants/ReviewStatus";
import { listAll, NAMESPACES, nextId } from "../api/_base";

interface NoteDraft {
  tag: ReviewTag | "";
  comment: string;
  reviewer: string;
}

/** 针对一个差异结果新增审阅备注 */
export async function addReviewNote(diff: DiffResult, draft: NoteDraft): Promise<ReviewNote> {
  if (!draft.comment.trim() && !draft.tag) {
    throw new PolicyDiffError("VALIDATION_FAILED", { field: "备注内容或标签" });
  }
  const now = new Date().toISOString();
  const note = createReviewNoteForDiff(
    diff,
    {
      tag: draft.tag,
      comment: draft.comment.trim(),
      reviewer: draft.reviewer.trim() || "匿名审阅人"
    },
    nextId(listAll<ReviewNote>(NAMESPACES.notes)),
    now
  );
  const saved = await noteApi.createReviewNote(note);
  recordLog("ReviewNote", "CREATE", {
    sectionNo: diff.new_section_no || diff.old_section_no,
    reviewer: saved.reviewer
  });
  return saved;
}

/** 流转备注状态；标记为已解决时记录当前新版内容指纹 */
export async function changeReviewStatus(
  note: ReviewNote,
  toStatus: ReviewStatus,
  diff: DiffResult,
  draft: Partial<NoteDraft> = {}
): Promise<ReviewNote> {
  const reviewer = draft.reviewer?.trim() || note.reviewer || "匿名审阅人";
  const comment = draft.comment?.trim() ?? note.comment;
  const tag = draft.tag ?? note.tag;
  const updated: ReviewNote = {
    ...note,
    status: toStatus,
    reviewer,
    comment,
    tag,
    updated_at: new Date().toISOString(),
    resolved_hash: toStatus === "RESOLVED" ? diff.content_hash : ""
  };
  updated.history = appendReviewHistory(note, {
    action: `状态流转为「${ReviewStatusText[toStatus]}」`,
    from_status: note.status,
    to_status: toStatus,
    comment,
    reviewer,
    tag,
    content_hash: diff.content_hash
  });
  const saved = await noteApi.updateReviewNote(updated);
  recordLog("ReviewNote", "STATUS_CHANGE", {
    id: saved.id,
    fromStatus: ReviewStatusText[note.status],
    toStatus: ReviewStatusText[toStatus],
    reviewer: saved.reviewer
  });
  return saved;
}

export async function updateReviewNoteContent(
  note: ReviewNote,
  draft: Partial<NoteDraft>
): Promise<ReviewNote> {
  const updated: ReviewNote = {
    ...note,
    tag: draft.tag ?? note.tag,
    comment: draft.comment?.trim() ?? note.comment,
    reviewer: draft.reviewer?.trim() || note.reviewer,
    updated_at: new Date().toISOString()
  };
  const saved = await noteApi.updateReviewNote(updated);
  recordLog("ReviewNote", "UPDATE", { id: saved.id, fields: "备注内容" });
  return saved;
}
