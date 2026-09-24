import type { ReviewSession } from "../types/ReviewSession";
import { readSession, writeSession } from "../api/_base";
import { recordLog } from "../utils/logger";
import type { PolicyDocument } from "../types/PolicyDocument";

/** 读取当前审阅会话（待处理数量按该会话的新版版本过滤） */
export function getSession(): ReviewSession {
  return readSession();
}

/** 建立或切换审阅会话 */
export function setSession(
  oldDocument: PolicyDocument | null,
  newDocument: PolicyDocument | null
): ReviewSession {
  const previous = readSession();
  const session: ReviewSession = {
    old_document_id: oldDocument?.id ?? null,
    new_document_id: newDocument?.id ?? null,
    updated_at: new Date().toISOString()
  };
  writeSession(session);
  if (
    previous.new_document_id !== session.new_document_id ||
    previous.old_document_id !== session.old_document_id
  ) {
    if (oldDocument && newDocument) {
      recordLog("Session", previous.updated_at ? "UPDATE" : "CREATE", {
        oldLabel: oldDocument.version_label,
        newLabel: newDocument.version_label
      });
    } else {
      recordLog("Session", "STATUS_CHANGE", {});
    }
  }
  return session;
}
