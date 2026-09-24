import type { ReviewStatus } from "./ReviewStatus";

export interface ReviewNote {
  id: number;
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
  status: ReviewStatus;
  /** 该结论认准的新版内容指纹；与当前指纹不一致时转为历史留档 */
  content_hash: string;
  created_at: string;
}
