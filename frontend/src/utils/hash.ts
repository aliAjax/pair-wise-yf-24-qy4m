/** 简单稳定的字符串指纹（djb2），用于条款/文档内容变化判断 */
export function hashContent(input: string): string {
  let hash = 5381;
  const normalized = input.replace(/\s+/g, "").trim();
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `h${(hash >>> 0).toString(36)}_${normalized.length}`;
}
