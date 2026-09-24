import { defineStore } from "pinia";
import type { PolicySection } from "../types/PolicySection";
import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import type { SectionCategory } from "../constants/SectionCategory";
import * as sectionApi from "../api/PolicySection";
import { annotateSection } from "../services/riskService";
import { HighRiskCategories } from "../constants/SectionCategory";

interface SectionState {
  rows: PolicySection[];
  loading: boolean;
  error: string;
}

export const usePolicySectionStore = defineStore("policySection", {
  state: (): SectionState => ({ rows: [], loading: false, error: "" }),
  getters: {
    byDocument: (state) => (documentId: number) =>
      state.rows
        .filter((row) => row.document_id === documentId)
        .sort((a, b) =>
          a.order_path.join(".").localeCompare(b.order_path.join("."), undefined, {
            numeric: true
          })
        ),
    /** 高风险清单：数据收集/共享/保存期限条款，且风险等级为高或严重 */
    highRiskRows: (state) =>
      state.rows.filter(
        (row) =>
          (HighRiskCategories.includes(row.category) ||
            row.risk_level === "HIGH" ||
            row.risk_level === "CRITICAL")
      ),
    riskStats: (state) => {
      const stats: Record<PrivacyRiskLevel, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      };
      state.rows.forEach((row) => {
        stats[row.risk_level] += 1;
      });
      return stats;
    }
  },
  actions: {
    async load(): Promise<void> {
      this.loading = true;
      try {
        this.rows = await sectionApi.listPolicySection();
        this.error = "";
      } catch (error) {
        this.error = `条款加载失败：${(error as Error).message}`;
      } finally {
        this.loading = false;
      }
    },
    replaceFor(documentId: number, sections: PolicySection[]): void {
      this.rows = this.rows.filter((row) => row.document_id !== documentId);
      this.rows.push(...sections);
    },
    async annotate(
      section: PolicySection,
      patch: { risk_level?: PrivacyRiskLevel; category?: SectionCategory; risk_reason?: string },
      reviewer?: string
    ): Promise<boolean> {
      try {
        const updated = await annotateSection(section, patch, reviewer);
        const index = this.rows.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.rows[index] = updated;
        this.error = "";
        return true;
      } catch (error) {
        this.error = `风险标注失败：${(error as Error).message}`;
        return false;
      }
    }
  }
});
