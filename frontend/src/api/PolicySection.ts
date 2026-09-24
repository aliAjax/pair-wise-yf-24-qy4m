import { ERROR_CODES } from "../constants/errorCodes";
import { STORAGE_KEYS } from "../constants/storageKeys";
import type { PolicySection } from "../types/PolicySection";
import { logAction } from "../utils/logger";

const readRows = (): PolicySection[] => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.policySection);
    return cached === null ? [] : (JSON.parse(cached) as PolicySection[]);
  } catch {
    return [];
  }
};

const writeRows = (rows: PolicySection[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.policySection, JSON.stringify(rows));
  } catch {
    throw new Error(ERROR_CODES.STORAGE_WRITE_FAILED);
  }
};

export async function listPolicySection(): Promise<PolicySection[]> {
  return readRows();
}

/** 整文档替换条款：导入与重新解析共用 */
export async function replaceSectionsForDocument(documentId: number, sections: PolicySection[]): Promise<PolicySection[]> {
  writeRows([...readRows().filter((row) => row.document_id !== documentId), ...sections]);
  logAction("PolicySection", "create", { documentId, count: sections.length });
  return sections;
}

export async function updatePolicySection(payload: PolicySection): Promise<PolicySection> {
  const rows = readRows();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index < 0) throw new Error(ERROR_CODES.DOCUMENT_NOT_FOUND);
  rows[index] = payload;
  writeRows(rows);
  logAction("PolicySection", "update", { id: payload.id });
  return payload;
}

export async function deleteSectionsForDocument(documentId: number): Promise<void> {
  writeRows(readRows().filter((row) => row.document_id !== documentId));
}
