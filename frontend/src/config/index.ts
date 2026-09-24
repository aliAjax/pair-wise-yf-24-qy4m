/**
 * 全局配置入口。
 * 新增配置时必须同步：frontend/.env.example、.env.d.ts（如需）、本文件、请求封装、日志模块调用处。
 */
export const APP_CONFIG = {
  title: import.meta.env.VITE_APP_TITLE ?? "隐私政策差异对比器",
  storagePrefix: (import.meta.env.VITE_STORAGE_PREFIX ?? "policy-diff") as string,
  apiBase: (import.meta.env.VITE_API_BASE ?? "/api") as string,
  frontendPort: 20112
} as const;

/** localStorage 键名集中生成（api 封装与日志模块共同引用） */
export function storageKey(namespace: string): string {
  return `${APP_CONFIG.storagePrefix}:${namespace}`;
}
