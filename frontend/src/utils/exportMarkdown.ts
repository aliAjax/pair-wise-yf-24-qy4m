import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import { DiffTypeText } from "../constants/DiffType";
import { ReviewStatusText } from "../constants/ReviewStatus";
import { PrivacyRiskLevelText } from "../constants/PrivacyRiskLevel";
import { SectionCategoryText } from "../constants/SectionCategory";
import { ReviewTagText } from "../constants/ReviewTag";
import { formatDate } from "./formatters";
import { recordLog } from "./logger";

/** 生成审阅清单的 Markdown 摘要（两版对应段落 + 风险 + 处理记录） */
export function buildReviewMarkdown(params: {
  oldDocument: PolicyDocument;
  newDocument: PolicyDocument;
  diffs: DiffResult[];
  notes: ReviewNote[];
  newSections: PolicySection[];
}): string {
  const { oldDocument, newDocument, diffs, notes, newSections } = params;
  const noteByDiff = new Map<number, ReviewNote[]>();
  notes.forEach((note) => {
    const list = noteByDiff.get(note.diff_result_id) ?? [];
    list.push(note);
    noteByDiff.set(note.diff_result_id, list);
  });
  const sectionById = new Map(newSections.map((section) => [section.id, section]));

  const lines: string[] = [];
  lines.push(`# 隐私政策版本审阅摘要`);
  lines.push("");
  lines.push(`- 旧版：${oldDocument.title}（${oldDocument.version_label}）`);
  lines.push(`- 新版：${newDocument.title}（${newDocument.version_label}）`);
  lines.push(`- 导出时间：${formatDate(new Date().toISOString())}`);
  lines.push(`- 待处理数量：${notes.filter((note) => note.status === "OPEN").length}`);
  lines.push("");
  lines.push("## 差异条款");
  lines.push("");

  const changed = diffs.filter((diff) => diff.diff_type !== "UNCHANGED");
  for (const diff of changed) {
    const section = diff.section_id ? sectionById.get(diff.section_id) : undefined;
    lines.push(`### ${diff.new_section_no || diff.old_section_no} ${diff.new_heading || diff.old_heading}`);
    lines.push("");
    lines.push(`- 差异类型：**${DiffTypeText[diff.diff_type]}**`);
    if (section) {
      lines.push(
        `- 风险等级：${PrivacyRiskLevelText[section.risk_level]}（类别：${SectionCategoryText[section.category]}）`
      );
    }
    lines.push(`- 说明：${diff.summary}`);
    lines.push("");
    lines.push("**旧版段落**");
    lines.push("");
    lines.push(`> ${(diff.old_content || "（旧版无此条款）").replace(/\n/g, "\n> ")}`);
    lines.push("");
    lines.push("**新版段落**");
    lines.push("");
    lines.push(`> ${(diff.new_content || "（新版已移除）").replace(/\n/g, "\n> ")}`);
    lines.push("");

    const related = noteByDiff.get(diff.id) ?? [];
    if (related.length > 0) {
      lines.push("处理记录：");
      lines.push("");
      for (const note of related) {
        lines.push(
          `- ${formatDate(note.updated_at)} ${note.reviewer} 标记为「${ReviewStatusText[note.status]}」` +
            `${note.tag ? `（${ReviewTagText[note.tag]}）` : ""}：${note.comment || "（无备注）"}` +
            (note.reopen_count > 0 ? ` ⚠️ 已因内容变化重开 ${note.reopen_count} 次` : "")
        );
      }
      lines.push("");
    }
  }

  const content = lines.join("\n");
  recordLog("ReviewNote", "EXPORT", { count: notes.length });
  recordLog("DiffResult", "EXPORT", { count: changed.length });
  return content;
}

/** 触发浏览器下载 Markdown 文件 */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
