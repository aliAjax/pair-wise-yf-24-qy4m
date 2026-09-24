/** 风险等级：低 / 中 / 高 / 严重 */
export const PrivacyRiskLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PrivacyRiskLevel = (typeof PrivacyRiskLevel)[number];

/** 风险等级中文文案（RiskTag、筛选器、导出摘要共同引用） */
export const PrivacyRiskLevelText: Record<PrivacyRiskLevel, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  CRITICAL: "严重"
};

/** 风险等级排序权重，取“较高风险”时引用 */
export const PrivacyRiskLevelRank: Record<PrivacyRiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

/** 需要强制人工审阅的风险等级（审阅清单筛选器引用） */
export const HighRiskLevels: PrivacyRiskLevel[] = ["HIGH", "CRITICAL"];

/** 风险等级列表筛选项 */
export const PrivacyRiskLevelOptions: Array<{ value: PrivacyRiskLevel; label: string }> =
  PrivacyRiskLevel.map((value) => ({ value, label: PrivacyRiskLevelText[value] }));
