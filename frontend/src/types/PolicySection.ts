import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import type { SectionCategory } from "../constants/SectionCategory";

/** 风险等级（枚举值定义在 constants/PrivacyRiskLevel.ts） */
export type { PrivacyRiskLevel };

/** 条款类别（枚举值定义在 constants/SectionCategory.ts） */
export type { SectionCategory };

/** 条款段落：差异对比的最小单元 */
export interface PolicySection {
  id: number;
  document_id: number;
  /** 条款编号，如 3、3.1、附件一 */
  section_no: string;
  heading: string;
  content: string;
  category: SectionCategory;
  risk_level: PrivacyRiskLevel;
  /** 风险判定理由（命中的高风险条款关键词或“人工设定”） */
  risk_reason: string;
  /** 规范化后的纯数字编号序列，用于排序 */
  order_path: number[];
  /** heading + content 的内容指纹 */
  content_hash: string;
}
