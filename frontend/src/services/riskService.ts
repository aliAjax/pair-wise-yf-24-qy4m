import type { PolicySection } from "../types/PolicySection";
import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import type { SectionCategory } from "../constants/SectionCategory";
import * as sectionApi from "../api/PolicySection";
import { recordLog } from "../utils/logger";
import { PrivacyRiskLevelText } from "../constants/PrivacyRiskLevel";
import { SectionCategoryText } from "../constants/SectionCategory";

/** 人工调整条款风险等级/类别，并留下处理记录 */
export async function annotateSection(
  section: PolicySection,
  patch: {
    risk_level?: PrivacyRiskLevel;
    category?: SectionCategory;
    risk_reason?: string;
  },
  reviewer = "当前审阅人"
): Promise<PolicySection> {
  const changedFields: string[] = [];
  const fromLevel = section.risk_level;
  if (patch.risk_level && patch.risk_level !== section.risk_level) changedFields.push("风险等级");
  if (patch.category && patch.category !== section.category) changedFields.push("类别");
  if (patch.risk_reason !== undefined && patch.risk_reason !== section.risk_reason) {
    changedFields.push("判定理由");
  }

  const updated: PolicySection = {
    ...section,
    risk_level: patch.risk_level ?? section.risk_level,
    category: patch.category ?? section.category,
    risk_reason:
      patch.risk_reason !== undefined && patch.risk_reason.trim()
        ? patch.risk_reason.trim()
        : section.risk_reason
  };
  const saved = await sectionApi.updatePolicySection(updated);

  if (fromLevel !== saved.risk_level) {
    recordLog("PolicySection", "STATUS_CHANGE", {
      sectionNo: saved.section_no,
      heading: saved.heading,
      fromLevel: PrivacyRiskLevelText[fromLevel],
      toLevel: PrivacyRiskLevelText[saved.risk_level],
      reason: `${reviewer} 人工设定：${SectionCategoryText[saved.category]}`
    });
  }
  recordLog("PolicySection", "UPDATE", {
    sectionNo: saved.section_no,
    heading: saved.heading,
    fields: changedFields.join("、") || "无变化字段"
  });
  return saved;
}
