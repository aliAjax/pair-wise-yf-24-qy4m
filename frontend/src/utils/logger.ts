import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { LogAction, LogEntity } from "../constants/logTemplates";
import type { AuditLog } from "../types/AuditLog";
import { readStorage, writeStorage } from "./storage";

const NAMESPACE = "auditLogs";
const MAX_LOGS = 500;

function renderTemplate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`
  );
}

/**
 * 操作留档入口：所有写操作都必须调用 recordLog。
 * 模板集中在 constants/logTemplates.ts，新增字段时模板与调用处要一起改。
 */
export function recordLog<E extends LogEntity>(
  entity: E,
  action: LogAction<E>,
  params: Record<string, string | number> = {},
  detail = ""
): AuditLog {
  const template = (LOG_TEMPLATES[entity] as Record<string, string>)[action as string];
  const entry: AuditLog = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 999),
    entity,
    action: String(action),
    message: renderTemplate(template, params),
    detail,
    at: new Date().toISOString()
  };
  const rows = readStorage<AuditLog[]>(NAMESPACE, []);
  rows.unshift(entry);
  writeStorage(NAMESPACE, rows.slice(0, MAX_LOGS));
  // 同时在控制台留一条，方便本地排查
  console.info(`[${entity}.${String(action)}] ${entry.message}`);
  return entry;
}

export function listLogs(): AuditLog[] {
  return readStorage<AuditLog[]>(NAMESPACE, []);
}

export function clearLogs(): void {
  writeStorage<AuditLog[]>(NAMESPACE, []);
}
