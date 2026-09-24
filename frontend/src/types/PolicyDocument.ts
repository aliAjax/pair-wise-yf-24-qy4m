/** 政策文档：一次粘贴导入的一个版本 */
export interface PolicyDocument {
  id: number;
  title: string;
  version_label: string;
  raw_text: string;
  /** 解析后条款的 JSON 快照（PolicySection[] 序列化） */
  normalized_sections: string;
  imported_at: string;
  /** 最近一次解析时全文内容的指纹 */
  content_hash: string;
}

/** 导入/编辑表单对象 */
export interface PolicyDocumentForm {
  title: string;
  version_label: string;
  raw_text: string;
}
