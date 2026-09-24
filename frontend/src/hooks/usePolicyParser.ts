import { DEFAULT_SECTION_CATEGORY, SECTION_CATEGORY_RULES } from "../constants/clauseCategories";
import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";

export interface ParsedSection {
  section_no: string;
  heading: string;
  content: string;
  category: string;
  suggested_risk: PrivacyRiskLevel;
  order: number;
}

/** 支持的条款编号形式：第X条 / 一、 / 1. / 1.1 / （一） */
const HEADING_PATTERNS = [
  /^第\s*[一二三四五六七八九十百千零\d]+\s*[条章节][：:、.．\s]*/,
  /^[一二三四五六七八九十]+[、.．]\s*/,
  /^\d+(?:\.\d+)*[、.．]\s*/,
  /^\d+(?:\.\d+)*\s+\S/,
  /^[（(][一二三四五六七八九十\d]+[)）][、.．\s]*/
];

const HEADING_MAX_LENGTH = 60;

function matchHeading(line: string): { no: string; rest: string } | null {
  if (line.length > HEADING_MAX_LENGTH) return null;
  for (const pattern of HEADING_PATTERNS) {
    const matched = line.match(pattern);
    if (matched) {
      const no = matched[0].replace(/[、.．:：\s]+$/, "");
      const rest = line.slice(matched[0].length).trim();
      return { no, rest };
    }
  }
  return null;
}

export function classifyCategory(text: string): string {
  for (const rule of SECTION_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.category;
  }
  return DEFAULT_SECTION_CATEGORY;
}

export function suggestRiskFor(category: string): PrivacyRiskLevel {
  return SECTION_CATEGORY_RULES.find((rule) => rule.category === category)?.suggestedRisk ?? "LOW";
}

function buildSection(raw: { no: string; heading: string; body: string[] }, order: number): ParsedSection {
  const content = raw.body.join("\n");
  const heading = raw.heading || (content ? `${content.slice(0, 12)}…` : "未命名条款");
  const category = classifyCategory(`${heading}\n${content}`);
  return {
    section_no: raw.no,
    heading,
    content,
    category,
    suggested_risk: suggestRiskFor(category),
    order
  };
}

/**
 * 按编号把政策全文切分为条款：
 * 1. 逐行识别编号标题，编号之间的正文归入当前条款；
 * 2. 编号前的导语归入「前言」；
 * 3. 全文没有任何编号时退化为按空行分段，保证导入不空。
 */
export function parsePolicyText(rawText: string): ParsedSection[] {
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n");
  const raws: Array<{ no: string; heading: string; body: string[] }> = [];
  let current: { no: string; heading: string; body: string[] } | null = null;
  let matchedAny = false;

  const push = () => {
    if (current) raws.push(current);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = matchHeading(line);
    if (heading) {
      matchedAny = true;
      push();
      current = { no: heading.no, heading: heading.rest, body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      current = { no: "0", heading: "前言", body: [line] };
    }
  }
  push();

  if (!matchedAny && raws.length <= 1) {
    const paragraphs = rawText
      .replace(/\r\n?/g, "\n")
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    return paragraphs.map((paragraph, index) => {
      const firstLine = paragraph.split("\n")[0] ?? paragraph;
      const category = classifyCategory(paragraph);
      return {
        section_no: String(index + 1),
        heading: firstLine.length <= 20 ? firstLine : `${firstLine.slice(0, 12)}…`,
        content: paragraph,
        category,
        suggested_risk: suggestRiskFor(category),
        order: index
      };
    });
  }

  return raws.map((raw, index) => buildSection(raw, index));
}

export function usePolicyParser() {
  return { parsePolicyText, classifyCategory, suggestRiskFor };
}
