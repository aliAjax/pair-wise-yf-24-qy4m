import type { DiffType } from "./DiffType";

export interface DiffResult {
  id: number;
  old_document_id: number;
  new_document_id: number;
  /** 兼容字段：新版条款 id（无新版条款时回退为旧版条款 id） */
  section_id: number;
  /** 条款稳定标识：重新对比时据此合并记录，保证审阅备注不丢失 */
  section_key: string;
  diff_type: DiffType;
  summary: string;
  old_section_id: number | null;
  new_section_id: number | null;
  old_no: string;
  new_no: string;
  old_heading: string;
  new_heading: string;
  /** 旧版对应段落快照（打开结果时直接展示，不受后续编辑影响） */
  old_text: string;
  /** 新版对应段落快照 */
  new_text: string;
  old_hash: string;
  /** 审阅结论认准的新版内容指纹：内容变化后旧结论自动失效 */
  new_hash: string;
  created_at: string;
}
