import { ERROR_CODES } from "./errorCodes";

/** 错误消息模板：与错误码一一对应，service/store 包装异常时引用 */
export const ERROR_MESSAGES: Record<keyof typeof ERROR_CODES, string> = {
  VALIDATION_FAILED: "表单字段缺失或格式错误：{field}",
  NOT_FOUND: "未找到对应的 {entity} 记录（id={id}）",
  STORAGE_UNAVAILABLE: "浏览器本地存储不可用，无法保存数据",
  PARSE_FAILED: "政策文本解析失败：第 {line} 行附近无法识别条款编号",
  VERSION_REQUIRED: "请先选择旧版与新版政策后再进行对比",
  SAME_VERSION: "旧版与新版不能选择同一份政策文档",
  CONFLICT: "记录已被其他操作修改，请刷新后重试：{entity}",
  RATE_LIMITED: "操作过于频繁，请稍后再试"
};

/** 渲染错误消息模板 */
export function renderErrorMessage(
  template: keyof typeof ERROR_CODES,
  params: Record<string, string | number> = {}
): string {
  return ERROR_MESSAGES[template].replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}
