export const LOG_TEMPLATES = {
  PolicyDocument: {
    create: "[政策文档] 创建文档「{title}」（版本 {version}）",
    update: "[政策文档] 更新文档 #{id} 文本并重新分段（{count} 个条款）",
    remove: "[政策文档] 删除文档 #{id} 及其关联条款、差异与备注",
    export: "[政策文档] 导出文档 #{id}",
    seed: "[政策文档] 写入本地示例文档「{title}」（版本 {version}）"
  },
  PolicySection: {
    create: "[条款段落] 文档 #{documentId} 解析出 {count} 个条款",
    update: "[条款段落] 更新条款 #{id}",
    risk: "[条款段落] 条款 #{id} 风险等级标注为 {risk}",
    export: "[条款段落] 导出条款列表（{count} 条）"
  },
  DiffResult: {
    create: "[差异结果] 对比文档 #{oldId} → #{newId}，生成 {count} 条差异",
    update: "[差异结果] 重新对比文档 #{oldId} → #{newId}，合并为 {count} 条记录",
    status: "[差异结果] 差异 #{id} 类型为 {diffType}",
    export: "[差异结果] 导出对比结果（{count} 条）"
  },
  ReviewNote: {
    create: "[审阅备注] 差异 #{diffId} 新增处理记录（{status}）",
    update: "[审阅备注] 备注 #{id} 更新为 {status}",
    reopen: "[审阅备注] 差异 #{diffId} 新版内容已变化，原结论失效回到待处理",
    export: "[审阅备注] 导出审阅清单（{count} 条）"
  }
} as const;
