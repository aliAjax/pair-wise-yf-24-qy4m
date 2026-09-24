import type { SectionPair } from "../hooks/useTextDiff";
import type { DiffResult } from "../types/DiffResult";
import type { PolicySection } from "../types/PolicySection";
import { contentHash, nowIso } from "../utils/formatters";

const snapshotText = (section: PolicySection | null) => (section ? `${section.heading}\n${section.content}`.trim() : "");
const snapshotHash = (section: PolicySection | null) => contentHash(snapshotText(section).replace(/\s+/g, ""));

export const createDefaultDiffResult = (overrides: Partial<DiffResult> = {}): DiffResult => ({
  id: 0,
  old_document_id: 0,
  new_document_id: 0,
  section_id: 0,
  section_key: "",
  diff_type: "UNCHANGED",
  summary: "",
  old_section_id: null,
  new_section_id: null,
  old_no: "",
  new_no: "",
  old_heading: "",
  new_heading: "",
  old_text: "",
  new_text: "",
  old_hash: "",
  new_hash: "",
  created_at: nowIso(),
  ...overrides
});

/** 由条款配对结果构造差异记录，同时固化两版段落快照与内容指纹 */
export const buildDiffResultFromPair = (pair: SectionPair, oldDocumentId: number, newDocumentId: number, id: number): DiffResult =>
  createDefaultDiffResult({
    id,
    old_document_id: oldDocumentId,
    new_document_id: newDocumentId,
    section_id: pair.newSection?.id ?? pair.oldSection?.id ?? 0,
    section_key: pair.key,
    diff_type: pair.diffType,
    summary: pair.summary,
    old_section_id: pair.oldSection?.id ?? null,
    new_section_id: pair.newSection?.id ?? null,
    old_no: pair.oldSection?.section_no ?? "",
    new_no: pair.newSection?.section_no ?? "",
    old_heading: pair.oldSection?.heading ?? "",
    new_heading: pair.newSection?.heading ?? "",
    old_text: snapshotText(pair.oldSection),
    new_text: snapshotText(pair.newSection),
    old_hash: snapshotHash(pair.oldSection),
    new_hash: snapshotHash(pair.newSection),
    created_at: nowIso()
  });

export const createDiffResultForm = createDefaultDiffResult;
export const createDiffResultResponse = createDefaultDiffResult;
