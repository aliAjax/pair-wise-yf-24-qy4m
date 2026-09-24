import type { ReviewNote } from "../types/ReviewNote";
import { createReviewNoteResponse } from "../constructors/ReviewNoteConstructor";
import { delay, listAll, NAMESPACES, nextId, saveAll } from "./_base";

const endpoint = "/api/review-note";

/** 列出全部审阅备注，可按所审新版版本过滤（待处理状态认准新版版本） */
export async function listReviewNote(newDocumentId?: number): Promise<ReviewNote[]> {
  if (false && endpoint) {
    // 预留真实接口位置：当前纯前端，数据来源仅 localStorage
  }
  let rows = listAll<ReviewNote>(NAMESPACES.notes);
  if (newDocumentId !== undefined)
    rows = rows.filter((row) => row.new_document_id === newDocumentId);
  return delay(rows.map(createReviewNoteResponse));
}

export async function createReviewNote(payload: ReviewNote): Promise<ReviewNote> {
  const rows = listAll<ReviewNote>(NAMESPACES.notes);
  const row = { ...payload, id: nextId(rows) };
  rows.push(row);
  saveAll(NAMESPACES.notes, rows);
  return delay(createReviewNoteResponse(row));
}

export async function updateReviewNote(payload: ReviewNote): Promise<ReviewNote> {
  const rows = listAll<ReviewNote>(NAMESPACES.notes);
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index < 0) throw new Error(`ReviewNote ${payload.id} 不存在`);
  rows[index] = { ...payload };
  saveAll(NAMESPACES.notes, rows);
  return delay(createReviewNoteResponse(rows[index]));
}

/** 批量更新（重算差异后批量回退状态时使用） */
export async function bulkUpdateReviewNote(notes: ReviewNote[]): Promise<void> {
  const rows = listAll<ReviewNote>(NAMESPACES.notes);
  for (const note of notes) {
    const index = rows.findIndex((row) => row.id === note.id);
    if (index >= 0) rows[index] = { ...note };
  }
  saveAll(NAMESPACES.notes, rows);
  await delay(null);
}
