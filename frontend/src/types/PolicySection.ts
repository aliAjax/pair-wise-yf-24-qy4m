import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";

export interface PolicySection {
  id: number;
  document_id: number;
  section_no: string;
  heading: string;
  content: string;
  category: string;
  risk_level: PrivacyRiskLevel;
}
