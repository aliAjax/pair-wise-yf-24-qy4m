export const DiffType = ["ADDED", "REMOVED", "MODIFIED", "MOVED", "UNCHANGED"] as const;
export type DiffType = (typeof DiffType)[number];
export const DiffTypeText: Record<DiffType, string> = {
  ADDED: "新增",
  REMOVED: "移除",
  MODIFIED: "改写",
  MOVED: "移动",
  UNCHANGED: "未变更"
};
