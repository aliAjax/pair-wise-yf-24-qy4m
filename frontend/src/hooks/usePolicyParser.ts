import { useMemoize } from "./useLocalStorageState";
import type { PolicySection } from "../types/PolicySection";
import { detectRisk } from "../constants/riskRules";
import { hashContent } from "../utils/hash";
import { PolicyDiffError } from "../utils/errors";

export interface ParsedSection {
  section_no: string;
  heading: string;
  content: string;
  order_path: number[];
}

/**
 * 条款标题识别：
 *   1. 编号开头的行：“1. 标题” / “3.1 标题” / “第3条 标题” / “附件一：标题”
 *   2. 【标题】形式
 */
const HEADING_PATTERNS: Array<RegExp> = [
  /^(\d+(?:\.\d+){0,4})[.、\s]+(.+)$/,
  /^第\s*([0-9零一二三四五六七八九十百千]+)\s*[条章][:：\s]*(.*)$/,
  /^(附件[一二三四五六七八九十0-9]+)[:：\s]+(.+)$/,
  /^[【\[]([^】\]]{2,30})[】\]]\s*$/
];

function toOrderPath(sectionNo: string, index: number): number[] {
  if (/^\d+(\.\d+)*$/.test(sectionNo)) {
    return sectionNo.split(".").map((part) => parseInt(part, 10));
  }
  const cnMap: Record<string, number> = {
    零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9
  };
  const cn = sectionNo.match(/[零一二三四五六七八九十百千]+/);
  if (cn) {
    const digits = [...cn[0]].map((ch) => cnMap[ch] ?? 0);
    return [digits.reduce((sum, d) => sum + d, 0) || index + 1];
  }
  return [index + 1];
}

function compareOrder(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** 将粘贴文本按编号拆成条款（纯函数，不依赖 Vue 状态） */
export function parsePolicyText(rawText: string): ParsedSection[] {
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Array<{ no: string; heading: string; body: string[] }> = [];
  let preamble: string[] = [];

  const pushPreamble = () => {
    const body = preamble.join("\n").trim();
    if (body) {
      blocks.push({ no: "0", heading: "前言", body: [body] });
    }
    preamble = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    let matched: { no: string; heading: string } | null = null;
    for (const pattern of HEADING_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        if (pattern.source.startsWith("^【")) {
          matched = { no: String(blocks.length + 1), heading: m[1].trim() };
        } else {
          matched = { no: m[1].trim(), heading: (m[2] ?? "").trim() || m[1].trim() };
        }
        break;
      }
    }
    if (matched) {
      pushPreamble();
      blocks.push({ no: matched.no, heading: matched.heading, body: [] });
    } else if (blocks.length === 0) {
      preamble.push(line);
    } else {
      blocks[blocks.length - 1].body.push(line);
    }
  }
  pushPreamble();

  const parsed = blocks.map((block, index) => ({
    section_no: block.no,
    heading: block.heading,
    content: block.body.join("\n").trim(),
    order_path: toOrderPath(block.no, index)
  }));

  parsed.sort((a, b) => compareOrder(a.order_path, b.order_path));

  if (parsed.length === 0) {
    throw new PolicyDiffError("PARSE_FAILED", { line: 1 });
  }
  return parsed;
}

/** 构造 PolicySection 时的自动风险标注（解析 hook 复用同一套规则） */
export function toSectionDraft(
  documentId: number,
  parsed: ParsedSection,
  idSeed: number
): PolicySection {
  const risk = detectRisk(parsed.heading, parsed.content);
  return {
    id: idSeed,
    document_id: documentId,
    section_no: parsed.section_no,
    heading: parsed.heading,
    content: parsed.content,
    category: risk.category,
    risk_level: risk.risk_level,
    risk_reason: risk.risk_reason,
    order_path: parsed.order_path,
    content_hash: hashContent(`${parsed.heading}\n${parsed.content}`)
  };
}

/**
 * usePolicyParser：粘贴文本 → 自动分段 → 带风险等级的条款草稿。
 * 解析结果通过 useMemoize 缓存，避免输入过程中重复计算。
 */
export function usePolicyParser(rawText: () => string) {
  const getParsed = useMemoize(
    (text: string) => parsePolicyText(text),
    () => rawText()
  );

  const buildSections = (documentId: number, startId: number): PolicySection[] =>
    getParsed().map((parsed, index) => toSectionDraft(documentId, parsed, startId + index));

  return { parse: getParsed, buildSections };
}
