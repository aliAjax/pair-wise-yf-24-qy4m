import { ERROR_CODES } from "../constants/errorCodes";
import { STORAGE_KEYS } from "../constants/storageKeys";
import type { PolicyDocument } from "../types/PolicyDocument";
import { logAction } from "../utils/logger";

const readRows = (): PolicyDocument[] => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.policyDocument);
    return cached === null ? [] : (JSON.parse(cached) as PolicyDocument[]);
  } catch {
    return [];
  }
};

const writeRows = (rows: PolicyDocument[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.policyDocument, JSON.stringify(rows));
  } catch {
    throw new Error(ERROR_CODES.STORAGE_WRITE_FAILED);
  }
};

export async function listPolicyDocument(): Promise<PolicyDocument[]> {
  return readRows();
}

export async function createPolicyDocument(payload: PolicyDocument): Promise<PolicyDocument> {
  const rows = readRows();
  rows.push(payload);
  writeRows(rows);
  logAction("PolicyDocument", "create", { title: payload.title, version: payload.version_label });
  return payload;
}

export async function updatePolicyDocument(payload: PolicyDocument): Promise<PolicyDocument> {
  const rows = readRows();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index < 0) throw new Error(ERROR_CODES.DOCUMENT_NOT_FOUND);
  const count = (() => {
    try {
      return (JSON.parse(payload.normalized_sections) as string[]).length;
    } catch {
      return 0;
    }
  })();
  rows[index] = payload;
  writeRows(rows);
  logAction("PolicyDocument", "update", { id: payload.id, count });
  return payload;
}

export async function deletePolicyDocument(id: number): Promise<void> {
  writeRows(readRows().filter((row) => row.id !== id));
  logAction("PolicyDocument", "remove", { id });
}
