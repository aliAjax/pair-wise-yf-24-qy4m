import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import type { SectionCategory } from "./SectionCategory";

/**
 * 高风险条款识别规则：按类别配置关键词与默认等级。
 * 解析条款正文时逐条命中，数据收集、共享、保存期限条款会自动获得风险等级。
 * 新增监管关注点时，在这里加关键词即可同步影响解析、风险清单和待办数量。
 */
export interface RiskRule {
  category: SectionCategory;
  level: PrivacyRiskLevel;
  keywords: string[];
}

export const RISK_RULES: RiskRule[] = [
  {
    category: "DATA_COLLECTION",
    level: "HIGH",
    keywords: ["收集", "采集", "获取您的", "设备信息", "位置信息", "通讯录", "相册", "摄像头", "麦克风", "浏览记录", "日志信息"]
  },
  {
    category: "DATA_SHARING",
    level: "HIGH",
    keywords: ["共享", "分享", "提供给", "转让", "第三方", "SDK", "委托", "对外提供", "合作伙伴"]
  },
  {
    category: "RETENTION",
    level: "HIGH",
    keywords: ["保存期限", "存储期限", "保留期限", "留存", "保存至", "最短期限", "删除", "匿名化"]
  },
  {
    category: "SECURITY",
    level: "MEDIUM",
    keywords: ["加密", "安全措施", "安全事件", "访问控制", "去标识化"]
  },
  {
    category: "USER_RIGHTS",
    level: "MEDIUM",
    keywords: ["查阅", "复制", "更正", "撤回同意", "注销账号", "删除您的", "投诉举报"]
  },
  {
    category: "CONTACT",
    level: "LOW",
    keywords: ["联系我们", "客服", "发送邮件", "客服热线", "个人信息保护负责人"]
  }
];

/** 命中严重风险的升级关键词（出现在任一类别条款中则升为 CRITICAL） */
export const CRITICAL_KEYWORDS = [
  "敏感个人信息",
  "生物识别",
  "身份证",
  "行踪轨迹",
  "不满十四周岁",
  "未成年人",
  "面部",
  "指纹",
  "医疗健康",
  "金融账户",
  "征信"
];

/** 类别兜底默认等级 */
export const CATEGORY_FALLBACK_LEVEL: Record<SectionCategory, PrivacyRiskLevel> = {
  DATA_COLLECTION: "MEDIUM",
  DATA_SHARING: "MEDIUM",
  RETENTION: "MEDIUM",
  USER_RIGHTS: "LOW",
  CONTACT: "LOW",
  SECURITY: "LOW",
  GENERAL: "LOW"
};

const LEVEL_RANK: Record<PrivacyRiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

export interface RiskDetection {
  category: SectionCategory;
  risk_level: PrivacyRiskLevel;
  risk_reason: string;
}

/** 根据标题与正文自动判定类别、风险等级与理由 */
export function detectRisk(heading: string, content: string): RiskDetection {
  const text = `${heading} ${content}`;
  let best: RiskDetection | null = null;

  for (const rule of RISK_RULES) {
    const hit = rule.keywords.filter((keyword) => text.includes(keyword));
    if (hit.length === 0) continue;
    const candidate: RiskDetection = {
      category: rule.category,
      risk_level: rule.level,
      risk_reason: `命中${rule.category === "DATA_COLLECTION" ? "数据收集" : rule.category === "DATA_SHARING" ? "第三方共享" : rule.category === "RETENTION" ? "保存期限" : ""}关键词：${hit.slice(0, 4).join("、")}`
    };
    if (!best || LEVEL_RANK[candidate.risk_level] > LEVEL_RANK[best.risk_level]) {
      best = candidate;
    }
  }

  const criticalHit = CRITICAL_KEYWORDS.find((keyword) => text.includes(keyword));
  if (criticalHit) {
    if (best) {
      return {
        category: best.category,
        risk_level: "CRITICAL",
        risk_reason: `涉及敏感场景「${criticalHit}」，${best.risk_reason}`
      };
    }
    return {
      category: "GENERAL",
      risk_level: "CRITICAL",
      risk_reason: `涉及敏感场景「${criticalHit}」`
    };
  }

  if (best) return best;
  return {
    category: "GENERAL",
    risk_level: "LOW",
    risk_reason: "未命中高风险关键词"
  };
}
