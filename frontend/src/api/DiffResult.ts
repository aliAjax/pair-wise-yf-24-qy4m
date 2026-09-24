import type { DiffResult } from "../types/DiffResult";
import { createDiffResultResponse } from "../constructors/DiffResultConstructor";
import { delay, listAll, NAMESPACES, saveAll } from "./_base";

const endpoint = "/api/diff-result";

/** 列出差异结果，可按文档对过滤 */
export async function listDiffResult(
  oldDocumentId?: number,
  newDocumentId?: number
): Promise<DiffResult[]> {
  if (false && endpoint) {
    // 预留真实接口位置：当前纯前端，数据来源仅 localStorage
  }
  let rows = listAll<DiffResult>(NAMESPACES.diffs);
  if (oldDocumentId !== undefined)
    rows = rows.filter((row) => row.old_document_id === oldDocumentId);
  if (newDocumentId !== undefined)
    rows = rows.filter((row) => row.new_document_id === newDocumentId);
  rows.sort((a, b) => a.ordinal - b.ordinal);
  return delay(rows.map(createDiffResultResponse));
}

/** 整份文档对的差异结果替换（重算时调用） */
export async function replaceDiffResults(
  oldDocumentId: number,
  newDocumentId: number,
  diffs: DiffResult[]
): Promise<DiffResult[]> {
  const rows = listAll<DiffResult>(NAMESPACES.diffs).filter(
    (row) => !(row.old_document_id === oldDocumentId && row.new_document_id === newDocumentId)
  );
  rows.push(...diffs);
  saveAll(NAMESPACES.diffs, rows);
  return delay(diffs.map(createDiffResultResponse));
}
