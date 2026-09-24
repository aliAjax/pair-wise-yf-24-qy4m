/** 审阅快捷标签：给数据收集、共享、保存期限等条款处理时使用 */
export const ReviewTag = [
  "NEED_LEGAL",
  "NEED_DISCLOSE",
  "NEED_CONSENT",
  "TEXT_FIX",
  "NO_ACTION"
] as const;
export type ReviewTag = (typeof ReviewTag)[number];

/** 标签中文文案（ReviewChecklist、导出 Markdown 摘要引用） */
export const ReviewTagText: Record<ReviewTag, string> = {
  NEED_LEGAL: "需法务复核",
  NEED_DISCLOSE: "需补充披露",
  NEED_CONSENT: "需补充同意",
  TEXT_FIX: "建议改写文案",
  NO_ACTION: "无需处理"
};

/** 标签筛选项 */
export const ReviewTagOptions: Array<{ value: ReviewTag; label: string }> = ReviewTag.map(
  (value) => ({ value, label: ReviewTagText[value] })
);
