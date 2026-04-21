# OpenCode 登录鉴权机制与 CodeGenie 集成 - 需求分析说明书

## 1. 文档概述

### 1.1 文档目的
本文档分析 OpenCode 框架的登录鉴权机制，并描述 CodeGenie 华为账号登录集成的需求。

### 1.2 分析范围
- OpenCode 插件系统与 Hook 机制
- 认证数据存储与管理
- Provider 注册与加载流程
- CLI 认证入口
- CodeGenie 华为账号 OAuth 集成需求

---

## 2. OpenCode 认证架构分析

### 2.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OpenCode 认证架构                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │
│   │  Plugin      │────▶│   Hooks      │────▶│  Provider    │      │
│   │  System      │     │  Registry    │     │  Manager     │      │
│   └──────────────┘     └──────────────┘     └──────────────┘      │
│          │                    │                    │               │
│          ▼                    ▼                    ▼               │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │
│   │ INTERNAL_    │     │  AuthHook    │     │  models.dev  │      │
│   │ PLUGINS      │     │  auth.*      │     │  Database    │      │
│   └──────────────┘     └──────────────┘     └──────────────┘      │
│                                                                     │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │
│   │    Auth      │◀───▶│ ProviderAuth │────▶│   AI SDK     │      │
│   │   Storage    │     │   Service    │     │   Factory    │      │
│   └──────────────┘     └──────────────┘     └──────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| Auth Storage | `packages/opencode/src/auth/index.ts` | 认证数据持久化 |
| Plugin System | `packages/opencode/src/plugin/index.ts` | 插件加载与管理 |
| Hooks Registry | `packages/plugin/src/index.ts` | Hook 类型定义 |
| Provider Manager | `packages/opencode/src/provider/provider.ts` | Provider 信息管理 |
| ProviderAuth Service | `packages/opencode/src/provider/auth.ts` | OAuth/API 认证流程 |
| CLI Providers Command | `packages/opencode/src/cli/cmd/providers.ts` | CLI 认证入口 |

---

## 3. Plugin 与 Hook 机制

### 3.1 Plugin 接口

```typescript
// packages/plugin/src/index.ts
export type Plugin = (input: PluginInput) => Promise<Hooks>

export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>
  project: Project
  directory: string
  worktree: string
  serverUrl: URL
  $: BunShell
}
```

### 3.2 内置插件列表

```typescript
// packages/opencode/src/plugin/index.ts
const INTERNAL_PLUGINS: PluginInstance[] = [
  CodexAuthPlugin,      // OpenAI Codex 认证
  CopilotAuthPlugin,    // GitHub Copilot 认证
  GitlabAuthPlugin,     // GitLab 认证
  CodegenieAuthPlugin,  // ← 新增：CodeGenie 华为认证
]
```

### 3.3 AuthHook 接口定义

```typescript
// packages/plugin/src/index.ts
export type AuthHook = {
  provider: string        // Provider 标识符
  loader?: (...) => Promise<Record<string, any>>
  methods: AuthMethod[]
}
```

---

## 4. 认证入口分析

### 4.1 CLI 入口: `opencode auth login`

**文件**: `packages/opencode/src/cli/cmd/providers.ts`

Provider 列表构建流程：

```typescript
// 1. 从 models.dev 获取基础 providers
const providers = await ModelsDev.get()

// 2. 从 plugins 收集 auth providers
const pluginProviders = resolvePluginProviders({
  hooks: await Plugin.list(),
  existingProviders: providers,
  ...
})

// 3. 合并并按 priority 排序
const priority = {
  codegenie: -1,  // ← 最优先
  opencode: 0,
  openai: 1,
  ...
}

// 4. 构建 options，通过硬编码映射设置 hint
const options = [
  ...providers.map(x => ({
    label: x.name,
    value: x.id,
    hint: {
      openai: "ChatGPT Plus/Pro or API key",
      codegenie: "recommended",  // ← 新增
    }[x.id],
  })),
  ...pluginProviders.map(x => ({
    label: x.name,
    value: x.id,
    hint: "plugin",
  })),
]
```

---

## 5. CodeGenie 集成需求

### 5.1 功能需求

| ID | 需求描述 |
|----|----------|
| REQ-001 | 支持 OAuth 方式登录华为开发者账号 |
| REQ-002 | 登录成功后获取 JWT Token 并安全存储 |
| REQ-003 | 在 CLI `opencode auth login` / `auth logout` / `auth list` 中显示 |
| REQ-004 | 在 provider 列表中显示 "recommended" 提示 |
| REQ-005 | 在 provider 列表中排在最前面 |
| REQ-006 | 登录 CodeGenie OAuth 后，模型选择列表最前面显示 CodeGenie 提供的模型 |
| REQ-007 | CodeGenie 提供 GLM-5 和 deepseek-v3.2 两个模型，均标记为 "Free" |
| REQ-008 | 模型信息暂时硬编码在配置中，不通过 API 动态获取 |
| REQ-009 | 未登录 CodeGenie OAuth 时，不显示 CodeGenie 模型 |

### 5.2 非功能需求

| ID | 需求描述 |
|----|----------|
| NFR-001 | Token 使用 AES-128-GCM 加密存储 |
| NFR-002 | 支持中国、新加坡、欧洲、俄罗斯多区域 |
| NFR-003 | 登录超时可配置（默认 10 分钟） |
| NFR-004 | 对原始代码侵入性最小化 |
| NFR-005 | CodeGenie 模型列表在模型选择对话框中排序优先级最高（位于所有其他 provider 之前） |
| NFR-006 | 模型定义与 opencode 原始代码解耦，集中在 CodeGenie 插件文件中维护 |

---

## 6. 数据流图

### 6.1 CLI 登录流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CLI `opencode auth login` 流程                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Plugin.list() 获取所有插件                                      │
│     │                                                               │
│     ▼                                                               │
│  2. resolvePluginProviders() 提取 auth providers                   │
│     │                                                               │
│     ▼                                                               │
│  3. 按 priority 排序，codegenie(-1) 排最前                          │
│     │                                                               │
│     ▼                                                               │
│  4. 用户选择 provider                                               │
│     │                                                               │
│     ▼                                                               │
│  5. 调用 hook.auth.methods[x].authorize()                          │
│     │  - 启动本地服务器监听回调                                      │
│     │  - 打开浏览器访问华为登录页                                    │
│     │  - 等待用户授权                                                │
│     ▼                                                               │
│  6. 回调返回 JWT Token                                              │
│     │                                                               │
│     ▼                                                               │
│  7. Auth.set(providerID, { type: "api", key: jwtToken })           │
│     │                                                               │
│     ▼                                                               │
│  8. Token 加密存储到 ~/.config/codegenie/token.enc                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. 配置与存储

### 7.1 认证数据存储

| 数据 | 存储位置 | 格式 |
|------|----------|------|
| OpenCode Auth | `~/.local/share/opencode/auth.json` | JSON，权限 0600 |
| CodeGenie Token | `~/.config/codegenie/token.enc` | 加密 JSON |
| CodeGenie Key | `~/.config/codegenie/.token_key` | 二进制，权限 0600 |

### 7.2 华为认证服务配置

```typescript
const DEFAULT_CONFIG = {
  baseUrl: "https://devecostudio.huawei.com",
  authUrl: "console/DevEcoIDE/apply",
  tempTokenCheckUrl: "authrouter/auth/api/temptoken/check",
  jwtTokenCheckUrl: "authrouter/auth/api/jwToken/check",
  appId: "1007",
  defaultPort: 10101,
  timeout: 600000,  // 10 minutes
}
```

---

## 8. 验收标准

| ID | 验收标准 |
|----|----------|
| AC-001 | `opencode auth login` 列表第一项显示 "CodeGenie OAuth (recommended)" |
| AC-002 | 选择 CodeGenie 后能打开浏览器完成登录 |
| AC-003 | 登录成功后 Token 安全存储 |
| AC-004 | `opencode auth list` 显示 "CodeGenie OAuth OAuth" 状态 |
| AC-005 | `opencode auth logout` 能登出 CodeGenie |
| AC-006 | 登录后 `/models` 列表最前面显示 "CodeGenie" 分组，包含 GLM-5 和 deepseek-v3.2 |
| AC-007 | GLM-5 和 deepseek-v3.2 均显示 "Free" 标签 |
| AC-008 | 未登录时 `/models` 列表中不出现 CodeGenie 模型 |
| AC-009 | 选择 CodeGenie 模型后可正常发起对话 |

---

## 9. 附录

### 9.1 文件路径索引

| 用途 | 路径 |
|------|------|
| Plugin 类型定义 | `packages/plugin/src/index.ts` |
| Plugin 管理器 | `packages/opencode/src/plugin/index.ts` |
| CodeGenie 插件 | `packages/opencode/src/plugin/codegenie.ts` |
| CLI 认证命令 | `packages/opencode/src/cli/cmd/providers.ts` |
| Auth 存储 | `packages/opencode/src/auth/index.ts` |
| ProviderAuth 服务 | `packages/opencode/src/provider/auth.ts` |

### 9.2 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 1.0 | 2026-03-25 | 初始版本 |
| 1.1 | 2026-03-25 | 添加 OpenCode 原始代码修改清单 |
| 2.0 | 2026-03-31 | 精简需求，最小化侵入式修改 |
| 2.1 | 2026-04-02 | 添加 CodeGenie 模型列表集成需求（REQ-006~REQ-009） |
