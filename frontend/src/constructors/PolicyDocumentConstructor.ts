import type { PolicyDocument, PolicyDocumentForm } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import { hashContent } from "../utils/hash";

/** 默认政策文档（新建表单初始结构，页面/store 不得散写字段） */
export function createDefaultPolicyDocument(
  overrides: Partial<PolicyDocument> = {}
): PolicyDocument {
  return {
    id: 0,
    title: "",
    version_label: "",
    raw_text: "",
    normalized_sections: "[]",
    imported_at: "",
    content_hash: "",
    ...overrides
  };
}

/** 导入表单对象 */
export function createPolicyDocumentForm(
  overrides: Partial<PolicyDocumentForm> = {}
): PolicyDocumentForm {
  return {
    title: "",
    version_label: "",
    raw_text: "",
    ...overrides
  };
}

/** 由表单 + 解析出的条款构造持久化对象（factory） */
export function createPolicyDocumentFromForm(
  form: PolicyDocumentForm,
  sections: PolicySection[],
  id: number,
  importedAt: string
): PolicyDocument {
  return createDefaultPolicyDocument({
    id,
    title: form.title.trim(),
    version_label: form.version_label.trim(),
    raw_text: form.raw_text,
    normalized_sections: JSON.stringify(sections),
    imported_at: importedAt,
    content_hash: hashContent(sections.map((s) => s.content_hash).join("|"))
  });
}

/** 响应对象（API 层出口使用，隔离存储结构与页面结构） */
export function createPolicyDocumentResponse(row: PolicyDocument): PolicyDocument {
  return { ...row };
}

/** 反序列化条款快照 */
export function parseDocumentSections(document: PolicyDocument): PolicySection[] {
  try {
    return JSON.parse(document.normalized_sections) as PolicySection[];
  } catch {
    return [];
  }
}
