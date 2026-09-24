/** 条款类别：用于识别数据收集、共享、保存期限等高风险条款 */
export const SectionCategory = [
  "DATA_COLLECTION",
  "DATA_SHARING",
  "RETENTION",
  "USER_RIGHTS",
  "CONTACT",
  "SECURITY",
  "GENERAL"
] as const;
export type SectionCategory = (typeof SectionCategory)[number];

/** 类别中文文案（SectionCard、风险页筛选器、导出摘要引用） */
export const SectionCategoryText: Record<SectionCategory, string> = {
  DATA_COLLECTION: "数据收集",
  DATA_SHARING: "第三方共享",
  RETENTION: "保存期限",
  USER_RIGHTS: "用户权利",
  CONTACT: "联系方式",
  SECURITY: "信息安全",
  GENERAL: "一般条款"
};

/** 高风险类别（风险清单、待办数量统计引用） */
export const HighRiskCategories: SectionCategory[] = [
  "DATA_COLLECTION",
  "DATA_SHARING",
  "RETENTION"
];

/** 类别列表筛选项 */
export const SectionCategoryOptions: Array<{ value: SectionCategory; label: string }> =
  SectionCategory.map((value) => ({ value, label: SectionCategoryText[value] }));
