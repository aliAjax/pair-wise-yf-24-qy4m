import type { DiffResult } from "./DiffResult";
import type { ReviewNote } from "./ReviewNote";
import type { ReviewStatus } from "./ReviewStatus";

/** 审阅清单视图模型：差异 + 当前有效状态 + 全部处理记录（含历史留档） */
export interface ReviewItem {
  diff: DiffResult;
  status: ReviewStatus;
  notes: ReviewNote[];
}
