import { defineStore } from "pinia";
import { listPolicySection, updatePolicySection } from "../api/PolicySection";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import type { PolicySection } from "../types/PolicySection";
import { logAction } from "../utils/logger";

export const usePolicySectionStore = defineStore("policySection", {
  state: () => ({ rows: [] as PolicySection[], loading: false, error: "" }),
  getters: {
    byDocument: (state) => (documentId: number) => state.rows.filter((row) => row.document_id === documentId)
  },
  actions: {
    async load() {
      this.loading = true;
      this.rows = await listPolicySection();
      this.loading = false;
    },
    /** 高风险条款标注等级，留下处理轨迹 */
    async setRiskLevel(id: number, riskLevel: PrivacyRiskLevel): Promise<boolean> {
      this.error = "";
      const section = this.rows.find((row) => row.id === id);
      if (!section) {
        this.error = ERROR_MESSAGES.DOCUMENT_NOT_FOUND;
        return false;
      }
      try {
        await updatePolicySection({ ...section, risk_level: riskLevel });
      } catch (error) {
        this.error = ERROR_MESSAGES[(error as Error).message] ?? (error as Error).message;
        return false;
      }
      logAction("PolicySection", "risk", { id, risk: riskLevel });
      section.risk_level = riskLevel;
      return true;
    }
  }
});
