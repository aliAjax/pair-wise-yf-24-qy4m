import type { ParsedSection } from "../hooks/usePolicyParser";
import type { PolicySection } from "../types/PolicySection";

export const createDefaultPolicySection = (overrides: Partial<PolicySection> = {}): PolicySection => ({
  id: 0,
  document_id: 0,
  section_no: "",
  heading: "",
  content: "",
  category: "其他",
  risk_level: "LOW",
  ...overrides
});

/** 解析结果落库：风险等级先按类目建议值预标，后续可人工调整 */
export const buildSectionFromParsed = (documentId: number, parsed: ParsedSection, id: number): PolicySection =>
  createDefaultPolicySection({
    id,
    document_id: documentId,
    section_no: parsed.section_no,
    heading: parsed.heading,
    content: parsed.content,
    category: parsed.category,
    risk_level: parsed.suggested_risk
  });

export const createPolicySectionForm = createDefaultPolicySection;
export const createPolicySectionResponse = createDefaultPolicySection;
