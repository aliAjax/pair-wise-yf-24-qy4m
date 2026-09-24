import type { PolicyDocument } from "../types/PolicyDocument";
import { nowIso } from "../utils/formatters";

export interface PolicyDocumentForm {
  title: string;
  version_label: string;
  raw_text: string;
}

export const createDefaultPolicyDocument = (overrides: Partial<PolicyDocument> = {}): PolicyDocument => ({
  id: 0,
  title: "",
  version_label: "",
  raw_text: "",
  normalized_sections: "[]",
  imported_at: nowIso(),
  ...overrides
});

export const createPolicyDocumentForm = (): PolicyDocumentForm => ({
  title: "",
  version_label: "",
  raw_text: ""
});

export const buildImportedDocument = (form: PolicyDocumentForm, id: number, sectionNos: string[]): PolicyDocument =>
  createDefaultPolicyDocument({
    id,
    title: form.title.trim(),
    version_label: form.version_label.trim(),
    raw_text: form.raw_text,
    normalized_sections: JSON.stringify(sectionNos),
    imported_at: nowIso()
  });

export const createPolicyDocumentResponse = createDefaultPolicyDocument;
