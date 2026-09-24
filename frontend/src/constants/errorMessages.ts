export const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  DOCUMENT_NOT_FOUND: "未找到对应的政策文档",
  SECTION_PARSE_EMPTY: "未能从文本中识别出任何条款，请检查编号格式",
  DIFF_PAIR_MISSING: "请先选择两个不同版本的政策文档再对比",
  DIFF_NOT_READY: "该条款暂无对比结果，请先在版本对比页运行对比",
  NOTE_COMMENT_EMPTY: "处理记录不能为空，请填写说明",
  STORAGE_WRITE_FAILED: "本地存储写入失败，请检查浏览器设置"
};
