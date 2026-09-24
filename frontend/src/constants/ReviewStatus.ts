/** 审阅状态：待处理 / 已确认 / 已忽略 / 已解决 */
export const ReviewStatus = ["OPEN", "CONFIRMED", "IGNORED", "RESOLVED"] as const;
export type ReviewStatus = (typeof ReviewStatus)[number];

/** 审阅状态中文文案（StatusBadge、清单、导出摘要共同引用） */
export const ReviewStatusText: Record<ReviewStatus, string> = {
  OPEN: "待处理",
  CONFIRMED: "已确认风险",
  IGNORED: "已忽略",
  RESOLVED: "已解决"
};

/** 待处理状态只认准 OPEN：新版内容变化后，原 RESOLVED 结论回到 OPEN */
export const PendingStatus: ReviewStatus = "OPEN";

/** 可以人工流转到的目标状态 */
export const ReviewStatusOptions: Array<{ value: ReviewStatus; label: string }> =
  ReviewStatus.map((value) => ({ value, label: ReviewStatusText[value] }));
