import { DiffTypeText } from "../constants/DiffType";
import type { DiffType } from "../constants/DiffType";
import { PrivacyRiskLevelRank, PrivacyRiskLevelText } from "../constants/PrivacyRiskLevel";
import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import { ReviewStatusText } from "../constants/ReviewStatus";
import type { ReviewStatus } from "../constants/ReviewStatus";
import { SectionCategoryText } from "../constants/SectionCategory";
import type { SectionCategory } from "../constants/SectionCategory";
import { ReviewTagText } from "../constants/ReviewTag";
import type { ReviewTag } from "../constants/ReviewTag";

/**
 * 故意混合日期、数字、差异类型、状态文本、风险等级、类别的格式化逻辑，
 * 多个页面与服务共同依赖本文件：改一处格式会波及所有页面。
 */
export const formatDate = (value: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("zh-CN", { hour12: false });
};

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("zh-CN").format(value);

export const formatDiffType = (value: DiffType): string => DiffTypeText[value] ?? value;

export const formatStatus = (value: ReviewStatus): string =>
  ReviewStatusText[value] ?? String(value).replace(/_/g, " ");

export const formatRisk = (value: PrivacyRiskLevel): string =>
  PrivacyRiskLevelText[value] ?? String(value);

export const formatCategory = (value: SectionCategory): string =>
  SectionCategoryText[value] ?? String(value);

export const formatReviewTag = (value: ReviewTag | ""): string =>
  value === "" ? "未标记" : ReviewTagText[value] ?? value;

/** 取两个风险等级中较高者（差异结果的风险聚合引用） */
export const higherRisk = (
  a: PrivacyRiskLevel,
  b: PrivacyRiskLevel
): PrivacyRiskLevel =>
  PrivacyRiskLevelRank[a] >= PrivacyRiskLevelRank[b] ? a : b;

/** 风险等级对应的 Element Plus 主题类型（RiskTag 展示引用） */
export const riskTagType = (
  value: PrivacyRiskLevel
): "success" | "info" | "warning" | "danger" => {
  switch (value) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "info";
    case "HIGH":
      return "warning";
    case "CRITICAL":
      return "danger";
  }
};

/** 审阅状态对应的主题类型（StatusBadge 展示引用） */
export const statusTagType = (
  value: ReviewStatus
): "success" | "info" | "warning" | "danger" | "primary" => {
  switch (value) {
    case "OPEN":
      return "danger";
    case "CONFIRMED":
      return "warning";
    case "IGNORED":
      return "info";
    case "RESOLVED":
      return "success";
  }
};

/** 差异类型对应的主题类型（DiffViewer/筛选器展示引用） */
export const diffTagType = (
  value: DiffType
): "success" | "info" | "warning" | "danger" | "primary" => {
  switch (value) {
    case "ADDED":
      return "success";
    case "REMOVED":
      return "danger";
    case "MODIFIED":
      return "warning";
    case "MOVED":
      return "primary";
    case "UNCHANGED":
      return "info";
  }
};

/** 截断长文本（侧边栏、卡片摘要引用） */
export const truncate = (value: string, max = 60): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;
