import { LOG_TEMPLATES } from "../constants/logTemplates";

/**
 * 统一写操作日志：模板集中在 constants/logTemplates，
 * 所有 store / api 的写动作都经过这里输出。
 */
export function logAction(entity: keyof typeof LOG_TEMPLATES, action: string, detail: Record<string, string | number> = {}) {
  const group = LOG_TEMPLATES[entity] as Record<string, string>;
  const template = group?.[action] ?? `${entity}.${action}`;
  const message = template.replace(/\{(\w+)\}/g, (_, key: string) => String(detail[key] ?? "-"));
  console.info(`[policy-diff] ${message}`);
}
