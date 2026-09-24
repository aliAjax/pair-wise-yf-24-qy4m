import { computed, ref, shallowRef, type Ref } from "vue";

/**
 * useLocalStorageState：通用本地列表状态 hook。
 * 负责分页；localStorage 的实际读写持久化在 api 层完成。
 */
export function useLocalStorageState<T>(source: Ref<T[]>, pageSizeValue = 8) {
  const page = ref(1);
  const pageSize = pageSizeValue;

  const pageRows = computed(() =>
    source.value.slice((page.value - 1) * pageSize, page.value * pageSize)
  );
  const maxPage = computed(() => Math.max(1, Math.ceil(source.value.length / pageSize)));

  const prevPage = () => {
    if (page.value > 1) page.value -= 1;
  };
  const nextPage = () => {
    if (page.value < maxPage.value) page.value += 1;
  };

  return { page, pageSize, pageRows, total: computed(() => source.value.length), maxPage, prevPage, nextPage };
}

/** 简易 memoize：key 变化时重新计算，否则复用上次结果（parser/diff 使用） */
export function useMemoize<T, K>(compute: (key: K) => T, resolveKey: () => K) {
  const state = shallowRef<{ key: K; value: T } | null>(null);
  return () => {
    const key = resolveKey();
    if (!state.value || state.value.key !== key) {
      state.value = { key, value: compute(key) };
    }
    return state.value.value;
  };
}
