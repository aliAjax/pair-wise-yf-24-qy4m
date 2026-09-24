import type { DiffType } from "../constants/DiffType";

/** 差异类型（枚举值定义在 constants/DiffType.ts） */
export type { DiffType };

/** 差异结果：驱动版本对比视图与审阅任务的基本单元 */
export interface DiffResult {
  id: number;
  old_document_id: number;
  new_document_id: number;
  /** 新版中对应的条款 id；REMOVED 时为 null */
  section_id: number | null;
  /** 旧版中对应的条款 id；ADDED 时为 null */
  old_section_id: number | null;
  diff_type: DiffType;
  /** 用于稳定关联审阅备注的匹配键（文档对 + 编号） */
  match_key: string;
  old_section_no: string;
  new_section_no: string;
  old_heading: string;
  new_heading: string;
  old_content: string;
  new_content: string;
  /** 排序位置（按新版编号顺序） */
  ordinal: number;
  summary: string;
  /** 生成差异时新版内容快照的指纹，用于判断已解决结论是否失效 */
  content_hash: string;
  created_at: string;
}

/** 差异结果上的精简快照，供展示组件使用 */
export interface DiffResultView {
  oldSectionNo: string;
  newSectionNo: string;
  oldHeading: string;
  newHeading: string;
}
