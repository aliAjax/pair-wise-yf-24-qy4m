import { defineStore } from "pinia";
import type { ReviewSession } from "../types/ReviewSession";
import { getSession, setSession } from "../services/sessionService";
import type { PolicyDocument } from "../types/PolicyDocument";

/**
 * 审阅会话 store：保存“旧版 → 所审新版版本”。
 * 待处理数量、风险清单、对比结果均以该会话为准。
 */
export const useReviewSessionStore = defineStore("reviewSession", {
  state: (): ReviewSession => ({
    old_document_id: null,
    new_document_id: null,
    updated_at: ""
  }),
  actions: {
    load(): void {
      Object.assign(this, getSession());
    },
    select(oldDocument: PolicyDocument | null, newDocument: PolicyDocument | null): void {
      Object.assign(this, setSession(oldDocument, newDocument));
    },
    reset(): void {
      Object.assign(this, setSession(null, null));
    }
  }
});
