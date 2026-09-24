import type { PolicyDocument, PolicyDocumentForm } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import {
  createPolicyDocumentFromForm,
  parseDocumentSections
} from "../constructors/PolicyDocumentConstructor";
import { parsePolicyText, toSectionDraft } from "../hooks/usePolicyParser";
import { hashContent } from "../utils/hash";
import { PolicyDiffError } from "../utils/errors";
import * as documentApi from "../api/PolicyDocument";
import * as sectionApi from "../api/PolicySection";
import { listAll, NAMESPACES, nextId, saveAll } from "../api/_base";
import { recordLog } from "../utils/logger";

/** 校验导入表单（service 层校验，store/controller 层再包装） */
export function validateDocumentForm(form: PolicyDocumentForm): void {
  if (!form.title.trim()) {
    throw new PolicyDiffError("VALIDATION_FAILED", { field: "标题" });
  }
  if (!form.version_label.trim()) {
    throw new PolicyDiffError("VALIDATION_FAILED", { field: "版本号" });
  }
  if (form.raw_text.trim().length < 10) {
    throw new PolicyDiffError("VALIDATION_FAILED", { field: "政策正文（内容过短）" });
  }
  // 解析失败会抛 PARSE_FAILED
  parsePolicyText(form.raw_text);
}

/** 从粘贴文本创建文档：自动分段 + 自动风险标注 */
export async function importDocument(
  form: PolicyDocumentForm
): Promise<{ document: PolicyDocument; sections: PolicySection[] }> {
  validateDocumentForm(form);
  const existingSections = listAll<PolicySection>(NAMESPACES.sections);
  const documentId = nextId(listAll<PolicyDocument>(NAMESPACES.documents));
  let sectionId = nextId(existingSections);

  const sections = parsePolicyText(form.raw_text).map((parsed) =>
    toSectionDraft(documentId, parsed, sectionId++)
  );
  const document = createPolicyDocumentFromForm(
    form,
    sections,
    documentId,
    new Date().toISOString()
  );

  const created = await documentApi.createPolicyDocument(document);
  await sectionApi.replaceSectionsForDocument(created.id, sections);

  recordLog("PolicyDocument", "CREATE", {
    title: created.title,
    version: created.version_label,
    sectionCount: sections.length
  });
  recordLog("PolicySection", "CREATE", {
    documentId: created.id,
    sectionNo: "*",
    heading: `${sections.length} 个条款`
  });
  return { document: created, sections };
}

/** 重新粘贴文本更新版本（内容变化后原已解决结论将由对比服务判定回退） */
export async function reimportDocument(
  documentId: number,
  form: PolicyDocumentForm
): Promise<{ document: PolicyDocument; sections: PolicySection[] }> {
  validateDocumentForm(form);
  const documents = await documentApi.listPolicyDocument();
  const old = documents.find((row) => row.id === documentId);
  if (!old) throw new PolicyDiffError("NOT_FOUND", { entity: "PolicyDocument", id: documentId });

  let sectionId = nextId(listAll<PolicySection>(NAMESPACES.sections));
  const sections = parsePolicyText(form.raw_text).map((parsed) =>
    toSectionDraft(documentId, parsed, sectionId++)
  );
  const updated: PolicyDocument = {
    ...old,
    title: form.title.trim(),
    version_label: form.version_label.trim(),
    raw_text: form.raw_text,
    normalized_sections: JSON.stringify(sections),
    content_hash: hashContent(sections.map((s) => s.content_hash).join("|"))
  };
  await documentApi.updatePolicyDocument(updated);
  await sectionApi.replaceSectionsForDocument(documentId, sections);

  recordLog("PolicySection", "CREATE", {
    documentId,
    sectionNo: "*",
    heading: `重新分段 ${sections.length} 个条款`
  });
  recordLog("PolicyDocument", "UPDATE", {
    id: documentId,
    title: updated.title,
    version: updated.version_label,
    fields: "正文/条款快照"
  });
  return { document: updated, sections };
}

export async function removeDocument(documentId: number): Promise<void> {
  const sections = await sectionApi.listPolicySection(documentId);
  await documentApi.deletePolicyDocument(documentId);
  // 对比结果依赖文档存在：同步清理该文档的条款、差异结果与审阅备注
  saveAll(
    NAMESPACES.sections,
    listAll<PolicySection>(NAMESPACES.sections).filter((row) => row.document_id !== documentId)
  );
  saveAll(
    NAMESPACES.diffs,
    listAll<import("../types/DiffResult").DiffResult>(NAMESPACES.diffs).filter(
      (row) => row.old_document_id !== documentId && row.new_document_id !== documentId
    )
  );
  saveAll(
    NAMESPACES.notes,
    listAll<import("../types/ReviewNote").ReviewNote>(NAMESPACES.notes).filter(
      (row) => row.old_document_id !== documentId && row.new_document_id !== documentId
    )
  );
  recordLog("PolicyDocument", "STATUS_CHANGE", {
    id: documentId,
    sectionCount: sections.length
  });
}

export function sectionsOf(document: PolicyDocument): PolicySection[] {
  return parseDocumentSections(document);
}
