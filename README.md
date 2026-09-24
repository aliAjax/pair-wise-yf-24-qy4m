# 隐私政策差异对比器（policy-diff）

纯前端隐私政策版本对比与风险标注工具：粘贴旧版与新版政策全文，按条款编号自动分段，识别**新增 / 移除 / 改写 / 换序 / 未变**，对数据收集、第三方共享、保存期限等高风险条款自动标注风险等级，并以“所审新版版本”为准管理待处理审阅清单；所有数据保存在浏览器 localStorage，不接入任何第三方 API。

## 快速启动（Docker Compose，首选）

```bash
cp .env.example .env && docker compose up -d
```

启动后访问：<http://localhost:20112>

停止：

```bash
docker compose down        # 保留数据
docker compose down -v     # 彻底清理（本项目数据在浏览器 localStorage，卷仅用于镜像构建产物）
```

要求：`docker compose config --quiet` 不报错；可在任意目录名（含中文目录）下启动，容器名与挂载均不依赖宿主机路径。

## 本地开发方式

```bash
cd frontend
npm install
npm run dev        # http://localhost:20112
npm run build      # vue-tsc 类型检查 + vite 构建
npm run typecheck  # 仅类型检查
```

可选的本地逻辑自测（Node，无需浏览器）：

```bash
cd frontend
npx esbuild scripts/logic-check.ts --bundle --platform=node --format=esm --outfile=/tmp/lc.mjs && node /tmp/lc.mjs
npx esbuild scripts/integration-check.ts --bundle --platform=node --format=esm \
  --define:import.meta.env.VITE_APP_TITLE='"test"' \
  --define:import.meta.env.VITE_STORAGE_PREFIX='"policy-diff-test"' \
  --define:import.meta.env.VITE_API_BASE='"/api"' --outfile=/tmp/it.mjs && node /tmp/it.mjs
```

## 核心使用流程

1. **文档导入 `/documents`**：粘贴政策全文（支持 `1.`、`3.1`、`第3条`、`附件一：`、`【标题】` 等编号形式），自动分段并对数据收集/共享/保存期限条款自动打风险等级。首启自带两版示例政策（2025-v1、2026-v2）。
2. **版本对比 `/compare`**：选择旧版与“所审新版版本”，左右两列对照同编号段落，字符级高亮改写内容；可按差异类型、风险等级过滤，跳转到具体段落。
3. **风险标注 `/risks`**：给条款人工调整类别（数据收集/第三方共享/保存期限/用户权利/联系方式/信息安全/一般条款）与风险等级（低/中/高/严重），每次调整写入操作留档。
4. **审阅清单 `/review`**：待办数量**只统计当前所审新版版本**；可流转为待处理/已确认风险/已忽略/已解决，导出 Markdown 摘要。
   - **状态认准新版版本**：标记“已解决”时记录当时新版条款的内容指纹；之后重新粘贴新版导致该条款内容变化并重新计算差异时，原“已解决”结论**自动回到待处理（OPEN）**，`reopen_count` +1，全部历史处理记录继续留档。内容未变则结论保持有效。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3（`<script setup>`）+ TypeScript |
| 构建 | Vite 5 + vue-tsc |
| UI | Element Plus 2 + @element-plus/icons-vue |
| 状态管理 | Pinia（每实体独立 store，禁止全部写入组件 state） |
| 路由 | vue-router 4（4 个页面 + 重定向，HTML5 history） |
| 数据 | localStorage（按模型分文件的 async API 封装）+ 本地 mock 种子 |
| 部署 | Docker Compose（多阶段构建，Nginx 托管 SPA） |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件的 async API（localStorage 持久化），_base.ts 负责首启播种
│   ├── _base.ts
│   ├── PolicyDocument.ts
│   ├── PolicySection.ts
│   ├── DiffResult.ts
│   └── ReviewNote.ts
├── stores/               # Pinia 独立 store（controller 层，分别包装 service 异常）
│   ├── PolicyDocumentStore.ts
│   ├── PolicySectionStore.ts
│   ├── DiffResultStore.ts
│   ├── ReviewNoteStore.ts
│   ├── ReviewSessionStore.ts   # “所审新版版本”会话
│   └── AuditLogStore.ts
├── services/             # 业务编排层：导入分段、差异计算、回退判定、标注、审阅、导出
│   ├── documentService.ts
│   ├── comparisonService.ts    # 编号对齐 + LCS + 顺延抵消 + 已解决结论回退
│   ├── riskService.ts
│   ├── reviewService.ts
│   └── sessionService.ts
├── types/                # 数据模型与枚举类型聚合
│   ├── PolicyDocument.ts / PolicySection.ts / DiffResult.ts / ReviewNote.ts
│   ├── AuditLog.ts / ReviewSession.ts
│   └── DiffType.ts / PrivacyRiskLevel.ts / ReviewStatus.ts
├── constants/            # 枚举、日志模板、错误码/错误消息、状态文案、风险识别规则
│   ├── DiffType.ts / PrivacyRiskLevel.ts / ReviewStatus.ts
│   ├── SectionCategory.ts / ReviewTag.ts
│   ├── riskRules.ts            # 数据收集/共享/保存期限关键词与自动等级
│   ├── logTemplates.ts         # 每实体 ≥4 条模板（创建/更新/状态变更/导出 + REOPEN）
│   ├── errorCodes.ts / errorMessages.ts
│   └── statusText.ts
├── constructors/         # 默认对象 / 表单对象 / factory / builder
├── components/common/    # ImportPanel、DiffViewer、RiskTag、ReviewChecklist、SectionCard、StatusBadge、StatCard、EmptyState
├── hooks/                # usePolicyParser、useTextDiff、useLocalStorageState
├── pages/                # DocumentsPage、ComparePage、RisksPage、ReviewPage
├── router/               # routes.ts（路由元信息）+ index.ts
├── utils/                # storage、hash(djb2)、logger、errors、formatters、exportMarkdown
├── config/               # 读取 .env 的全局配置（标题/存储前缀/API base/端口）
└── mocks/                # seedData.ts：两版示例政策全文
```

## 环境变量说明

根目录 `.env`（由 `.env.example` 复制）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `policy-diff` | Compose 项目名与容器名前缀 |
| `FRONTEND_PORT` | `20112` | 宿主机映射端口，容器内固定 80 |

`frontend/.env.example`（Vite 构建期变量，被 `src/config/index.ts` 统一读取后分发给请求封装与日志模块）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_APP_TITLE` | 隐私政策差异对比器 | 浏览器标题与侧栏品牌 |
| `VITE_STORAGE_PREFIX` | `policy-diff` | localStorage 键前缀 |
| `VITE_API_BASE` | `/api` | 预留接口前缀（当前不会发起真实请求） |

## Docker 部署说明

- 根 `docker-compose.yml`：不写 `version:` 字段；顶层 `name: policy-diff`；只编排 `frontend` 一个服务。
- 容器名：`${COMPOSE_PROJECT_NAME:-policy-diff}-frontend`；端口映射 `${FRONTEND_PORT:-20112}:80`。
- `frontend/Dockerfile` 为多阶段构建：node:20-alpine 执行 `npm install && npm run build`，最终用 nginx:1.27-alpine 托管 `dist`。
- `frontend/nginx.conf` 含 `try_files $uri $uri/ /index.html;`，支持 HTML5 history 的 SPA 深链刷新。
- 常见问题：
  - 端口占用：改根 `.env` 的 `FRONTEND_PORT` 后 `docker compose up -d`。
  - 中文目录名：构建上下文与运行均不绑定宿主机绝对路径，任意目录下均可启动。
  - 重置业务数据：在浏览器清除站点 localStorage（键前缀 `policy-diff:`），或在 DevTools Application 面板删除。

## 枚举 / 常量出现位置清单

项目刻意让每个枚举在常量（权威定义）、类型（聚合重导出）、构造器、日志模板、错误消息、formatters、列表筛选器与展示组件中重复出现，新增枚举值需同步多处。

### 1. DiffType（ADDED / REMOVED / MODIFIED / MOVED / UNCHANGED）

| 层 | 文件 / 位置 |
|---|---|
| 常量与文案 | `constants/DiffType.ts`（`DiffType`、`DiffTypeText`、`DiffTypeOptions`） |
| 类型 | `types/DiffType.ts`（类型重导出）、`types/DiffResult.ts`（`diff_type` 字段） |
| 构造器 | `constructors/DiffResultConstructor.ts`（默认值、`buildDiffResult`、摘要文案） |
| store | `stores/DiffResultStore.ts`（`diffStats` getter） |
| service | `services/comparisonService.ts`（五分类判定与计数）、`utils/exportMarkdown.ts`（摘要标题） |
| 日志模板 | `constants/logTemplates.ts`（DiffResult.CREATE 模板内 新增/移除/改写/换序 占位） |
| 错误消息 | `constants/errorMessages.ts`（VERSION_REQUIRED / SAME_VERSION 间接关联） |
| formatters | `utils/formatters.ts`（`formatDiffType`、`diffTagType`）、`constants/statusText.ts` |
| 筛选器 | `pages/ComparePage.vue`（差异类型 radio-button 过滤） |
| 展示组件 | `components/common/StatusBadge.vue`（`kind="diff"`）、`components/common/DiffViewer.vue`、`pages/ReviewPage.vue` |

### 2. PrivacyRiskLevel（LOW / MEDIUM / HIGH / CRITICAL）

| 层 | 文件 / 位置 |
|---|---|
| 常量与文案 | `constants/PrivacyRiskLevel.ts`（值、文案、排序权重、`HighRiskLevels`、筛选项） |
| 类型 | `types/PrivacyRiskLevel.ts`、`types/PolicySection.ts`（`risk_level`）、`types/ReviewNote.ts` 间接使用 |
| 构造器 | `constructors/PolicySectionConstructor.ts`、`hooks/usePolicyParser.ts`（解析即标注） |
| store | `stores/PolicySectionStore.ts`（`riskStats`、`highRiskRows`） |
| service | `services/riskService.ts`（人工调整等级）、`constants/riskRules.ts`（自动判定规则） |
| 日志模板 | `constants/logTemplates.ts`（PolicySection.STATUS_CHANGE：`{fromLevel}→{toLevel}`） |
| 错误消息 | `constants/errorMessages.ts`（VALIDATION_FAILED 用于非法标注入参） |
| formatters | `utils/formatters.ts`（`formatRisk`、`higherRisk`、`riskTagType`）、`constants/statusText.ts` |
| 筛选器 | `pages/RisksPage.vue`（等级下拉、高风险复选框）、`pages/ComparePage.vue`（仅看高风险） |
| 展示组件 | `components/common/RiskTag.vue`、`components/common/SectionCard.vue`、`pages/ReviewPage.vue` |

### 3. ReviewStatus（OPEN / CONFIRMED / IGNORED / RESOLVED）

| 层 | 文件 / 位置 |
|---|---|
| 常量与文案 | `constants/ReviewStatus.ts`（值、文案、`PendingStatus=OPEN`、状态选项） |
| 类型 | `types/ReviewStatus.ts`、`types/ReviewNote.ts`（`status`、`history[].to_status`） |
| 构造器 | `constructors/ReviewNoteConstructor.ts`（默认 OPEN、`createReviewNoteForDiff`、`createReopenHistoryEntry`） |
| store | `stores/ReviewNoteStore.ts`（`openCount`、`statusStats`、`changeStatus`） |
| service | `services/reviewService.ts`（状态流转、RESOLVED 记录指纹）、`services/comparisonService.ts`（内容变化回退 OPEN） |
| 日志模板 | `constants/logTemplates.ts`（ReviewNote.STATUS_CHANGE、ReviewNote.REOPEN） |
| 错误消息 | `constants/errorMessages.ts`（VALIDATION_FAILED：空备注） |
| formatters | `utils/formatters.ts`（`formatStatus`、`statusTagType`）、`constants/statusText.ts` |
| 筛选器 | `pages/ReviewPage.vue`（状态 radio-button）、`components/common/ReviewChecklist.vue`（操作按钮组） |
| 展示组件 | `components/common/StatusBadge.vue`、侧栏待办徽标 `App.vue`、导出 `utils/exportMarkdown.ts` |

### 4. 其它共享常量

- `SectionCategory`（DATA_COLLECTION / DATA_SHARING / RETENTION / USER_RIGHTS / CONTACT / SECURITY / GENERAL）：`constants/SectionCategory.ts` ↔ `types/PolicySection.ts` ↔ `riskService.ts` ↔ `riskRules.ts` ↔ `formatters.formatCategory` ↔ RisksPage 筛选器 ↔ SectionCard。
- `ReviewTag`（NEED_LEGAL / NEED_DISCLOSE / NEED_CONSENT / TEXT_FIX / NO_ACTION）：`constants/ReviewTag.ts` ↔ `types/ReviewNote.ts` ↔ ReviewChecklist ↔ ReviewPage ↔ exportMarkdown。

## 数据模型与关键机制

- **PolicyDocument**：`id, title, version_label, raw_text, normalized_sections(条款 JSON 快照), imported_at, content_hash`。
- **PolicySection**：`id, document_id, section_no, heading, content, category, risk_level, risk_reason, order_path, content_hash`。
- **DiffResult**：`id, old/new_document_id, section_id(new), old_section_id, diff_type, match_key, old/new_section_no, old/new_heading, old/new_content, ordinal, summary, content_hash(新版指纹), created_at`。
- **ReviewNote**：`id, diff_result_id, match_key, new/old_document_id, tag, comment, reviewer, status, resolved_hash, reopen_count, created_at, updated_at, history[]`。
- **AuditLog**：所有写操作（导入/重导/标注/建备注/状态流转/回退/导出/会话切换）经 `utils/logger.ts` 按 `constants/logTemplates.ts` 模板落 localStorage，可在风险页/审阅页操作后追溯。
- **换序 vs 顺延**：以标题做 LCS 对齐，再沿对齐序列累计新增/删除的净偏移；条款新位置等于“旧位置 + 净偏移”时判为未变（仅被新增条款挤位），否则判为 MOVED。示例中“未成年人保护”由旧版第 8 条移到新版第 6 条判换序，而“信息安全”等仅顺延的条款不误判。

## 为什么该项目会牵一发动全身

- 枚举（DiffType / PrivacyRiskLevel / ReviewStatus / SectionCategory / ReviewTag）在常量、类型、构造器、store、service、日志模板、错误消息、formatters、页面筛选器、展示组件中都有出现位置，新增一个枚举值至少触达 8 个以上文件。
- 每个实体的默认结构、表单、响应对象都由 `constructors/*` 统一构造，页面/store/service 不得散写字段；改字段要同步类型、构造器、API、日志模板与导出。
- `utils/formatters.ts` 故意混合日期、数字、差异类型、状态、风险等级、类别的格式化逻辑，被四个页面与多个组件共同依赖。
- 差异计算结果同时驱动对比视图、风险清单、待办数量与导出摘要；内容指纹（`content_hash`）贯穿解析、DiffResult、ReviewNote 与回退判定，改动指纹算法会影响全部状态。
- 全局配置分散在根 `.env(.example)`、`frontend/.env.example`、`src/config/index.ts`、API 存储封装与日志模块，新增配置必须多处同步。

## License

MIT
