import { defineStore } from "pinia";
import { createPolicyDocument, deletePolicyDocument, listPolicyDocument, updatePolicyDocument } from "../api/PolicyDocument";
import { deleteDiffResultsForDocument } from "../api/DiffResult";
import { deleteReviewNotesForDiffs, listReviewNote } from "../api/ReviewNote";
import { deleteSectionsForDocument, replaceSectionsForDocument } from "../api/PolicySection";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { buildImportedDocument, type PolicyDocumentForm } from "../constructors/PolicyDocumentConstructor";
import { buildSectionFromParsed } from "../constructors/PolicySectionConstructor";
import { parsePolicyText } from "../hooks/usePolicyParser";
import { seedDocuments } from "../mocks/seedData";
import type { PolicyDocument } from "../types/PolicyDocument";
import { nextId } from "../utils/formatters";
import { logAction } from "../utils/logger";
import { useDiffResultStore } from "./DiffResultStore";
import { usePolicySectionStore } from "./PolicySectionStore";
import { useReviewNoteStore } from "./ReviewNoteStore";

const toMessage = (error: unknown) => ERROR_MESSAGES[(error as Error).message] ?? (error as Error).message;

export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: () => ({ rows: [] as PolicyDocument[], loading: false, error: "" }),
  getters: {
    byId: (state) => (id: number) => state.rows.find((row) => row.id === id)
  },
  actions: {
    async load() {
      this.loading = true;
      this.rows = await listPolicyDocument();
      this.loading = false;
    },
    /** 首次启动：本地无数据时按真实导入流程写入示例文档 */
    async bootstrap() {
      await this.load();
      if (this.rows.length > 0) return;
      for (const seed of seedDocuments) {
        await this.importDocument(seed);
        logAction("PolicyDocument", "seed", { title: seed.title, version: seed.version_label });
      }
    },
    async importDocument(form: PolicyDocumentForm): Promise<PolicyDocument | null> {
      this.error = "";
      if (!form.title.trim() || !form.version_label.trim() || !form.raw_text.trim()) {
        this.error = ERROR_MESSAGES.VALIDATION_FAILED;
        return null;
      }
      const parsed = parsePolicyText(form.raw_text);
      if (parsed.length === 0) {
        this.error = ERROR_MESSAGES.SECTION_PARSE_EMPTY;
        return null;
      }
      const id = nextId(this.rows);
      const document = buildImportedDocument(form, id, parsed.map((section) => section.section_no));
      const sectionStore = usePolicySectionStore();
      let cursor = nextId(sectionStore.rows);
      const sections = parsed.map((section) => buildSectionFromParsed(id, section, cursor++));
      try {
        await createPolicyDocument(document);
        await replaceSectionsForDocument(id, sections);
      } catch (error) {
        this.error = toMessage(error);
        return null;
      }
      await this.load();
      await sectionStore.load();
      return document;
    },
    /** 更新文档文本并重新分段：新版内容变化后，相关审阅结论随重新对比自动失效 */
    async updateDocumentText(id: number, rawText: string): Promise<boolean> {
      this.error = "";
      const document = this.rows.find((row) => row.id === id);
      if (!document) {
        this.error = ERROR_MESSAGES.DOCUMENT_NOT_FOUND;
        return false;
      }
      const parsed = parsePolicyText(rawText);
      if (parsed.length === 0) {
        this.error = ERROR_MESSAGES.SECTION_PARSE_EMPTY;
        return false;
      }
      const sectionStore = usePolicySectionStore();
      let cursor = nextId(sectionStore.rows);
      const sections = parsed.map((section) => buildSectionFromParsed(id, section, cursor++));
      try {
        await updatePolicyDocument({ ...document, raw_text: rawText, normalized_sections: JSON.stringify(parsed.map((section) => section.section_no)) });
        await replaceSectionsForDocument(id, sections);
      } catch (error) {
        this.error = toMessage(error);
        return false;
      }
      await this.load();
      await sectionStore.load();
      return true;
    },
    async removeDocument(id: number) {
      this.error = "";
      const diffStore = useDiffResultStore();
      const noteStore = useReviewNoteStore();
      const diffIds = diffStore.rows.filter((row) => row.old_document_id === id || row.new_document_id === id).map((row) => row.id);
      try {
        await deleteReviewNotesForDiffs(diffIds);
        await deleteDiffResultsForDocument(id);
        await deleteSectionsForDocument(id);
        await deletePolicyDocument(id);
      } catch (error) {
        this.error = toMessage(error);
        return;
      }
      await this.load();
      await usePolicySectionStore().load();
      await diffStore.load();
      noteStore.rows = await listReviewNote();
    }
  }
});
