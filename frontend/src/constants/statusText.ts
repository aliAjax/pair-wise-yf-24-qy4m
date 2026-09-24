import { DiffTypeText } from "./DiffType";
import type { DiffType } from "./DiffType";
import { PrivacyRiskLevelText } from "./PrivacyRiskLevel";
import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import { ReviewStatusText } from "./ReviewStatus";
import type { ReviewStatus } from "./ReviewStatus";
import { SectionCategoryText } from "./SectionCategory";
import type { SectionCategory } from "./SectionCategory";
import { ReviewTagText } from "./ReviewTag";
import type { ReviewTag } from "./ReviewTag";

/**
 * 集中状态文案，formatters 与展示组件共同依赖：
 * 新增枚举值时需要同步常量、类型、此处、formatters、筛选器与详情展示。
 */
export const STATUS_TEXT = {
  DiffType: DiffTypeText,
  PrivacyRiskLevel: PrivacyRiskLevelText,
  ReviewStatus: ReviewStatusText,
  SectionCategory: SectionCategoryText,
  ReviewTag: ReviewTagText
};

export type StatusKind =
  | { kind: "DiffType"; value: DiffType }
  | { kind: "PrivacyRiskLevel"; value: PrivacyRiskLevel }
  | { kind: "ReviewStatus"; value: ReviewStatus }
  | { kind: "SectionCategory"; value: SectionCategory }
  | { kind: "ReviewTag"; value: ReviewTag };
