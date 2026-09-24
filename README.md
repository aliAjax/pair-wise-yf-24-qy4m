# 隐私政策差异对比器

纯前端隐私政策版本对比与风险标注工具：粘贴旧版和新版政策全文，按编号自动识别条款，对比出新增、移除、改写和顺序调整；数据收集、共享、保存期限等高风险条款可标注风险等级并留下处理记录；审阅结论认准所审新版内容，新版再变更时原结论自动回到待处理、旧记录留档。数据存 localStorage。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20112>

## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`

## 功能流程

1. **文档导入** `/documents`：粘贴全文，按「一、」「1.」「第X条」「（一）」等编号自动分段；支持更新文本（重新分段）与删除（级联清理）。
2. **版本对比** `/compare`：选择旧版/新版后运行对比，编号一致加分、内容相似度主导的贪心配对识别重新编号的条款，相对顺序变化标记为移动；点开任意差异可看到两版对应段落的双栏句级高亮。
3. **风险标注** `/risks`：条款按关键词自动归类（数据收集/数据共享/保存期限/跨境传输/未成年人等）并预标风险等级，可人工调整等级、留下处理记录。
4. **审阅清单** `/review`：按状态过滤待办，确认/忽略/解决均追加处理记录；每条结论固化所审新版内容指纹，新版内容变化后原结论自动失效回到待处理，旧记录转为历史留档；支持导出 Markdown 摘要。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + localStorage |
| 后端 | - |
| 数据库 | 本地模拟数据 |
| 部署 | Docker Compose |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件的 localStorage 异步封装（读写在各文件内，日志/错误各自包装）
├── stores/               # Pinia 独立 store：文档、条款、差异、审阅备注
├── types/                # 数据模型与枚举类型镜像
├── constants/            # 枚举、条款归类规则、日志模板、错误码/消息、存储键、状态文案
├── constructors/         # 默认对象、表单对象、导入/对比/备注构造器
├── components/common/    # ImportPanel / DiffViewer / RiskTag / ReviewChecklist / SectionCard / StatusBadge / StatCard / EmptyState
├── hooks/                # usePolicyParser（编号分段+归类）、useTextDiff（条款配对+句级高亮）、useLocalStorageState
├── pages/                # DocumentsPage / ComparePage / RisksPage / ReviewPage
├── router/               # 路由清单（App 内按 route 切换页面组件）
├── utils/                # formatters（日期/状态/风险/指纹/id）、logger（日志模板渲染）
└── mocks/                # 示例新旧两版政策（首次启动经真实导入流程写入）
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `policy-diff`
- `FRONTEND_PORT`: 前端端口，默认 `20112`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: policy-diff`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-policy-diff}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`；本地数据清理由浏览器 localStorage 承担，清除站点数据即可重置。

## 枚举/常量出现位置清单

- DiffType：`constants/DiffType.ts` 与 `types/DiffType.ts` 双份定义；`constructors/DiffResultConstructor.ts`（默认值）、`hooks/useTextDiff.ts`（配对分类）、`stores/DiffResultStore.ts`（统计）、`constants/logTemplates.ts`（差异日志）、`constants/errorMessages.ts`、`utils/formatters.ts`（formatDiffType）、`components/common/{DiffViewer,SectionCard,ReviewChecklist}.vue`、`pages/{ComparePage,ReviewPage}.vue` 筛选与展示。
- PrivacyRiskLevel：`constants/PrivacyRiskLevel.ts` 与 `types/PrivacyRiskLevel.ts` 双份定义；`constants/clauseCategories.ts`（类目建议等级）、`constructors/PolicySectionConstructor.ts`（预标）、`stores/PolicySectionStore.ts`（标注动作）、`constants/logTemplates.ts`（标注日志）、`utils/formatters.ts`（formatRisk）、`components/common/RiskTag.vue`、`pages/{RisksPage,ComparePage}.vue` 筛选与展示。
- ReviewStatus：`constants/ReviewStatus.ts` 与 `types/ReviewStatus.ts` 双份定义；`constructors/ReviewNoteConstructor.ts`（默认 OPEN）、`stores/ReviewNoteStore.ts`（有效状态机）、`constants/logTemplates.ts`（处理/失效日志）、`constants/errorMessages.ts`、`utils/formatters.ts`（formatStatus）、`components/common/{StatusBadge,ReviewChecklist}.vue`、`pages/ReviewPage.vue` 筛选与展示、`App.vue` 待办角标。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。例如新增一个审阅状态，要同时改两处枚举定义、状态文案、日志模板、有效状态机、清单筛选、徽标配色与导出摘要。

## License

MIT
