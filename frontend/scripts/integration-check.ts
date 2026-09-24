/**
 * 集成测试：localStorage 模拟 + 完整 service 链路。
 * 覆盖：首启播种、差异五分类、换序（顺延抵消）、已解决结论随新版内容变化回到待处理、旧记录留档、待办按所审新版过滤。
 */

// ---- 最小 localStorage 模拟（必须在导入 api/_base 前注入）----
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}
(globalThis as { window: unknown }).window = {
  localStorage: new MemoryStorage(),
  setTimeout: (fn: () => void) => {
    fn();
    return 0;
  }
};
(globalThis as { localStorage?: MemoryStorage }).localStorage = (
  globalThis as { window: { localStorage: MemoryStorage } }
).window.localStorage;

import { ensureSeed, listAll, NAMESPACES } from "../src/api/_base";
import * as documentApi from "../src/api/PolicyDocument";
import { computePairDiff } from "../src/services/comparisonService";
import { addReviewNote, changeReviewStatus } from "../src/services/reviewService";
import { reimportDocument } from "../src/services/documentService";
import { parseDocumentSections } from "../src/constructors/PolicyDocumentConstructor";
import type { DiffResult } from "../src/types/DiffResult";
import type { PolicyDocument } from "../src/types/PolicyDocument";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("❌ ASSERT FAILED:", message);
    process.exitCode = 1;
  } else {
    console.log("✅", message);
  }
}

async function main(): Promise<void> {
  // 隔离测试数据：清掉可能已存在的同名前缀存储
  (globalThis as { localStorage: MemoryStorage }).localStorage.clear();
  ensureSeed();
  const documents = await documentApi.listPolicyDocument();
  assert(documents.length === 2, "首启播种 2 个版本");
  const oldDoc = documents[0];
  const newDoc = documents[1];
  assert(parseDocumentSections(oldDoc).length === 9, "旧版解析为 9 条");
  assert(parseDocumentSections(newDoc).length === 11, "新版解析为 11 条");

  // 1. 首次对比：种子预置的“旧版已解决”备注会在此时回退到待处理
  const result = await computePairDiff(oldDoc, newDoc);
  const seedReopened = listAll<{ status: string; reopen_count: number }>(NAMESPACES.notes).filter(
    (n) => n.status === "OPEN"
  );
  assert(seedReopened.length === 1 && seedReopened[0].reopen_count === 1,
    "种子旧版结论（保存期限）在首次对比时自动回到待处理");
  const byNo = new Map<string, DiffResult>(
    result.diffs.map((diff) => [diff.new_section_no || diff.old_section_no, diff])
  );
  const findByHeading = (heading: string) =>
    result.diffs.find((d) => (d.new_heading || d.old_heading).includes(heading));

  assert(findByHeading("委托处理")?.diff_type === "ADDED", "委托处理条款 = 新增");
  assert(findByHeading("自动化决策")?.diff_type === "ADDED", "自动化决策条款 = 新增");
  assert(findByHeading("Cookie")?.diff_type === "REMOVED", "Cookie 条款 = 移除");
  assert(findByHeading("保存期限")?.diff_type === "MODIFIED", "保存期限条款 = 改写");
  assert(findByHeading("收集和使用")?.diff_type === "MODIFIED", "数据收集条款 = 改写");
  assert(findByHeading("共享")?.diff_type === "MODIFIED", "共享条款 = 改写");
  assert(findByHeading("未成年人")?.diff_type === "MOVED", "未成年人条款 8→6 = 换序");
  assert(findByHeading("信息安全")?.diff_type === "UNCHANGED", "信息安全条款 = 未变（顺延抵消，不误判换序）");
  assert(findByHeading("如何管理")?.diff_type === "UNCHANGED", "用户权利条款 = 未变");

  // 2. 保存期限条款处理：建备注 → 解决（按所审新版指纹）
  const retentionDiff = findByHeading("保存期限")!;
  // 先把种子回退的待办也一并处理掉，隔离本步骤的待办计数
  const listApi0 = await import("../src/api/ReviewNote");
  const seedNote = (await listApi0.listReviewNote()).find((n) => n.id === 1);
  if (seedNote) await changeReviewStatus(seedNote, "IGNORED", retentionDiff, { reviewer: "测试" });
  let note = await addReviewNote(retentionDiff, {
    tag: "NEED_LEGAL",
    comment: "六十日删除安排已确认",
    reviewer: "法务A"
  });
  note = await changeReviewStatus(note, "RESOLVED", retentionDiff, {
    comment: "六十日删除安排已确认，解决",
    reviewer: "法务A"
  });
  assert(note.status === "RESOLVED", "备注标记为已解决");
  assert(note.resolved_hash === retentionDiff.content_hash, "已解决记录保存新版内容指纹");
  const openBefore = listAll(NAMESPACES.notes).filter(
    (n: { new_document_id: number; status: string }) =>
      n.new_document_id === newDoc.id && n.status === "OPEN"
  );
  assert(openBefore.length === 0, "解决后待办数量为 0");

  // 3. 新版内容再次变化（重新粘贴：六十日 → 九十日），重算
  const changedText = newDoc.raw_text.replace("六十日内删除或匿名化", "九十日内删除或匿名化");
  const { document: updatedNew } = await reimportDocument(newDoc.id, {
    title: newDoc.title,
    version_label: newDoc.version_label,
    raw_text: changedText
  });
  const recomputed = await computePairDiff(oldDoc, updatedNew);
  const newRetentionDiff = recomputed.diffs.find((d) =>
    (d.new_heading || d.old_heading).includes("保存期限")
  )!;
  assert(
    newRetentionDiff.content_hash !== retentionDiff.content_hash,
    "重算后保存期限条款指纹变化"
  );
  const notesAfter = listAll<{ id: number; status: string; reopen_count: number; history: unknown[] }>(
    NAMESPACES.notes
  );
  const reopenedNote = notesAfter.find((n) => n.id === note.id)!;
  assert(reopenedNote.status === "OPEN", "内容变化后原已解决结论自动回到待处理(OPEN)");
  assert(reopenedNote.reopen_count === 1, "reopen_count 记为 1");
  assert(reopenedNote.history.length >= 2, "旧处理记录继续留档（历史包含创建+解决+回退）");

  // 4. 待办数量只认准所审新版版本
  const openScoped = notesAfter.filter(
    (n) => n.status === "OPEN" && n.new_document_id === newDoc.id
  );
  assert(openScoped.length === 1 && openScoped[0].id === note.id, "待办数量同步为 1（仅本次内容变化的条款），且属于所审新版版本");

  // 5. 再次标记解决后，内容不变重算不应回退
  let updatedNote = listAll(NAMESPACES.notes).find((n) => n.id === note.id)!;
  const listApi = await import("../src/api/ReviewNote");
  const rowsNow = await listApi.listReviewNote();
  const fresh = rowsNow.find((n) => n.id === note.id)!;
  await changeReviewStatus(fresh, "RESOLVED", newRetentionDiff, {
    comment: "再次确认",
    reviewer: "法务B"
  });
  const stable = await computePairDiff(oldDoc, updatedNew);
  void stable;
  const afterStable = (await listApi.listReviewNote()).find((n) => n.id === note.id)!;
  assert(afterStable.status === "RESOLVED", "内容未再变化时重算，结论保持已解决不回退");
  assert(afterStable.reopen_count === 1, "无变化时 reopen_count 不增长");

  // 6. 风险标注存在于种子条款（收集 HIGH、敏感 CRITICAL）
  const newSections = parseDocumentSections(updatedNew);
  const collectionSection = newSections.find((s) => s.heading.includes("收集和使用"))!;
  assert(collectionSection.risk_level === "CRITICAL", "数据收集条款（含面部信息）自动标为 CRITICAL");
  const retentionSection = newSections.find((s) => s.heading.includes("保存期限"))!;
  assert(retentionSection.risk_level === "HIGH", "保存期限条款自动标为 HIGH");
  const contact = newSections.find((s) => s.heading.includes("联系我们"))!;
  assert(contact.risk_level === "LOW", "联系方式条款为 LOW");

  // 7. 日志留档
  const logs = listAll<{ entity: string; action: string }>(NAMESPACES.logs);
  assert(logs.some((l) => l.entity === "PolicySection" && l.action === "CREATE"), "条款创建写日志");
  assert(logs.some((l) => l.entity === "ReviewNote" && l.action === "REOPEN"), "回退写 REOPEN 日志");
  assert(logs.some((l) => l.entity === "DiffResult" && l.action === "CREATE"), "差异重算写日志");
  assert(logs.length >= 8, `写操作均有留档（共 ${logs.length} 条）`);

  console.log("\n集成测试完成");
}

void main();
