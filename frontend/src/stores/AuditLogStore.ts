import { defineStore } from "pinia";
import type { AuditLog } from "../types/AuditLog";
import { listLogs, clearLogs } from "../utils/logger";

/** 处理记录（操作留档）store：风险标注、状态流转全部在此可追溯 */
export const useAuditLogStore = defineStore("auditLog", {
  state: () => ({
    rows: [] as AuditLog[]
  }),
  getters: {
    recent: (state) => (limit = 20) => state.rows.slice(0, limit)
  },
  actions: {
    load(): void {
      this.rows = listLogs();
    },
    refresh(): void {
      this.rows = listLogs();
    },
    clear(): void {
      clearLogs();
      this.rows = [];
    }
  }
});
