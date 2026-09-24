import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";

export interface SectionCategoryRule {
  category: string;
  keywords: string[];
  suggestedRisk: PrivacyRiskLevel;
}

export const DEFAULT_SECTION_CATEGORY = "其他";

/**
 * 条款自动归类规则：按声明顺序首个命中关键词的规则生效，
 * 高风险类目（跨境、未成年人、共享、保存期限、收集）优先匹配。
 */
export const SECTION_CATEGORY_RULES: SectionCategoryRule[] = [
  { category: "跨境传输", suggestedRisk: "CRITICAL", keywords: ["跨境", "境外", "海外", "传输至"] },
  { category: "未成年人", suggestedRisk: "CRITICAL", keywords: ["未成年人", "儿童", "十四周岁", "14周岁", "监护人"] },
  { category: "数据共享", suggestedRisk: "HIGH", keywords: ["共享", "转让", "公开披露", "第三方", "合作伙伴", "委托处理", "委托"] },
  { category: "保存期限", suggestedRisk: "HIGH", keywords: ["保存", "留存", "保留期限", "存储期限", "保存期限"] },
  { category: "数据收集", suggestedRisk: "HIGH", keywords: ["收集", "采集", "获取您的", "您主动提供", "注册信息"] },
  { category: "用户权利", suggestedRisk: "MEDIUM", keywords: ["访问您的", "更正", "删除您的", "注销", "撤回同意", "投诉", "复制"] },
  { category: "安全措施", suggestedRisk: "MEDIUM", keywords: ["加密", "安全措施", "脱敏", "匿名化", "去标识化"] },
  { category: "Cookie与追踪", suggestedRisk: "MEDIUM", keywords: ["cookie", "Cookie", "SDK", "追踪", "标识符", "日志"] },
  { category: "数据使用", suggestedRisk: "LOW", keywords: ["如何使用", "使用您的", "用途", "处理您的"] }
];

export const SECTION_CATEGORIES: string[] = [
  DEFAULT_SECTION_CATEGORY,
  ...SECTION_CATEGORY_RULES.map((rule) => rule.category)
];
