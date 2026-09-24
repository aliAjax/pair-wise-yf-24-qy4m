import { defineStore } from "pinia";
import type { ReviewNote } from "../types/ReviewNote";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewStatus } from "../constants/ReviewStatus";
import type { ReviewTag } from "../constants/ReviewTag";
import * as noteApi from "../api/ReviewNote";
import { addReviewNote, changeReviewStatus, updateReviewNoteContent } from "../services/reviewService";

interface NoteState {
  rows: ReviewNote[];
  /** 待办数量所认准的新版版本 id */
  scopeDocumentId: number | null;
  loading: boolean;
  error: string;
}

export const useReviewNoteStore = defineStore("reviewNote", {
  state: (): NoteState => ({ rows: [], scopeDocumentId: null, loading: false, error: "" }),
  getters: {
    /** 当前所审新版版本下的备注（待办统计只数这一部分） */
    scopedRows(state): ReviewNote[] {
      if (state.scopeDocumentId === null) return state.rows;
      return state.rows.filter((row) => row.new_document_id === state.scopeDocumentId);
    },
    openCount(): number {
      return this.scopedRows.filter((row) => row.status === "OPEN").length;
    },
    statusStats(): Record<ReviewStatus, number> {
      const stats: Record<ReviewStatus, number> = {
        OPEN: 0,
        CONFIRMED: 0,
        IGNORED: 0,
        RESOLVED: 0
      };
      this.scopedRows.forEach((row) => {
        stats[row.status] += 1;
      });
      return stats;
    },
    byDiffId: (state) => (diffResultId: number) =>
      state.rows
        .filter((row) => row.diff_result_id === diffResultId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },
  actions: {
    async load(scopeDocumentId?: number | null): Promise<void> {
      this.loading = true;
      try {
        this.rows = await noteApi.listReviewNote();
        if (scopeDocumentId !== undefined) this.scopeDocumentId = scopeDocumentId;
        this.error = "";
      } catch (error) {
        this.error = `审阅备注加载失败：${(error as Error).message}`;
      } finally {
        this.loading = false;
      }
    },
    setScope(documentId: number | null): void {
      this.scopeDocumentId = documentId;
    },
    async add(
      diff: DiffResult,
      draft: { tag: ReviewTag | ""; comment: string; reviewer: string }
    ): Promise<ReviewNote | null> {
      try {
        const note = await addReviewNote(diff, draft);
        this.rows.push(note);
        this.error = "";
        return note;
      } catch (error) {
        this.error = `备注创建失败：${(error as Error).message}`;
        return null;
      }
    },
    async changeStatus(
      note: ReviewNote,
      status: ReviewStatus,
      diff: DiffResult,
      draft: { tag?: ReviewTag | ""; comment?: string; reviewer?: string } = {}
    ): Promise<boolean> {
      try {
        const updated = await changeReviewStatus(note, status, diff, draft);
        const index = this.rows.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.rows[index] = updated;
        this.error = "";
        return true;
      } catch (error) {
        this.error = `状态流转失败：${(error as Error).message}`;
        return false;
      }
    },
    async updateContent(
      note: ReviewNote,
      draft: { tag?: ReviewTag | ""; comment?: string; reviewer?: string }
    ): Promise<boolean> {
      try {
        const updated = await updateReviewNoteContent(note, draft);
        const index = this.rows.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.rows[index] = updated;
        return true;
      } catch (error) {
        this.error = `备注更新失败：${(error as Error).message}`;
        return false;
      }
    }
  }
});
