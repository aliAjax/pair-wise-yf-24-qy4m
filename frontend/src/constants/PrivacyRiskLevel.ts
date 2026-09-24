export const PrivacyRiskLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PrivacyRiskLevel = (typeof PrivacyRiskLevel)[number];
export const PrivacyRiskLevelText: Record<PrivacyRiskLevel, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  CRITICAL: "严重"
};
