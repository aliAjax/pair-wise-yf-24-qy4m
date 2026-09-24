import { ERROR_CODES } from "../constants/errorCodes";
import { STORAGE_KEYS } from "../constants/storageKeys";
import type { ReviewNote } from "../types/ReviewNote";
import { logAction } from "../utils/logger";

const readRows = (): ReviewNote[] => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.reviewNote);
    return cached === null ? [] : (JSON.parse(cached) as ReviewNote[]);
  } catch {
    return [];
  }
};

const writeRows = (rows: ReviewNote[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.reviewNote, JSON.stringify(rows));
  } catch {
    throw new Error(ERROR_CODES.STORAGE_WRITE_FAILED);
  }
};

export async function listReviewNote(): Promise<ReviewNote[]> {
  return readRows();
}

/** 处理记录只增不改：状态流转通过追加新记录完成，旧记录留档 */
export async function createReviewNote(payload: ReviewNote): Promise<ReviewNote> {
  const rows = readRows();
  rows.push(payload);
  writeRows(rows);
  logAction("ReviewNote", "create", { diffId: payload.diff_result_id, status: payload.status });
  return payload;
}

export async function deleteReviewNotesForDiffs(diffResultIds: number[]): Promise<void> {
  writeRows(readRows().filter((row) => !diffResultIds.includes(row.diff_result_id)));
}
