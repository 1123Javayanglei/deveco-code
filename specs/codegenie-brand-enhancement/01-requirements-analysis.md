# CodeGenie 品牌增强需求分析 (Brand Enhancement Requirements)

> **重要提示**: 本次品牌替换采用**直接替换策略**，只关注 CLI 核心功能。TUI 组件、web、desktop、enterprise 等不修改。

## 一、项目背景

### 1.1 迁移目标

将 CLI 中的品牌标识全面迁移至 CodeGenie 品牌。本次迁移涵盖数据库名称、网络域名、应用名称、环境变量、用户代理、标题缩写等。

### 1.2 核心变更范围（仅 CLI）

| 变更类型 | 原值 | 目标值 | 影响范围 |
|---------|------|--------|---------|
| 数据库名称 | opencode.db | codegenie.db | CLI 存储层 |
| mDNS 域名 | opencode.local | codegenie.local | CLI 网络层 |
| 应用名称 | opencode | codegenie | CLI 全局 |
| 文本标识 | opencode/OpenCode | codegenie/CodeGenie | CLI 描述和日志 |
| 环境变量 | OPENCODE_* | CODEGENIE_* | CLI 配置（用户感知） |
| 标题缩写 | OC | CodeGenie | CLI 终端标题 |
| 退出消息 | logo[0]... | ...logo spread | CLI 退出 |
| User-Agent | opencode/ | codegenie/ | CLI HTTP |
| scriptName | opencode | codegenie | CLI 入口 |
| HTTP Headers | x-opencode-* | x-codegenie-* | CLI 服务 |
| 品牌缩写 | /oc | /cg | GitHub mentions |

---

## 二、功能点需求

### REQ-001: 数据库名称替换

**需求**: `opencode.db` → `codegenie.db`

**实现位置**: `packages/opencode/src/storage/db.ts`, `packages/opencode/src/index.ts`

---

### REQ-002: mDNS 域名替换

**需求**: `opencode.local` → `codegenie.local`

**实现位置**: `packages/opencode/src/server/mdns.ts`, `packages/opencode/src/cli/network.ts`, `packages/opencode/src/config/server.ts`

---

### REQ-003: 应用名称设置

**需求**: 应用名称为 `codegenie`

**实现位置**: `packages/opencode/src/global/index.ts`, `packages/opencode/package.json`

---

### REQ-004: 文字描述信息品牌替换

**需求**: CLI 命令描述、日志消息中的品牌替换（区分大小写）

**排除**:
- URL (`opencode.ai`, `opencode.internal` 等所有 URL)
- SDK 包名 (`@opencode-ai/*`)
- 外部插件
- Logo 文字 (`Powered by BITFUN & OpenCode`)
- API 端点路径 (`/.well-known/opencode`)

**实现位置**: `packages/opencode/src/cli/cmd/*.ts`, `packages/opencode/src/cli/logo.ts`, `packages/opencode/src/cli/error.ts`

---

### REQ-005: process.env 环境变量替换

**需求**: 用户感知的环境变量 `OPENCODE_*` → `CODEGENIE_*`

**排除**: 构建时全局声明 (`OPENCODE_VERSION`, `OPENCODE_CHANNEL`, `OPENCODE_LIBC`, `OPENCODE_MIGRATIONS`)，测试内部变量

**实现位置**: `packages/opencode/src/flag/flag.ts`（已有），CLI 相关 env 变量

---

### REQ-006: title 设置 OC → CodeGenie

**需求**: 终端标题中的 `OC` 缩写改为 `CodeGenie`

**实现位置**: `packages/opencode/src/cli/cmd/tui/app.tsx`（仅 title 相关，非 TUI 组件）

---

### REQ-007: 退出消息设置

**需求**: 使用 `...logo` spread 操作符，消息第一行为空行，品牌为 `codegenie`

**实现位置**: `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`（仅退出消息）

---

### REQ-008: User-Agent 品牌替换

**需求**: `opencode/` → `codegenie/`

**实现位置**: `packages/opencode/src/installation/index.ts`, `packages/opencode/src/provider/provider.ts`, `packages/opencode/src/session/llm.ts`, `packages/opencode/src/plugin/codex.ts`

---

### REQ-009: scriptName 品牌替换

**需求**: `.scriptName("opencode")` → `.scriptName("codegenie")`

**实现位置**: `packages/opencode/src/index.ts`, `packages/opencode/src/temporary.ts`

---

### REQ-010: headers 配置品牌替换

**需求**: HTTP headers 中的 `x-opencode-*` → `x-codegenie-*`，`X-Title: opencode` → `X-Title: codegenie`

**实现位置**: `packages/opencode/src/server/fence.ts`, `packages/opencode/src/server/proxy.ts`, `packages/opencode/src/session/llm.ts`, `packages/opencode/src/provider/provider.ts`, `packages/opencode/src/mcp/oauth-provider.ts`, `packages/opencode/src/account/account.ts`

---

### REQ-011: 品牌缩写 /oc → /cg

**需求**: GitHub mentions 中的 `/oc` 改为 `/cg`

**实现位置**: `packages/opencode/src/cli/cmd/github.ts`

---

## 三、不修改的内容

| 类别 | 内容 | 原因 |
|-----|------|------|
| TUI 组件 | `dialog-*.tsx`, `tips-view.tsx`, `footer.tsx` | 用户要求不修改 |
| web 命令 | `web.ts` | 用户要求不修改 |
| desktop | `packages/desktop-electron/*`, `packages/desktop/*` | 用户要求不修改 |
| enterprise | `packages/enterprise/*` | 用户要求不修改 |
| SDK | `packages/sdk/*` | 用户要求不修改 |
| shared | `packages/shared/*` | 用户要求不修改 |
| ui | `packages/ui/*` | 用户要求不修改 |
| 测试文件 | `packages/opencode/test/*` | 内部变量，使用者不感知 |
| **URL 中的品牌** | `https://opencode.ai`, `http://opencode.internal` 等 | URL 不替换品牌名 |
| **fetch 参数中的 URL** | `fetch(url)` 中的 url 参数 | URL 参数不替换 |
| **Logo 文字** | `"Powered by BITFUN & OpenCode"` | 保持原有品牌 |
| **API 端点路径** | `.well-known/opencode` 等 API 路径 | API 路径不替换 |
| SDK 包名 | `@opencode-ai/*` | SDK 生态兼容 |
| Effect ID | `@opencode/*` | Effect Service 标识符 |
| 外部插件 | `opencode-gitlab-auth`, `opencode-poe-auth` | 外部插件 |
| GitHub 仓库 | `anomalyco/opencode` | 外部仓库 |
| 构建全局 | `OPENCODE_VERSION`, `OPENCODE_CHANNEL`, `OPENCODE_LIBC`, `OPENCODE_MIGRATIONS` | 构建时注入 |

---

## 四、验收清单

- [x] REQ-001: 数据库 `codegenie.db`
- [x] REQ-002: mDNS `codegenie.local`
- [x] REQ-003: 应用名 `codegenie`
- [x] REQ-004: CLI 文字品牌替换（排除 URL、Logo 文字、API 端点）
- [x] REQ-005: 用户感知 env 变量替换
- [x] REQ-006: 终端标题 `CodeGenie`
- [x] REQ-007: 退出消息 spread operator
- [x] REQ-008: User-Agent `codegenie/`
- [x] REQ-009: scriptName `codegenie`
- [x] REQ-010: HTTP headers `x-codegenie-*`
- [x] REQ-011: mentions `/cg`
- [x] URL 中的品牌名保持不变（`opencode.ai`, `opencode.internal`）
- [x] Logo 文字保持不变（`Powered by BITFUN & OpenCode`）
- [x] API 端点路径保持不变（`.well-known/opencode`）

---

## 五、版本历史

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| 3.1 | 2026-04-23 | 补充排除项：URL 中的品牌名、fetch 参数 URL、Logo 文字、API 端点路径 |
| 3.0 | 2026-04-23 | 简化需求，只关注 CLI，排除 TUI 组件、web、desktop、enterprise、测试文件 |
| 2.1 | 2026-04-22 | 补充 CLI 命令描述修复 |
| 2.0 | 2026-04-22 | 完整重写 |
| 1.0 | 2026-04-02 | 初始版本 |