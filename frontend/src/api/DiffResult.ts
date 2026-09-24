import { ERROR_CODES } from "../constants/errorCodes";
import { STORAGE_KEYS } from "../constants/storageKeys";
import type { DiffResult } from "../types/DiffResult";
import { logAction } from "../utils/logger";

const readRows = (): DiffResult[] => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.diffResult);
    return cached === null ? [] : (JSON.parse(cached) as DiffResult[]);
  } catch {
    return [];
  }
};

const writeRows = (rows: DiffResult[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.diffResult, JSON.stringify(rows));
  } catch {
    throw new Error(ERROR_CODES.STORAGE_WRITE_FAILED);
  }
};

export async function listDiffResult(): Promise<DiffResult[]> {
  return readRows();
}

/** 整组替换某次对比的差异记录：store 已按 section_key 合并好 id */
export async function replaceDiffResultsForPair(oldDocumentId: number, newDocumentId: number, rows: DiffResult[]): Promise<DiffResult[]> {
  const rest = readRows().filter((row) => !(row.old_document_id === oldDocumentId && row.new_document_id === newDocumentId));
  writeRows([...rest, ...rows]);
  logAction("DiffResult", "update", { oldId: oldDocumentId, newId: newDocumentId, count: rows.length });
  return rows;
}

export async function deleteDiffResultsForDocument(documentId: number): Promise<void> {
  writeRows(readRows().filter((row) => row.old_document_id !== documentId && row.new_document_id !== documentId));
}
