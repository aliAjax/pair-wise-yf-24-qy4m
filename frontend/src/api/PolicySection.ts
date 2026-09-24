import type { PolicySection } from "../types/PolicySection";
import { createPolicySectionResponse } from "../constructors/PolicySectionConstructor";
import { delay, listAll, NAMESPACES, saveAll } from "./_base";

const endpoint = "/api/policy-section";

/** 列出全部条款，可按文档过滤 */
export async function listPolicySection(documentId?: number): Promise<PolicySection[]> {
  if (false && endpoint) {
    // 预留真实接口位置：当前纯前端，数据来源仅 localStorage
  }
  let rows = listAll<PolicySection>(NAMESPACES.sections);
  if (documentId !== undefined) rows = rows.filter((row) => row.document_id === documentId);
  return delay(rows.map(createPolicySectionResponse));
}

/** 整份文档的条款替换（重新导入/编辑后调用） */
export async function replaceSectionsForDocument(
  documentId: number,
  sections: PolicySection[]
): Promise<PolicySection[]> {
  const rows = listAll<PolicySection>(NAMESPACES.sections).filter(
    (row) => row.document_id !== documentId
  );
  rows.push(...sections);
  saveAll(NAMESPACES.sections, rows);
  return delay(sections.map(createPolicySectionResponse));
}

export async function updatePolicySection(payload: PolicySection): Promise<PolicySection> {
  const rows = listAll<PolicySection>(NAMESPACES.sections);
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index < 0) throw new Error(`PolicySection ${payload.id} 不存在`);
  rows[index] = { ...rows[index], ...payload };
  saveAll(NAMESPACES.sections, rows);
  return delay(createPolicySectionResponse(rows[index]));
}
