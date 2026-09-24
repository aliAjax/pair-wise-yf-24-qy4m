import { computed, type Ref } from "vue";
import { useMemoize } from "./useLocalStorageState";

/** 差异片段：equal 公共、added 新版新增、removed 旧版删除 */
export type DiffSegmentType = "equal" | "added" | "removed";
export interface DiffSegment {
  type: DiffSegmentType;
  text: string;
}

/** 拆句：保留标点，中文/英文按词与句读切分（需覆盖 Unicode 汉字） */
function tokenize(text: string): string[] {
  if (!text) return [];
  const tokens = text.match(
    /[\p{L}\p{N}_'-]+|\s+|[，。；！？、：（）“”‘’\n.,;:!?"'()]/gu
  );
  return tokens ?? [text];
}

/** 字符级 LCS（用于改写句子内部高亮） */
function charLevelDiff(oldText: string, newText: string): DiffSegment[] {
  const a = [...oldText];
  const b = [...newText];
  const dp: Uint16Array[] = Array.from({ length: a.length + 1 }, () =>
    new Uint16Array(b.length + 1)
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const segments: DiffSegment[] = [];
  const push = (type: DiffSegmentType, text: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("removed", a[i]);
      i += 1;
    } else {
      push("added", b[j]);
      j += 1;
    }
  }
  while (i < a.length) push("removed", a[i++]);
  while (j < b.length) push("added", b[j++]);
  return segments;
}

function isPunctuation(token: string): boolean {
  return /^[\s，。；！？、：（）“”‘’.,;:!?"'()]+$/u.test(token);
}

/**
 * useTextDiff：句子级 LCS 对齐，改写的句子再做字符级差异。
 * 输入响应式文本，输出按行排列的差异片段，供 DiffViewer 渲染两版对应段落。
 */
export function useTextDiff(oldTextSource: Ref<string>, newTextSource: Ref<string>) {
  const getSegments = useMemoize(
    ([oldText, newText]: [string, string]) => {
      const oldTokens = tokenize(oldText);
      const newTokens = tokenize(newText);
      const m = oldTokens.length;
      const n = newTokens.length;
      const dp: Uint16Array[] = Array.from({ length: m + 1 }, () =>
        new Uint16Array(n + 1)
      );
      for (let i = m - 1; i >= 0; i -= 1) {
        for (let j = n - 1; j >= 0; j -= 1) {
          dp[i][j] =
            oldTokens[i] === newTokens[j]
              ? dp[i + 1][j + 1] + 1
              : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }

      const raw: DiffSegment[] = [];
      const push = (type: DiffSegmentType, text: string) => {
        if (!text) return;
        const last = raw[raw.length - 1];
        if (last && last.type === type) last.text += text;
        else raw.push({ type, text });
      };

      let i = 0;
      let j = 0;
      while (i < m && j < n) {
        if (oldTokens[i] === newTokens[j]) {
          push("equal", oldTokens[i]);
          i += 1;
          j += 1;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
          push("removed", oldTokens[i]);
          i += 1;
        } else {
          push("added", newTokens[j]);
          j += 1;
        }
      }
      while (i < m) push("removed", oldTokens[i++]);
      while (j < n) push("added", newTokens[j++]);

      // 相邻 removed + added 视为改写：进入字符级差异，标出具体改动的字
      const refined: DiffSegment[] = [];
      for (let k = 0; k < raw.length; k += 1) {
        const current = raw[k];
        const next = raw[k + 1];
        if (
          current.type === "removed" &&
          next &&
          next.type === "added" &&
          !isPunctuation(current.text) &&
          !isPunctuation(next.text)
        ) {
          refined.push(...charLevelDiff(current.text, next.text));
          k += 1;
        } else {
          refined.push(current);
        }
      }
      return refined;
    },
    () => [oldTextSource.value, newTextSource.value] as [string, string]
  );

  const segments = computed(() => getSegments());

  /** 拆成左右两列视图：左列（旧）、右列（新），行索引对齐 */
  const sideBySide = computed(() => {
    const left: DiffSegment[] = [];
    const right: DiffSegment[] = [];
    for (const segment of segments.value) {
      if (segment.type === "equal") {
        left.push(segment);
        right.push(segment);
      } else if (segment.type === "removed") {
        left.push(segment);
        right.push({ type: "equal", text: "" });
      } else {
        left.push({ type: "equal", text: "" });
        right.push(segment);
      }
    }
    // 折叠连续空占位，避免过多空白行
    return { left, right };
  });

  const changeCount = computed(
    () =>
      segments.value.filter((segment) => segment.type !== "equal").length
  );

  return { segments, sideBySide, changeCount };
}
