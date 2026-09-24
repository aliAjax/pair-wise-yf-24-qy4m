/** 操作留档：所有写操作都通过 logger 追加记录 */
export interface AuditLog {
  id: number;
  entity: "PolicyDocument" | "PolicySection" | "DiffResult" | "ReviewNote" | "Session";
  action: string;
  message: string;
  detail: string;
  at: string;
}
