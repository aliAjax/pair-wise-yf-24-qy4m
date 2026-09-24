import { readStorage, writeStorage } from "../utils/storage";
import { PolicyDiffError } from "../utils/errors";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";
import type { AuditLog } from "../types/AuditLog";
import type { ReviewSession } from "../types/ReviewSession";
import { parsePolicyText, toSectionDraft } from "../hooks/usePolicyParser";
import { hashContent } from "../utils/hash";
import { seedDocuments, seedReviewNotes } from "../mocks/seedData";

export const NAMESPACES = {
  documents: "documents",
  sections: "sections",
  diffs: "diffResults",
  notes: "reviewNotes",
  logs: "auditLogs",
  session: "reviewSession",
  seeded: "seeded"
} as const;

export interface DatabaseShape {
  [NAMESPACES.documents]: PolicyDocument[];
  [NAMESPACES.sections]: PolicySection[];
  [NAMESPACES.diffs]: DiffResult[];
  [NAMESPACES.notes]: ReviewNote[];
  [NAMESPACES.logs]: AuditLog[];
  [NAMESPACES.session]: ReviewSession;
}

/** 模拟网络延迟：即便本地实现也保持 async API 形态 */
export function delay<T>(value: T, ms = 40): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), ms));
}

export function listAll<T>(namespace: string): T[] {
  try {
    return readStorage<T[]>(namespace, []);
  } catch (error) {
    throw new PolicyDiffError("STORAGE_UNAVAILABLE", {}, error);
  }
}

export function saveAll<T>(namespace: string, rows: T[]): void {
  try {
    writeStorage(namespace, rows);
  } catch (error) {
    throw new PolicyDiffError("STORAGE_UNAVAILABLE", {}, error);
  }
}

export function nextId(rows: Array<{ id: number }>): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

/** 首次启动时播种两版示例政策（条款经解析器生成，与手动导入走同一条链路） */
export function ensureSeed(): void {
  const seeded = readStorage<boolean>(NAMESPACES.seeded, false);
  if (seeded) return;

  const documents: PolicyDocument[] = [];
  const sections: PolicySection[] = [];
  let sectionId = 1;

  seedDocuments.forEach((form, index) => {
    const id = index + 1;
    const parsed = parsePolicyText(form.raw_text);
    const docSections = parsed.map((item) => toSectionDraft(id, item, sectionId++));
    const now = new Date(Date.UTC(2026, 8, 20, 2, 0, 0) + index * 86400000).toISOString();
    documents.push({
      id,
      title: form.title,
      version_label: form.version_label,
      raw_text: form.raw_text,
      normalized_sections: JSON.stringify(docSections),
      imported_at: now,
      content_hash: hashContent(docSections.map((s) => s.content_hash).join("|"))
    });
    sections.push(...docSections);
  });

  saveAll(NAMESPACES.documents, documents);
  saveAll(NAMESPACES.sections, sections);
  saveAll(NAMESPACES.diffs, []);

  // 预置一条针对保存期限条款的“已解决”记录，resolved_hash 故意取自旧版内容；
  // 用户首次执行对比时会因新版内容变化（三十日→六十日）自动回到待处理，旧记录留档。
  const oldSection = sections.find(
    (section) => section.document_id === 1 && section.section_no === "4"
  );
  const notes: import("../types/ReviewNote").ReviewNote[] = [];
  if (oldSection) {
    const seedNow = new Date(Date.UTC(2026, 8, 21, 3, 0, 0)).toISOString();
    notes.push({
      id: 1,
      diff_result_id: 0,
      match_key: "1->2#4",
      new_document_id: 2,
      old_document_id: 1,
      tag: seedReviewNotes[0].tag,
      comment: seedReviewNotes[0].comment,
      reviewer: seedReviewNotes[0].reviewer,
      status: "RESOLVED",
      resolved_hash: oldSection.content_hash,
      reopen_count: 0,
      created_at: seedNow,
      updated_at: seedNow,
      history: [
        {
          action: "历史结论：旧版保存期限安排已经法务确认",
          from_status: null,
          to_status: "RESOLVED",
          comment: seedReviewNotes[0].comment,
          reviewer: seedReviewNotes[0].reviewer,
          tag: seedReviewNotes[0].tag,
          content_hash: oldSection.content_hash,
          at: seedNow
        }
      ]
    });
  }
  saveAll(NAMESPACES.notes, notes);
  writeStorage(NAMESPACES.session, {
    old_document_id: 1,
    new_document_id: 2,
    updated_at: new Date().toISOString()
  } satisfies ReviewSession);
  writeStorage(NAMESPACES.seeded, true);
}

export function readSession(): ReviewSession {
  return readStorage<ReviewSession>(NAMESPACES.session, {
    old_document_id: null,
    new_document_id: null,
    updated_at: ""
  });
}

export function writeSession(session: ReviewSession): void {
  writeStorage(NAMESPACES.session, session);
}
