/** 当前审阅会话：待处理状态认准的“所审新版版本” */
export interface ReviewSession {
  old_document_id: number | null;
  new_document_id: number | null;
  updated_at: string;
}
