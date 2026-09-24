import { defineStore } from "pinia";
import { listDiffResult, replaceDiffResultsForPair } from "../api/DiffResult";
import { DiffType } from "../constants/DiffType";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { buildDiffResultFromPair } from "../constructors/DiffResultConstructor";
import { computeSectionDiff } from "../hooks/useTextDiff";
import type { DiffResult } from "../types/DiffResult";
import { nextId } from "../utils/formatters";
import { logAction } from "../utils/logger";
import { usePolicySectionStore } from "./PolicySectionStore";
import { useReviewNoteStore } from "./ReviewNoteStore";

interface ComparePair {
  oldId: number | null;
  newId: number | null;
}

export const useDiffResultStore = defineStore("diffResult", {
  state: () => ({ rows: [] as DiffResult[], loading: false, error: "", pair: { oldId: null, newId: null } as ComparePair }),
  getters: {
    /** 当前对比组的全部差异记录 */
    pairRows: (state) => {
      if (state.pair.oldId === null || state.pair.newId === null) return [];
      return state.rows
        .filter((row) => row.old_document_id === state.pair.oldId && row.new_document_id === state.pair.newId)
        .sort((a, b) => a.id - b.id);
    },
    /** 各差异类型数量，驱动统计卡片与过滤器 */
    typeCounts(): Record<string, number> {
      const counts: Record<string, number> = Object.fromEntries(DiffType.map((type) => [type, 0]));
      for (const row of this.pairRows) counts[row.diff_type] = (counts[row.diff_type] ?? 0) + 1;
      return counts;
    }
  },
  actions: {
    async load() {
      this.loading = true;
      this.rows = await listDiffResult();
      this.loading = false;
    },
    /**
     * 运行/重新运行对比：按 section_key 合并历史记录，
     * 新版内容指纹变化时，指向旧指纹的审阅结论自动回到待处理（旧记录留档）。
     */
    async runComparison(oldId: number, newId: number): Promise<boolean> {
      this.error = "";
      if (!oldId || !newId || oldId === newId) {
        this.error = ERROR_MESSAGES.DIFF_PAIR_MISSING;
        return false;
      }
      const sectionStore = usePolicySectionStore();
      const oldSections = sectionStore.byDocument(oldId);
      const newSections = sectionStore.byDocument(newId);
      if (oldSections.length === 0 || newSections.length === 0) {
        this.error = ERROR_MESSAGES.SECTION_PARSE_EMPTY;
        return false;
      }
      const pairs = computeSectionDiff(oldSections, newSections);
      const existing = this.rows.filter((row) => row.old_document_id === oldId && row.new_document_id === newId);
      let cursor = nextId(this.rows);
      const merged = pairs.map((pair) => {
        const prev = existing.find((row) => row.section_key === pair.key);
        const built = buildDiffResultFromPair(pair, oldId, newId, prev ? prev.id : cursor++);
        if (prev) built.created_at = prev.created_at;
        return { built, prev };
      });
      const noteStore = useReviewNoteStore();
      for (const { built, prev } of merged) {
        if (!prev || prev.new_hash === built.new_hash) continue;
        const hadConclusion = noteStore.rows.some(
          (note) => note.diff_result_id === built.id && note.content_hash === prev.new_hash && note.status !== "OPEN"
        );
        if (hadConclusion) logAction("ReviewNote", "reopen", { diffId: built.id });
      }
      try {
        await replaceDiffResultsForPair(oldId, newId, merged.map((entry) => entry.built));
      } catch (error) {
        this.error = ERROR_MESSAGES[(error as Error).message] ?? (error as Error).message;
        return false;
      }
      this.pair = { oldId, newId };
      await this.load();
      logAction("DiffResult", "create", { oldId, newId, count: merged.length });
      return true;
    }
  }
});
