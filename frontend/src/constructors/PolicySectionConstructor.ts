import type { PolicySection } from "../types/PolicySection";

/** 默认条款段落 */
export function createDefaultPolicySection(
  overrides: Partial<PolicySection> = {}
): PolicySection {
  return {
    id: 0,
    document_id: 0,
    section_no: "",
    heading: "",
    content: "",
    category: "GENERAL",
    risk_level: "LOW",
    risk_reason: "",
    order_path: [0],
    content_hash: "",
    ...overrides
  };
}

/** 条款编辑表单对象（风险标注页使用） */
export function createPolicySectionForm(
  section: PolicySection
): Pick<PolicySection, "risk_level" | "category" | "risk_reason"> {
  return {
    risk_level: section.risk_level,
    category: section.category,
    risk_reason: section.risk_reason
  };
}

/** API 响应对象 */
export function createPolicySectionResponse(row: PolicySection): PolicySection {
  return { ...row };
}
