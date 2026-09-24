/**
 * 日志模板集中处。每个实体至少 4 条模板（创建/更新/状态变更/导出），
 * 所有写操作都必须经 logger 选择对应模板记录。
 * 字段或状态枚举变更时，这里与调用处必须同步修改。
 */
export const LOG_TEMPLATES = {
  PolicyDocument: {
    CREATE: "政策文档创建：《{title}》版本 {version}（{sectionCount} 个条款）",
    UPDATE: "政策文档更新：《{title}》版本 {version}，字段 {fields} 已变更",
    STATUS_CHANGE: "政策文档状态变更：文档 #{id} 被删除，关联 {sectionCount} 个条款",
    EXPORT: "政策文档导出：导出 {count} 份文档（版本 {version}）"
  },
  PolicySection: {
    CREATE: "条款段落创建：文档 #{documentId} 新增条款 {sectionNo}《{heading}》",
    UPDATE: "条款段落更新：条款 {sectionNo}《{heading}》字段 {fields} 已变更",
    STATUS_CHANGE:
      "条款风险标注变更：条款 {sectionNo}《{heading}》风险等级 {fromLevel}→{toLevel}（{reason}）",
    EXPORT: "条款段落导出：导出文档 #{documentId} 的 {count} 个条款"
  },
  DiffResult: {
    CREATE: "差异结果创建：{oldLabel} → {newLabel}，共 {count} 项差异（{added} 新增/{removed} 移除/{modified} 改写/{moved} 换序）",
    UPDATE: "差异结果更新：{oldLabel} → {newLabel} 重新计算，{changed} 项结果发生变化",
    STATUS_CHANGE:
      "差异状态联动：匹配键 {matchKey} 的已解决结论因新版内容变化回到待处理",
    EXPORT: "差异结果导出：导出 {count} 项差异结果"
  },
  ReviewNote: {
    CREATE: "审阅备注创建：针对条款 {sectionNo} 新增备注，处理人 {reviewer}",
    UPDATE: "审阅备注更新：备注 #{id} 字段 {fields} 已变更",
    STATUS_CHANGE: "审阅备注状态变更：备注 #{id} {fromStatus}→{toStatus}（处理人 {reviewer}）",
    REOPEN: "审阅结论失效重开：备注 #{id} 因新版内容变化回到待处理，第 {reopenCount} 次重开，历史记录已留档",
    EXPORT: "审阅备注导出：导出 {count} 条审阅记录（Markdown 摘要）"
  },
  Session: {
    CREATE: "审阅会话建立：旧版 {oldLabel} → 新版 {newLabel}，待处理状态认准新版版本 {newLabel}",
    UPDATE: "审阅会话切换：改审新版版本 {newLabel}，待办按该版本重新统计",
    STATUS_CHANGE: "审阅会话重置：尚未选择对比版本",
    EXPORT: "审阅会话导出：{count} 条待办已同步"
  }
} as const;

export type LogEntity = keyof typeof LOG_TEMPLATES;
export type LogAction<E extends LogEntity> = keyof (typeof LOG_TEMPLATES)[E];
