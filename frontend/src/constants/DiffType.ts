/** 差异类型：新增 / 移除 / 改写 / 换序 / 未变 */
export const DiffType = ["ADDED", "REMOVED", "MODIFIED", "MOVED", "UNCHANGED"] as const;
export type DiffType = (typeof DiffType)[number];

/** 差异类型中文文案（展示组件、筛选器、日志模板共同引用） */
export const DiffTypeText: Record<DiffType, string> = {
  ADDED: "新增",
  REMOVED: "移除",
  MODIFIED: "改写",
  MOVED: "换序",
  UNCHANGED: "未变"
};

/** 列表筛选用选项（页面筛选器引用） */
export const DiffTypeOptions: Array<{ value: DiffType; label: string }> = DiffType.map((value) => ({
  value,
  label: DiffTypeText[value]
}));
