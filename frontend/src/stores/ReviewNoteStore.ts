import { defineStore } from "pinia";
import { createReviewNote, listReviewNote } from "../api/ReviewNote";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import type { ReviewStatus } from "../constants/ReviewStatus";
import { buildReviewNote, type ReviewNoteForm } from "../constructors/ReviewNoteConstructor";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";
import { nextId } from "../utils/formatters";

export const useReviewNoteStore = defineStore("reviewNote", {
  state: () => ({ rows: [] as ReviewNote[], loading: false, error: "" }),
  getters: {
    /** 某条差异的处理记录，新的在前 */
    notesForDiff: (state) => (diffResultId: number) =>
      state.rows.filter((row) => row.diff_result_id === diffResultId).sort((a, b) => b.id - a.id)
  },
  actions: {
    async load() {
      this.loading = true;
      this.rows = await listReviewNote();
      this.loading = false;
    },
    /**
     * 有效状态：只认与当前新版内容指纹一致的最新结论；
     * 指纹对不上（新版又改过）则一律回到待处理，旧记录仍在留档列表中。
     */
    effectiveStatus(diff: DiffResult): ReviewStatus {
      const current = this.rows
        .filter((row) => row.diff_result_id === diff.id && row.content_hash === diff.new_hash)
        .sort((a, b) => b.id - a.id)[0];
      return current?.status ?? "OPEN";
    },
    /** 记录是否为历史留档（所审内容已被更新版取代） */
    isArchived(note: ReviewNote, diff: DiffResult): boolean {
      return note.content_hash !== diff.new_hash;
    },
    /** 待办数量：未变更条款无需处理，其余看有效状态 */
    todoCount(diffs: DiffResult[]): number {
      return diffs.filter((diff) => diff.diff_type !== "UNCHANGED" && this.effectiveStatus(diff) === "OPEN").length;
    },
    async addNote(form: ReviewNoteForm, diff: DiffResult): Promise<ReviewNote | null> {
      this.error = "";
      if (!form.comment.trim()) {
        this.error = ERROR_MESSAGES.NOTE_COMMENT_EMPTY;
        return null;
      }
      const note = buildReviewNote(form, nextId(this.rows), diff.new_hash);
      try {
        await createReviewNote(note);
      } catch (error) {
        this.error = ERROR_MESSAGES[(error as Error).message] ?? (error as Error).message;
        return null;
      }
      await this.load();
      return note;
    }
  }
});
