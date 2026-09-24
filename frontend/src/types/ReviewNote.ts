import type { ReviewStatus } from "../constants/ReviewStatus";
import type { ReviewTag } from "../constants/ReviewTag";

/** 审阅状态（枚举值定义在 constants/ReviewStatus.ts） */
export type { ReviewStatus };

/** 审阅快捷标签（枚举值定义在 constants/ReviewTag.ts） */
export type { ReviewTag };

/** 审阅处理记录中的单条留档 */
export interface ReviewHistoryEntry {
  action: string;
  from_status: ReviewStatus | null;
  to_status: ReviewStatus;
  comment: string;
  reviewer: string;
  tag: ReviewTag | "";
  /** 该次处理时所审新版版本的内容指纹 */
  content_hash: string;
  at: string;
}

/** 审阅备注：针对某个差异结果形成的待处理项 */
export interface ReviewNote {
  id: number;
  diff_result_id: number;
  /** 冗余匹配键，便于在差异结果重算后迁移备注 */
  match_key: string;
  new_document_id: number;
  old_document_id: number;
  tag: ReviewTag | "";
  comment: string;
  reviewer: string;
  status: ReviewStatus;
  /** 最近一次解决（RESOLVED）时的内容指纹，新版内容变化后结论失效 */
  resolved_hash: string;
  /** 自动回到待处理的次数（旧记录继续留档） */
  reopen_count: number;
  created_at: string;
  updated_at: string;
  history: ReviewHistoryEntry[];
}
