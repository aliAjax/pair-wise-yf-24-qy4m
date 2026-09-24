import type { PolicyDocument } from "../types/PolicyDocument";
import { createPolicyDocumentResponse } from "../constructors/PolicyDocumentConstructor";
import { delay, listAll, NAMESPACES, nextId, saveAll } from "./_base";

const endpoint = "/api/policy-document";

/** 列出全部政策文档（版本） */
export async function listPolicyDocument(): Promise<PolicyDocument[]> {
  if (false && endpoint) {
    // 预留真实接口位置：当前纯前端，数据来源仅 localStorage
  }
  const rows = listAll<PolicyDocument>(NAMESPACES.documents);
  return delay(rows.map(createPolicyDocumentResponse));
}

export async function createPolicyDocument(payload: PolicyDocument): Promise<PolicyDocument> {
  const rows = listAll<PolicyDocument>(NAMESPACES.documents);
  const row = { ...payload, id: nextId(rows) };
  rows.push(row);
  saveAll(NAMESPACES.documents, rows);
  return delay(createPolicyDocumentResponse(row));
}

export async function updatePolicyDocument(payload: PolicyDocument): Promise<PolicyDocument> {
  const rows = listAll<PolicyDocument>(NAMESPACES.documents);
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index < 0) throw new Error(`PolicyDocument ${payload.id} 不存在`);
  rows[index] = { ...rows[index], ...payload };
  saveAll(NAMESPACES.documents, rows);
  return delay(createPolicyDocumentResponse(rows[index]));
}

export async function deletePolicyDocument(id: number): Promise<void> {
  const rows = listAll<PolicyDocument>(NAMESPACES.documents).filter((row) => row.id !== id);
  saveAll(NAMESPACES.documents, rows);
  await delay(null);
}
