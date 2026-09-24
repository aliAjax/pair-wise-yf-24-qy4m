import type { ReviewNote } from "../types/ReviewNote";
import type { ReviewStatus } from "../types/ReviewStatus";
import { nowIso } from "../utils/formatters";

export interface ReviewNoteForm {
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
  status: ReviewStatus;
}

export const createDefaultReviewNote = (overrides: Partial<ReviewNote> = {}): ReviewNote => ({
  id: 0,
  diff_result_id: 0,
  tag: "",
  comment: "",
  reviewer: "",
  status: "OPEN",
  content_hash: "",
  created_at: nowIso(),
  ...overrides
});

export const createReviewNoteForm = (diffResultId: number): ReviewNoteForm => ({
  diff_result_id: diffResultId,
  tag: "",
  comment: "",
  reviewer: "",
  status: "OPEN"
});

/**
 * 处理记录追加时固化所审新版内容指纹：
 * 之后新版内容一旦变化，该记录自动转为历史留档。
 */
export const buildReviewNote = (form: ReviewNoteForm, id: number, contentHashValue: string): ReviewNote =>
  createDefaultReviewNote({
    id,
    diff_result_id: form.diff_result_id,
    tag: form.tag.trim(),
    comment: form.comment.trim(),
    reviewer: form.reviewer.trim(),
    status: form.status,
    content_hash: contentHashValue,
    created_at: nowIso()
  });

export const createReviewNoteResponse = createDefaultReviewNote;
