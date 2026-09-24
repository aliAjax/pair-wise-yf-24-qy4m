import type { DiffResult } from "../types/DiffResult";
import { DiffTypeText } from "../constants/DiffType";
import { hashContent } from "../utils/hash";
import type { PolicySection } from "../types/PolicySection";
import type { DiffType } from "../types/DiffType";

/** 默认差异结果 */
export function createDefaultDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    id: 0,
    old_document_id: 0,
    new_document_id: 0,
    section_id: null,
    old_section_id: null,
    diff_type: "UNCHANGED",
    match_key: "",
    old_section_no: "",
    new_section_no: "",
    old_heading: "",
    new_heading: "",
    old_content: "",
    new_content: "",
    ordinal: 0,
    summary: "",
    content_hash: "",
    created_at: "",
    ...overrides
  };
}

export interface DiffResultPair {
  oldDocumentId: number;
  newDocumentId: number;
  oldSection: PolicySection | null;
  newSection: PolicySection | null;
  diffType: DiffType;
  ordinal: number;
  id: number;
  createdAt: string;
}

/** 由旧/新条款对构造差异结果（builder），新旧两版对应段落都冗余保存 */
export function buildDiffResult(pair: DiffResultPair): DiffResult {
  const { oldSection, newSection, diffType } = pair;
  const sectionNo = newSection?.section_no ?? oldSection?.section_no ?? "";
  const current = newSection ?? oldSection;
  return createDefaultDiffResult({
    id: pair.id,
    old_document_id: pair.oldDocumentId,
    new_document_id: pair.newDocumentId,
    section_id: newSection?.id ?? null,
    old_section_id: oldSection?.id ?? null,
    diff_type: diffType,
    match_key: `${pair.oldDocumentId}->${pair.newDocumentId}#${sectionNo}`,
    old_section_no: oldSection?.section_no ?? "",
    new_section_no: newSection?.section_no ?? "",
    old_heading: oldSection?.heading ?? "",
    new_heading: newSection?.heading ?? "",
    old_content: oldSection?.content ?? "",
    new_content: newSection?.content ?? "",
    ordinal: pair.ordinal,
    summary: buildSummary(diffType, oldSection, newSection),
    // 待处理状态认准所审新版版本：指纹取新版条款内容
    content_hash: newSection
      ? newSection.content_hash
      : hashContent(`removed:${oldSection?.content_hash ?? ""}`),
    created_at: pair.createdAt
  });
}

function buildSummary(
  diffType: DiffType,
  oldSection: PolicySection | null,
  newSection: PolicySection | null
): string {
  const label = DiffTypeText[diffType];
  const no = newSection?.section_no ?? oldSection?.section_no ?? "-";
  const heading = newSection?.heading ?? oldSection?.heading ?? "";
  if (diffType === "MOVED" && oldSection && newSection) {
    return `条款 ${no}《${heading}》内容未变，但位置由第 ${oldSection.order_path.join(".")} 项移动到第 ${newSection.order_path.join(".")} 项（${label}）`;
  }
  return `条款 ${no}《${heading}》状态：${label}`;
}

/** API 响应对象 */
export function createDiffResultResponse(row: DiffResult): DiffResult {
  return { ...row };
}

export const createDiffResultForm = createDefaultDiffResult;
