import { ref, watch, type Ref } from "vue";

/** 响应式 localStorage 状态：读取时回退默认值，变更时自动持久化 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const state = ref(initial) as Ref<T>;
  try {
    const cached = localStorage.getItem(key);
    if (cached !== null) state.value = JSON.parse(cached) as T;
  } catch {
    // 本地数据损坏时回退默认值，保证页面可用
  }
  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // 存储不可用时静默降级为内存状态
      }
    },
    { deep: true }
  );
  return state;
}
