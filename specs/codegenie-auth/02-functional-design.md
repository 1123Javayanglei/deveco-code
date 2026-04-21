# OpenCode 登录鉴权与模型调用机制 - 功能设计说明书

## 1. 文档概述

### 1.1 文档目的
基于需求分析说明书，本文档详细描述 OpenCode 登录鉴权与模型调用各模块的功能设计、接口定义和数据流，为开发者理解和扩展系统提供参考。

### 1.2 设计原则
- **可扩展性**: 通过 Plugin/Hook 机制支持自定义扩展
- **安全性**: 敏感数据加密存储，最小权限原则
- **解耦**: 模块间通过接口通信，降低耦合度
- **一致性**: 统一的认证流程，统一的 API 风格
- **最小侵入**: 对原始代码的修改尽可能少

---

## 2. 模块设计

### 2.1 模块总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           模块架构图                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │   Plugin    │     │    Auth     │     │  Provider   │            │
│    │   Manager   │────▶│   Service   │◀────│   Manager   │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│          │                   │                   │                     │
│          │                   │                   │                     │
│          ▼                   ▼                   ▼                     │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │   Hooks     │     │   Auth      │     │  Provider   │            │
│    │  Registry   │     │   Storage   │     │  Database   │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│                                                                         │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │ ProviderAuth│     │   Models    │     │   AI SDK    │            │
│    │   Service   │────▶│   Discovery │────▶│   Factory   │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| Plugin Manager | 加载和管理插件，分发 Hook 调用 | - |
| Auth Service | 认证数据的 CRUD 操作 | Auth Storage |
| Provider Manager | Provider 信息管理，模型加载 | Auth Service, Provider Database |
| ProviderAuth Service | OAuth/API 认证流程管理 | Auth Service, Hooks Registry |
| Models Discovery | 从 models.dev 获取模型信息 | - |
| AI SDK Factory | 创建和管理 AI SDK 实例 | Provider Manager |

---

## 3. Auth Service 设计

### 3.1 服务接口

```typescript
// packages/opencode/src/auth/index.ts
export namespace Auth {
  // 认证信息类型
  export type Info = Oauth | Api | WellKnown

  // 服务接口
  export interface Interface {
    readonly get: (providerID: string) => Effect.Effect<Info | undefined, AuthError>
    readonly all: () => Effect.Effect<Record<string, Info>, AuthError>
    readonly set: (key: string, info: Info) => Effect.Effect<void, AuthError>
    readonly remove: (key: string) => Effect.Effect<void, AuthError>
  }
}
```

### 3.2 数据模型

```typescript
// OAuth 类型 - 用于 OAuth 认证的 Provider
export class Oauth extends Schema.Class<Oauth>("OAuth")({
  type: Schema.Literal("oauth"),
  refresh: Schema.String,        // 刷新令牌
  access: Schema.String,         // 访问令牌
  expires: Schema.Number,        // 过期时间戳 (ms)
  accountId: Schema.optional(Schema.String),      // 账户 ID
  enterpriseUrl: Schema.optional(Schema.String),  // 企业版 URL
}) {}

// API 类型 - 用于 API Key 认证的 Provider
export class Api extends Schema.Class<Api>("ApiAuth")({
  type: Schema.Literal("api"),
  key: Schema.String,            // API Key
}) {}

// WellKnown 类型 - 特殊认证方式
export class WellKnown extends Schema.Class<WellKnown>("WellKnownAuth")({
  type: Schema.Literal("wellknown"),
  key: Schema.String,
  token: Schema.String,
}) {}
```

### 3.3 存储设计

```
存储位置: ~/.local/share/opencode/auth.json
文件权限: 0600 (仅用户可读写)

格式示例:
{
  "anthropic": {
    "type": "api",
    "key": "sk-ant-api03-..."
  },
  "github-copilot": {
    "type": "oauth",
    "refresh": "gho_...",
    "access": "ghu_...",
    "expires": 1700000000000
  },
  "codegenie": {
    "type": "api",
    "key": "eyJhbG..."
  }
}
```

---

## 4. Plugin System 设计

### 4.1 Plugin 接口

```typescript
// packages/plugin/src/index.ts

// Plugin 输入上下文
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>
  project: Project
  directory: string
  worktree: string
  serverUrl: URL
  $: BunShell
}

// Plugin 定义
export type Plugin = (input: PluginInput) => Promise<Hooks>
```

### 4.2 Hooks 接口

```typescript
export interface Hooks {
  // 事件订阅
  event?: (input: { event: Event }) => Promise<void>

  // 配置通知
  config?: (input: Config) => Promise<void>

  // 自定义工具
  tool?: { [key: string]: ToolDefinition }

  // 认证钩子 ★
  auth?: AuthHook

  // 聊天钩子
  "chat.message"?: (...) => Promise<void>
  "chat.params"?: (...) => Promise<void>
  "chat.headers"?: (...) => Promise<void>

  // 工具钩子
  "tool.execute.before"?: (...) => Promise<void>
  "tool.execute.after"?: (...) => Promise<void>
  "tool.definition"?: (...) => Promise<void>

  // Shell 钩子
  "shell.env"?: (...) => Promise<void>

  // 实验性钩子
  "experimental.chat.messages.transform"?: (...) => Promise<void>
  "experimental.chat.system.transform"?: (...) => Promise<void>
  "experimental.session.compacting"?: (...) => Promise<void>
}
```

### 4.3 AuthHook 详细设计

```typescript
export type AuthHook = {
  // Provider 标识符 (必须匹配 models.dev 中的 ID 或配置文件定义)
  provider: string

  // 配置加载器 - 在 Provider 初始化时被调用
  // 返回值将合并到 Provider 的 options 中
  loader?: (
    getAuth: () => Promise<Auth>,
    provider: Provider
  ) => Promise<Record<string, any>>

  // 认证方法列表 - 显示在登录对话框中
  methods: AuthMethod[]
}
```

### 4.4 AuthMethod 设计

```typescript
type AuthMethod =
  // OAuth 类型
  | {
      type: "oauth"
      label: string                    // 显示标签
      prompts?: AuthPrompt[]           // 可选的交互式提示
      authorize(inputs?): Promise<AuthOuathResult>
    }
  // API Key 类型
  | {
      type: "api"
      label: string
      prompts?: AuthPrompt[]
      authorize?(inputs?): Promise<{
        type: "success"
        key: string
        provider?: string
      } | { type: "failed" }>
    }
```

---

## 5. ProviderAuth Service 设计

### 5.1 服务接口

```typescript
// packages/opencode/src/provider/auth.ts
export namespace ProviderAuth {
  export interface Interface {
    // 获取所有 Provider 的认证方法
    readonly methods: () => Effect.Effect<Record<ProviderID, Method[]>>

    // 发起 OAuth 授权
    readonly authorize: (input: {
      providerID: ProviderID
      method: number
      inputs?: Record<string, string>
    }) => Effect.Effect<Authorization | undefined, Error>

    // OAuth 回调处理
    readonly callback: (input: {
      providerID: ProviderID
      method: number
      code?: string
    }) => Effect.Effect<void, Error>
  }
}
```

---

## 6. Provider Manager 设计

### 6.1 数据结构

```typescript
// Provider 信息
export type Info = {
  id: ProviderID
  name: string
  source: "env" | "config" | "custom" | "api"
  env: string[]                    // 环境变量名列表
  key?: string                     // API Key
  options: Record<string, any>     // SDK 配置
  models: Record<string, Model>    // 模型列表
}
```

### 6.2 加载流程

```typescript
const state = Instance.state(async () => {
  // 1. 加载 models.dev 数据库
  const modelsDev = await ModelsDev.get()
  const database = mapValues(modelsDev, fromModelsDevProvider)

  // 2. 合并配置文件中的 Provider
  for (const [providerID, provider] of configProviders) {
    const existing = database[providerID]
    const parsed = { ...existing, ...provider, source: "config" }
    database[providerID] = parsed
  }

  // 3. 检查环境变量
  const env = Env.all()
  for (const [id, provider] of Object.entries(database)) {
    const apiKey = provider.env.map((item) => env[item]).find(Boolean)
    if (apiKey) {
      mergeProvider(id, { source: "env", key: provider.env.length === 1 ? apiKey : undefined })
    }
  }

  // 4. 检查 Auth 存储
  for (const [id, auth] of Object.entries(await Auth.all())) {
    if (auth.type === "api") {
      mergeProvider(id, { source: "api", key: auth.key })
    }
  }

  // 5. 调用 Plugin auth.loader
  for (const plugin of await Plugin.list()) {
    if (!plugin.auth) continue
    const auth = await Auth.get(plugin.auth.provider)
    if (auth && plugin.auth.loader) {
      const options = await plugin.auth.loader(() => Auth.get(...), provider)
      mergeProvider(plugin.auth.provider, { options })
    }
  }

  return { providers, models, sdk, modelLoaders }
})
```

---

## 7. CodeGenie 认证插件设计

### 7.1 模块结构

```typescript
// packages/opencode/src/plugin/codegenie.ts

// ==================== 核心类 ====================
// - TokenStorage: AES-128-GCM 加密的 Token 存储
// - LocalAuthServer: 本地 OAuth 回调服务器
// - LoginService: 华为 OAuth 登录服务
// - HttpClient: HTTP 请求封装

// ==================== 配置常量 ====================
const PROVIDER_ID = "codegenie"

const DEFAULT_CONFIG = {
  baseUrl: "https://devecostudio.huawei.com",
  authUrl: "console/DevEcoIDE/apply",
  tempTokenCheckUrl: "authrouter/auth/api/temptoken/check",
  jwtTokenCheckUrl: "authrouter/auth/api/jwToken/check",
  appId: "1007",
  defaultPort: 10101,
  timeout: 20000,
}

// ==================== 多区域支持 ====================
const CountryCode = { CHINA: "CN", RUSSIA: "RU", SINGAPORE: "SG", EUROPE: "EU" }
const SiteId = { CHINA: "1", SINGAPORE: "5", EUROPE: "7", RUSSIA: "8" }
```

### 7.2 TokenStorage 设计

```typescript
class TokenStorage {
  private keyFilePath: string    // ~/.config/codegenie/.token_key
  private algorithm = "aes-128-gcm"
  private keyLength = 16
  private ivLength = 12

  // 加密存储 Token
  async saveToken(token: string): Promise<void> {
    const { encrypted, iv, authTag } = this.encrypt(token)
    const tokenData = { encrypted, iv, authTag, timeStamp: Date.now() }
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData), { mode: 0o600 })
  }

  // 解密读取 Token
  async loadToken(): Promise<string | null> {
    const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, "utf8"))
    return this.decrypt(tokenData.encrypted, tokenData.iv, tokenData.authTag)
  }

  // 清除 Token
  async clearToken(): Promise<void> {
    fs.unlinkSync(tokenFilePath)
  }
}
```

### 7.3 LocalAuthServer 设计

```typescript
class LocalAuthServer {
  private server: http.Server | null = null
  private callbackPath = "/callback"

  // 启动服务器，尝试多个端口
  async start(): Promise<number> {
    const portsToTry = [10101, 34567, 34568, 34569, 34570]
    for (const port of portsToTry) {
      try {
        return await this.tryPort(port)
      } catch {}
    }
    throw new Error("All ports are in use")
  }

  // 等待 OAuth 回调
  async waitForCallback(timeout = 30000): Promise<CallbackData> {
    return new Promise((resolve, reject) => {
      this.resolveCallback = resolve
      this.rejectCallback = reject
      setTimeout(() => reject(new Error("Timeout")), timeout)
    })
  }
}
```

### 7.4 LoginService 设计

```typescript
class LoginService {
  async login(): Promise<LoginResult> {
    // 1. 生成 client secret
    const clientSecret = this.generateClientSecret()

    // 2. 启动本地服务器
    await this.server.start()

    // 3. 打开登录页面
    await this.openLoginPage(this.server.getPort(), clientSecret)

    // 4. 等待回调获取 tempToken
    const callbackData = await this.server.waitForCallback()

    // 5. 用 tempToken 换取 jwtToken
    const jwtToken = await this.getJwtToken(callbackData.tempToken, callbackData.siteId)

    // 6. 获取用户信息
    const userInfo = await this.getUserInfoFromJwt(jwtToken)

    // 7. 存储 Token
    await tokenStorage.saveToken(jwtToken)

    return { success: true, userInfo }
  }
}
```

### 7.5 Plugin 入口

```typescript
export async function CodegenieAuthPlugin(_input: PluginInput): Promise<Hooks> {
  return {
    auth: {
      provider: PROVIDER_ID,

      async loader(getAuth, _provider) {
        const info = await getAuth()
        if (!info) return {}

        return {
          apiKey: info.type === "api" ? info.key : info.type === "wellknown" ? info.key : undefined,
        }
      },

      methods: [
        {
          type: "api",
          label: "Login with Huawei DevEco Account",
          async authorize() {
            const result = await codegenieAuth.login()

            if (!result.success) {
              return { type: "failed" }
            }

            return {
              type: "success",
              key: result.userInfo?.jwtToken || "",
              provider: PROVIDER_ID,
            }
          },
        },
      ],
    },
  }
}
```

---

## 8. 安全设计

### 8.1 认证数据安全

| 数据 | 存储位置 | 权限 | 加密 |
|------|----------|------|------|
| API Key (OpenCode) | auth.json | 0600 | 无 |
| JWT Token (CodeGenie) | token.enc | 0600 | AES-128-GCM |
| 加密密钥 | .token_key | 0600 | - |

### 8.2 OAuth 安全

- **本地服务器**: 只监听回调，不暴露敏感信息
- **超时机制**: 默认 10 分钟超时（600000ms）
- **端口复用**: 支持多端口尝试（10101, 34567-34570），避免端口冲突

---

## 9. 源码修改清单

> 详细的源码修改清单请参见：[source-code-changes.md](./source-code-changes.md)

**修改概览**:
- 修改 2 个文件：`plugin/index.ts`, `cli/cmd/providers.ts`
- 新增 1 个文件：`plugin/codegenie.ts` (~860 行)

---

## 13. CodeGenie 模型列表集成设计

### 13.1 功能概述

在用户通过 CodeGenie OAuth 登录后，在 TUI 模型选择对话框（`/models`）中显示 CodeGenie 提供的免费模型。CodeGenie 模型分组位于所有其他 provider 分组之前，作为推荐选项。

### 13.2 模型数据

硬编码在独立资源文件 `codegenie-models.ts` 中，不通过 API 动态获取：

| 模型 ID | 显示名称 | 标签 | 说明 |
|---------|----------|------|------|
| `glm-5` | GLM-5 | Free | 智谱 GLM-5 模型 |
| `deepseek-v3.2` | deepseek-v3.2 | Free | DeepSeek V3.2 模型 |

### 13.3 实现设计

采用**配置注入 + 最小修改**策略，利用 opencode 已有的 config-based provider 注入机制：

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CodeGenie 模型注入流程                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Provider.state() 初始化                                         │
│     │                                                               │
│     ├─ 检查 Auth.get("codegenie") 是否存在                          │
│     │  └─ 若存在：将 CODEGENIE_PROVIDER_CONFIG 注入 configProviders │
│     │                                                               │
│     ├─ 现有 config-based provider 解析流程 (lines 962-1043)         │
│     │  └─ 自动构建 database["codegenie"] = Info { models, ... }    │
│     │                                                               │
│     ├─ Auth 加载 (lines 1058-1068)                                  │
│     │  └─ mergeProvider("codegenie", { source: "api", key })       │
│     │                                                               │
│     ├─ Plugin auth loader (lines 1070-1085)                         │
│     │  └─ 设置 options.apiKey = jwtToken                           │
│     │                                                               │
│     └─ CUSTOM_LOADERS (lines 1087-1104)                             │
│        └─ codegenie loader: autoload=true, 设置 baseURL             │
│                                                                     │
│  2. Provider.list() → /config/providers → sync.tsx → DialogModel   │
│     └─ DialogModel 中 codegenie 排序在最前面                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.4 注入点设计

#### 13.4.1 模型定义（codegenie-models.ts）

在独立资源文件中导出 `CODEGENIE_PROVIDER_CONFIG`，符合 `Config.Provider` schema：

```typescript
export const CODEGENIE_PROVIDER_CONFIG: Config.Provider = {
  name: "CodeGenie",
  npm: "@ai-sdk/openai-compatible",
  api: "<CodeGenie API Gateway URL>",
  env: [],
  models: {
    "glm-5": {
      name: "GLM-5",
      attachment: true,
      reasoning: true,
      temperature: true,
      tool_call: true,
      limit: { context: 128000, output: 8192 },
      cost: { input: 0, output: 0 },
    },
    "deepseek-v3.2": {
      name: "deepseek-v3.2",
      attachment: true,
      reasoning: true,
      temperature: true,
      tool_call: true,
      limit: { context: 128000, output: 8192 },
      cost: { input: 0, output: 0 },
    },
  },
}
```

#### 13.4.2 Provider 注入（provider.ts）

在 `configProviders` 解析之后（line 947），注入 CodeGenie 配置：

```typescript
// line 947: const configProviders = Object.entries(config.provider ?? {})

// === CodeGenie: inject provider config if authenticated ===
const codegenieAuth = await Auth.get("codegenie")
if (codegenieAuth) {
  const { CODEGENIE_PROVIDER_CONFIG } = await import("@/plugin/codegenie-models")
  configProviders.push(["codegenie", CODEGENIE_PROVIDER_CONFIG])
}
```

#### 13.4.3 Custom Loader（provider.ts CUSTOM_LOADERS）

添加 codegenie custom loader，设置 SDK 初始化参数：

```typescript
codegenie: async (provider) => {
  const auth = await Auth.get("codegenie")
  if (!auth) return { autoload: false }

  return {
    autoload: true,
    options: {
      apiKey: auth.type === "api" ? auth.key : undefined,
    },
  }
},
```

#### 13.4.4 DialogModel 排序调整（dialog-model.tsx）

修改 provider 排序逻辑，使 codegenie 排在 opencode 之前：

```typescript
// 修改前
sortBy(
  (provider) => provider.id !== "opencode",
  (provider) => provider.name,
),

// 修改后
sortBy(
  (provider) => provider.id !== "codegenie" && provider.id !== "opencode",
  (provider) => provider.id === "opencode",
  (provider) => provider.name,
),
```

修改 "Free" 标签显示条件，支持 codegenie：

```typescript
// 修改前
footer: model.cost?.input === 0 && provider.id === "opencode" ? "Free" : undefined,

// 修改后
footer: model.cost?.input === 0 && (provider.id === "opencode" || provider.id === "codegenie")
  ? "Free" : undefined,
```

同样修改 `toOptions` 函数中的 footer 和 disabled 逻辑。

### 13.5 条件显示逻辑

| 条件 | 行为 |
|------|------|
| 已登录 CodeGenie OAuth | 模型列表最前面显示 CodeGenie 分组，包含 2 个 Free 模型 |
| 未登录 CodeGenie OAuth | 不注入配置，模型列表不显示 CodeGenie |
| 登出 CodeGenie | Provider.state 重新初始化时不再注入，模型自动消失 |

### 13.6 对话调用链路

选择 CodeGenie 模型后的调用链路：

```
用户选择 GLM-5
  → local.model.set({ providerID: "codegenie", modelID: "glm-5" })
  → Provider.getLanguage(model)
  → getSDK(model)
  → createOpenAICompatible({ baseURL, apiKey })
  → sdk.languageModel("glm-5")
  → API 请求发送到 CodeGenie Gateway
```

### 13.7 修改文件汇总

| 文件 | 修改类型 | 修改量 | 说明 |
|------|----------|--------|------|
| `plugin/codegenie-models.ts` | 新增 | ~45 行 | CodeGenie 模型资源定义 |
| `provider/provider.ts` | 修改 | ~15 行 | 注入配置 + 添加 custom loader |
| `cli/cmd/tui/component/dialog-model.tsx` | 修改 | ~5 行 | 排序 + Free 标签 |

---

## 10. 数据流图

### 10.1 CLI 登录流程

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
│     │  - 启动本地服务器监听回调 (port 10101)                         │
│     │  - 打开浏览器访问华为登录页                                    │
│     │  - 等待用户授权                                                │
│     ▼                                                               │
│  6. 回调返回 tempToken + siteId                                     │
│     │                                                               │
│     ▼                                                               │
│  7. 用 tempToken 换取 jwtToken                                      │
│     │                                                               │
│     ▼                                                               │
│  8. 用 jwtToken 换取 accessToken + refreshToken                    │
│     │                                                               │
│     ▼                                                               │
│  9. Auth.set("codegenie", {                                         │
│       type: "oauth",                                                │
│       access: accessToken,                                          │
│       refresh: refreshToken,                                        │
│       expires: Date.now() + 30min                                   │
│     })                                                              │
│     │                                                               │
│     ▼                                                               │
│  10. jwtToken 加密存储到 ~/.config/codegenie/token.enc              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 登录接口调用详情

#### 步骤 5：打开浏览器登录页

**请求方式**: 浏览器打开 URL

**请求 URL**:
```
GET {regionalizedBaseUrl}/{authUrl}?port={port}&appid={appId}&code={clientSecret}
```

**示例**:
```
GET https://cn.devecostudio.huawei.com/console/DevEcoIDE/apply?port=10101&appid=1008&code=a1b2c3d4e5f6...
```

**参数说明**:

| 参数 | 值 | 说明 |
|------|-----|------|
| `port` | `10101` | 本地回调服务器端口 |
| `appid` | `1008` | CodeGenie 专用 AppId |
| `code` | UUID (无横线) | 一次性 clientSecret，用于验证回调合法性 |

**区域化 Base URL**:

| 国家 | Base URL |
|------|----------|
| CN | `https://cn.devecostudio.huawei.com` |
| SG | `https://devecostudio.huawei.com` |
| EU | `https://eu.devecostudio.huawei.com` |
| RU | `https://ru.devecostudio.huawei.com` |

---

#### 步骤 6：OAuth 回调

**回调 URL**:
```
GET http://localhost:{port}/callback?code={clientSecret}&tempToken={tempToken}&siteId={siteId}
```

**示例**:
```
GET http://localhost:10101/callback?code=a1b2c3d4e5f6...&tempToken=eyJhbG...&siteId=1
```

**回调参数**:

| 参数 | 说明 |
|------|------|
| `code` | 与步骤 5 的 clientSecret 比对，验证回调合法性 |
| `tempToken` | 临时令牌，用于换取 jwtToken |
| `siteId` | 站点 ID：`1`=CN, `5`=SG, `7`=EU, `8`=RU |
| `quit` | 可选，`true`/`access_denied` 表示用户取消 |

---

#### 步骤 7：用 tempToken 换取 jwtToken

**请求方式**: `GET`

**请求 URL**:
```
GET {regionalizedBaseUrl}/{tempTokenCheckUrl}?tempToken={tempToken}&site={countryCode}&version=1.0.0&appid=1008
```

**示例**:
```
GET https://cn.devecostudio.huawei.com/authrouter/auth/api/temptoken/check?tempToken=eyJhbG...&site=CN&version=1.0.0&appid=1008
```

**请求参数**:

| 参数 | 说明 |
|------|------|
| `tempToken` | 步骤 6 回调获取的临时令牌 |
| `site` | 国家码：CN / SG / EU / RU |
| `version` | 固定值 `"1.0.0"` |
| `appid` | 固定值 `"1008"` |

**返回值**: 纯文本 jwtToken（三段式 JWT 格式）

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VyTmFtZSI6InVzZXIwMDEiLCJleHAiOjE3MDAwMDAwMDAsImlhdCI6MTcwMDAwMDAwMH0.xxxxx
```

**jwtToken Payload 结构**:
```json
{
  "userId": "123456",
  "userName": "user001",
  "exp": 1700000000,
  "iat": 1700000000
}
```

---

#### 步骤 8：用 jwtToken 换取 accessToken + refreshToken

**请求方式**: `GET`

**请求 URL**:
```
GET {regionalizedBaseUrl}/{jwtTokenCheckUrl}
```

**示例**:
```
GET https://cn.devecostudio.huawei.com/authrouter/auth/api/jwToken/check
```

**请求 Headers**:

| Header | 值 | 说明 |
|--------|-----|------|
| `refresh` | `"false"` | 首次获取 token |
| `jwtToken` | 步骤 7 获取的 jwtToken | JWT 令牌 |

**返回值**:
```json
{
  "status": true,
  "userInfo": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "nationalCode": "CN",
    "realName": "true"
  }
}
```

**返回字段说明**:

| 字段 | 说明 |
|------|------|
| `status` | 请求是否成功 |
| `userInfo.accessToken` | 访问令牌，有效期 **30 分钟**，用于 API 鉴权 |
| `userInfo.refreshToken` | 刷新令牌，用于在 accessToken 过期后刷新 |
| `userInfo.nationalCode` | 国家码 |
| `userInfo.realName` | 是否实名认证 |

---

#### 步骤 9：保存到 Auth 存储

**存储格式** (Oauth 类型):
```json
{
  "type": "oauth",
  "access": "<accessToken>",
  "refresh": "<refreshToken>",
  "expires": 1700000000000
}
```

**存储位置**: `~/.local/share/opencode/auth.json`

**过期时间**: 当前时间 + 30 分钟（`ACCESS_TOKEN_EXPIRES_MS = 30 * 60 * 1000`）

---

### 10.3 Token 刷新流程

当 accessToken 过期（超过 30 分钟）时，使用 `refresh: "true"` 刷新：

**请求方式**: `GET`

**请求 URL**:
```
GET {regionalizedBaseUrl}/{jwtTokenCheckUrl}
```

**请求 Headers**:

| Header | 值 | 说明 |
|--------|-----|------|
| `refresh` | `"true"` | **刷新模式** |
| `jwtToken` | 当前 jwtToken | JWT 令牌 |

**返回值**: 与步骤 8 相同格式

```json
{
  "status": true,
  "userInfo": {
    "accessToken": "<新的 accessToken>",
    "refreshToken": "<新的 refreshToken>",
    "nationalCode": "CN",
    "realName": "true"
  }
}
```

**刷新流程**:
```
accessToken 过期 (30min)
  │
  ├─ 检查 Auth.get("codegenie").expires
  │  └─ Date.now() >= expires → 需要刷新
  │
  ├─ 调用 LoginService.refreshToken(jwtToken)
  │  └─ GET jwtTokenCheckUrl (refresh: "true")
  │
  ├─ 成功 → 更新 Auth 存储
  │  └─ Auth.set("codegenie", { type: "oauth", access, refresh, expires })
  │
  └─ 失败 → 跳过当前操作（打点上报、模型请求等）
```

---

## 11. 测试设计

### 11.1 单元测试

```typescript
describe("TokenStorage", () => {
  it("should encrypt and decrypt token", async () => {
    const storage = new TokenStorage()
    await storage.saveToken("test-jwt-token")
    const token = await storage.loadToken()
    expect(token).toBe("test-jwt-token")
  })

  it("should clear token", async () => {
    const storage = new TokenStorage()
    await storage.saveToken("test-token")
    await storage.clearToken()
    const token = await storage.loadToken()
    expect(token).toBeNull()
  })
})

describe("LoginService", () => {
  it("should generate valid client secret", () => {
    const service = new LoginService()
    const secret = service.generateClientSecret()
    expect(secret).toMatch(/^[a-f0-9]{32}$/)
  })
})
```

### 11.2 集成测试

```typescript
describe("CodeGenie Auth Flow", () => {
  it("should register in plugin list", async () => {
    const plugins = await Plugin.list()
    const codegenie = plugins.find(p => p.auth?.provider === "codegenie")
    expect(codegenie).toBeDefined()
  })

  it("should appear in auth login options", async () => {
    const options = await buildLoginOptions()
    const codegenie = options.find(o => o.value === "codegenie")
    expect(codegenie).toBeDefined()
    expect(codegenie.hint).toBe("recommended")
  })
})
```

---

## 12. 附录

### 12.1 完整文件列表

| 文件 | 用途 | 状态 |
|------|------|------|
| `packages/opencode/src/auth/index.ts` | Auth 服务实现 | 未修改 |
| `packages/opencode/src/plugin/index.ts` | Plugin 管理器 | **已修改** |
| `packages/opencode/src/plugin/codegenie.ts` | CodeGenie 插件 | **新增** |
| `packages/opencode/src/provider/provider.ts` | Provider 管理器 | 未修改 |
| `packages/opencode/src/provider/auth.ts` | ProviderAuth 服务 | 未修改 |
| `packages/opencode/src/cli/cmd/providers.ts` | CLI 认证命令 | **已修改** |
| `packages/plugin/src/index.ts` | Hooks 类型定义 | 未修改 |

### 12.2 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 1.0 | 2026-03-25 | 初始版本 - 功能设计文档 |
| 1.1 | 2026-03-25 | 添加 OpenCode 原始代码修改清单 |
| 2.0 | 2026-03-31 | 精简为最小侵入式修改方案，添加源码修改章节 |
| 2.1 | 2026-04-02 | 添加 CodeGenie 模型列表集成设计（Section 13） |
| 2.2 | 2026-04-08 | 更新登录流程：oauth 类型、accessToken 过期机制、接口调用详情（Section 10.2-10.3） |
