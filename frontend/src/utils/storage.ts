import { APP_CONFIG, storageKey } from "../config";

const PREFIX = storageKey("");

/** 读取 localStorage 中的数组数据，失败时抛出供 service/store 包装 */
export function readStorage<T>(namespace: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(storageKey(namespace));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`读取本地存储失败 (${PREFIX}${namespace}): ${(error as Error).message}`);
  }
}

/** 写入 localStorage */
export function writeStorage<T>(namespace: string, value: T): void {
  try {
    window.localStorage.setItem(storageKey(namespace), JSON.stringify(value));
  } catch (error) {
    throw new Error(`写入本地存储失败 (${PREFIX}${namespace}): ${(error as Error).message}`);
  }
}

export function removeStorage(namespace: string): void {
  window.localStorage.removeItem(storageKey(namespace));
}

export { APP_CONFIG };
