import { DiffTypeText } from "../constants/DiffType";
import { PrivacyRiskLevelText } from "../constants/PrivacyRiskLevel";
import { ReviewStatusText } from "../constants/ReviewStatus";

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};
export const formatStatus = (value: string) => (ReviewStatusText as Record<string, string>)[value] ?? value.replace(/_/g, " ");
export const formatDiffType = (value: string) => (DiffTypeText as Record<string, string>)[value] ?? value;
export const formatRisk = (value: string) => (PrivacyRiskLevelText as Record<string, string>)[value] ?? value;
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const truncate = (value: string, length = 80) => (value.length > length ? `${value.slice(0, length)}…` : value);
export const nextId = (rows: Array<{ id: number }>) => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
export const nowIso = () => new Date().toISOString();

/** djb2 内容指纹：审阅结论认准所审新版内容，内容一变指纹即变 */
export const contentHash = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};
