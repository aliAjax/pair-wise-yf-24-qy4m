import { defineStore } from "pinia";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicyDocumentForm } from "../types/PolicyDocument";
import * as documentApi from "../api/PolicyDocument";
import { importDocument, reimportDocument, removeDocument } from "../services/documentService";
import { PolicyDiffError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";

interface DocumentState {
  rows: PolicyDocument[];
  loading: boolean;
  error: string;
}

export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: (): DocumentState => ({ rows: [], loading: false, error: "" }),
  getters: {
    byId: (state) => (id: number | null) =>
      id === null ? undefined : state.rows.find((row) => row.id === id),
    versionOptions: (state) =>
      state.rows.map((row) => ({
        value: row.id,
        label: `${row.title}（${row.version_label}）`
      }))
  },
  actions: {
    /** controller/store 层包装：把 service 异常转为页面可读消息 */
    setError(error: unknown): string {
      this.error =
        error instanceof PolicyDiffError
          ? error.message
          : `文档操作失败：${(error as Error).message ?? ERROR_CODES.STORAGE_UNAVAILABLE}`;
      return this.error;
    },
    async load(): Promise<void> {
      this.loading = true;
      try {
        this.rows = await documentApi.listPolicyDocument();
        this.error = "";
      } catch (error) {
        this.setError(error);
      } finally {
        this.loading = false;
      }
    },
    async importDocument(form: PolicyDocumentForm): Promise<PolicyDocument | null> {
      try {
        const result = await importDocument(form);
        this.rows.push(result.document);
        this.error = "";
        return result.document;
      } catch (error) {
        this.setError(error);
        return null;
      }
    },
    async reimport(id: number, form: PolicyDocumentForm): Promise<boolean> {
      try {
        const result = await reimportDocument(id, form);
        const index = this.rows.findIndex((row) => row.id === id);
        if (index >= 0) this.rows[index] = result.document;
        this.error = "";
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    },
    async remove(id: number): Promise<boolean> {
      try {
        await removeDocument(id);
        this.rows = this.rows.filter((row) => row.id !== id);
        this.error = "";
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      }
    }
  }
});
