import { defineStore } from "pinia";
import type { DiffResult } from "../types/DiffResult";
import type { PolicyDocument } from "../types/PolicyDocument";
import * as diffApi from "../api/DiffResult";
import { computePairDiff } from "../services/comparisonService";

interface DiffState {
  rows: DiffResult[];
  oldDocumentId: number | null;
  newDocumentId: number | null;
  loading: boolean;
  computing: boolean;
  lastReopenedIds: number[];
  error: string;
}

export const useDiffResultStore = defineStore("diffResult", {
  state: (): DiffState => ({
    rows: [],
    oldDocumentId: null,
    newDocumentId: null,
    loading: false,
    computing: false,
    lastReopenedIds: [],
    error: ""
  }),
  getters: {
    changedRows: (state) => state.rows.filter((row) => row.diff_type !== "UNCHANGED"),
    diffStats: (state) => {
      const stats = { ADDED: 0, REMOVED: 0, MODIFIED: 0, MOVED: 0, UNCHANGED: 0 } as Record<
        DiffResult["diff_type"],
        number
      >;
      state.rows.forEach((row) => {
        stats[row.diff_type] += 1;
      });
      return stats;
    },
    byMatchKey: (state) => (matchKey: string) =>
      state.rows.find((row) => row.match_key === matchKey)
  },
  actions: {
    /** 打开对比结果：按文档对加载已持久化的差异 */
    async loadPair(oldDocumentId: number | null, newDocumentId: number | null): Promise<void> {
      this.oldDocumentId = oldDocumentId;
      this.newDocumentId = newDocumentId;
      this.lastReopenedIds = [];
      if (oldDocumentId === null || newDocumentId === null) {
        this.rows = [];
        return;
      }
      this.loading = true;
      try {
        this.rows = await diffApi.listDiffResult(oldDocumentId, newDocumentId);
        this.error = "";
      } catch (error) {
        this.error = `差异结果加载失败：${(error as Error).message}`;
      } finally {
        this.loading = false;
      }
    },
    /**
     * 重新计算两版差异。
     * 导入/重新粘贴后调用；新版内容变化会让原 RESOLVED 备注回到待处理。
     */
    async recompute(oldDocument: PolicyDocument, newDocument: PolicyDocument): Promise<boolean> {
      this.computing = true;
      try {
        const result = await computePairDiff(oldDocument, newDocument);
        this.rows = result.diffs;
        this.oldDocumentId = oldDocument.id;
        this.newDocumentId = newDocument.id;
        this.lastReopenedIds = result.reopened.map((note) => note.id);
        this.error = "";
        return true;
      } catch (error) {
        this.error =
          error instanceof Error && "message" in error
            ? `差异计算失败：${(error as Error).message}`
            : "差异计算失败";
        return false;
      } finally {
        this.computing = false;
      }
    }
  }
});
