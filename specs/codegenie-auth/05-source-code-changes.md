# CodeGenie OAuth 认证 - 源码修改清单

**功能分支**: `codegenie-auth`
**创建日期**: 2026-03-25
**状态**: 已实现（阶段 1-4，含 Bug 修复）
**Commit ID**: 参见 git log

> **设计原则**: 最小侵入式修改，只在必要的位置添加代码，新增功能通过独立文件实现。
> **关键约束**: 插件和 TUI 组件文件不导入 `AppRuntime`/`Effect`，避免循环依赖导致黑屏。

---

## 1. 修改概览

| 文件 | 修改类型 | 行数 | 说明 |
|------|----------|------|------|
| `packages/opencode/src/plugin/codegenie.ts` | 新增 | ~1000 | CodeGenie OAuth 认证插件实现 |
| `packages/opencode/src/plugin/codegenie-models.ts` | 新增 | ~25 | CodeGenie 模型资源定义 |
| `packages/opencode/src/plugin/index.ts` | 修改 | 2 | 导入并注册 CodegenieAuthPlugin |
| `packages/opencode/src/cli/cmd/providers.ts` | 修改 | ~20 | 添加 codegenie 配置、优先级、排序 |
| `packages/opencode/src/provider/provider.ts` | 修改 | ~50 | 注入 CodeGenie 配置 + custom loader |
| `packages/opencode/src/cli/cmd/tui/routes/home.tsx` | 修改 | ~40 | 添加认证检测 + CodeGenieOnboarding 条件渲染 |
| `packages/opencode/src/cli/cmd/tui/app.tsx` | 未修改 | 0 | 首次引导由 home.tsx 独立处理，app.tsx 保持不变 |
| `packages/opencode/src/cli/cmd/tui/component/codegenie-onboarding.tsx` | 新增 | ~420 | CodeGenie 首次使用引导组件 |
| `packages/opencode/src/cli/logo.ts` | 修改 | ~45 | 替换为 CodeGenie ASCII Logo 数据 |
| `packages/opencode/src/cli/cmd/tui/component/logo.tsx` | 修改 | ~30 | 添加 column 属性、Show 导入 |
| `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` | 修改 | ~5 | 排序 codegenie 最前 + Free 标签 |

**总计**: 修改 7 个文件，新增 3 个文件，1 个文件未修改。

---

## 2. 新增文件说明

### `packages/opencode/src/plugin/codegenie.ts`

**职责**: 实现 CodeGenie 华为账号 OAuth 认证功能

**核心模块**:

| 模块 | 职责 |
|------|------|
| 类型定义 | 定义 UserInfo, LoginResult, JwtPayload, CallbackData, LoginConfig 等类型 |
| 常量定义 | DEFAULT_CONFIG, CountryCode, LanguageCode, SiteId 多区域配置 |
| HttpClient | HTTP 请求封装，支持 GET/POST |
| TokenStorage | AES-128-GCM 加密存储 JWT Token |
| LocalAuthServer | 本地 OAuth 回调服务器，多端口支持（10101, 34567-34570） |
| LoginService | 华为 OAuth 登录核心逻辑，含区域化 URL 生成 |
| CodeGenieAuth | 公共 API: login(), logout(), isLoggedIn(), refreshToken(), isTokenExpired(), getSession() |
| saveAuthToDisk | 直接写 auth.json 的工具函数（避免循环依赖） |
| CodegenieAuthPlugin | Plugin 入口，导出 AuthHook |

**关键配置**:

```typescript
const DEFAULT_CONFIG: LoginConfig = {
  baseUrl: "https://devecostudio.huawei.com",
  appId: "1008",
  authUrl: "console/DevEcoIDE/apply",
  successRedirectUrl: "console/DevEcoCodeGenie/loginSuccess",
  failedRedirectUrl: "console/DevEcoCodeGenie/loginFailed",
  tempTokenCheckUrl: "authrouter/auth/api/temptoken/check",
  jwtTokenCheckUrl: "authrouter/auth/api/jwToken/check",
  defaultPort: 10101,
  timeout: 600000,
  countryCode: "CN",
}
```

**存储位置**:
- Token: `~/.config/codegenie/token.enc` (AES-128-GCM 加密)
- 密钥: `~/.config/codegenie/.token_key`

**关键设计决策 — saveAuthToDisk**:

在 Effect 框架下，`plugin/codegenie.ts` 不能导入 `AppRuntime` 或 `Effect`，否则会引发循环依赖导致 TUI 黑屏。因此使用 `saveAuthToDisk()` 直接读写 auth.json 文件：

```typescript
import { Global } from "@/global"

const authFilePath = path.join(Global.Path.data, "auth.json")
export async function saveAuthToDisk(key: string, info: Record<string, unknown>) {
  try {
    let data: Record<string, unknown> = {}
    if (fs.existsSync(authFilePath)) {
      data = JSON.parse(fs.readFileSync(authFilePath, "utf8"))
    }
    data[key] = info
    fs.writeFileSync(authFilePath, JSON.stringify(data, null, 2), { mode: 0o600 })
  } catch {}
}
```

> **Bug 修复 (2026-04-25)**: 原实现硬编码路径为 `path.join(homedir(), ".local", "share", "opencode", "auth.json")`，与 `Auth.Service` 读取路径 `~/.local/share/codegenie/auth.json` 不一致，导致 TUI 内登录后认证数据不可见。修复后使用 `Global.Path.data` 动态获取路径，确保与 `Auth.Service` 读写同一文件。

### `packages/opencode/src/plugin/codegenie-models.ts`

**职责**: CodeGenie 模型资源定义

```typescript
export const CODEGENIE_PROVIDER_CONFIG = {
  name: "CodeGenie",
  npm: "@ai-sdk/openai-compatible",
  api: "https://cn.devecostudio.huawei.com/sse/codeGenie/maas/v2",
  env: [],
  models: {
    "glm-5": { name: "glm-5", reasoning: true, tool_call: true, limit: { context: 202752, output: 131072 } },
    "deepseek-v3.2": { name: "deepseek-v3.2", tool_call: true, limit: { context: 131072, output: 65536 } },
  },
} satisfies Config.Provider
```

### `packages/opencode/src/cli/cmd/tui/component/codegenie-onboarding.tsx`

**职责**: 首次使用 CodeGenie 时的引导界面组件

**三步引导流程**:

| 步骤 | 说明 |
|------|------|
| `entry` | 显示两个选项：CodeGenie OAuth、Other providers |
| `auth` | CodeGenie 浏览器 OAuth 登录等待界面 |
| `providers` | 其他 Provider 列表（排除 codegenie，按优先级排序） |

**关键设计**:
- 使用 `saveAuthToDisk()` 写入认证数据（不导入 AppRuntime/Effect）
- 键盘事件在 dialog 打开时自动禁用
- 引导完成后调用 `props.onComplete()` 通知父组件

---

## 3. 详细修改说明

### 3.1 注册内置插件

**文件**: `packages/opencode/src/plugin/index.ts`

**修改内容**: 导入并注册 CodegenieAuthPlugin

```typescript
import { CodegenieAuthPlugin } from "./codegenie"

const INTERNAL_PLUGINS: PluginInstance[] = [
  CodexAuthPlugin,
  CopilotAuthPlugin,
  GitlabAuthPlugin,
  PoeAuthPlugin,
  CloudflareWorkersAuthPlugin,
  CloudflareAIGatewayAuthPlugin,
  CodegenieAuthPlugin,  // ← 新增
]
```

---

### 3.2 app.tsx 修改

**文件**: `packages/opencode/src/cli/cmd/tui/app.tsx`

**修改类型**: 未修改

**说明**: 原计划移除自动弹出 `DialogProviderList` 的 `createEffect`，但实际实现中 `app.tsx` 保持不变。首次引导逻辑由 `home.tsx` 中的 `CodeGenieOnboarding` 组件独立处理，`app.tsx` 中的 `DialogProviderList` 仍保留用于 `/connect` 命令等场景。

---

### 3.3 home.tsx 修改

**文件**: `packages/opencode/src/cli/cmd/tui/routes/home.tsx`

**修改内容**:

1. **添加认证检测**: 使用 `sync.data.provider` 判断用户是否有凭证
2. **条件渲染**: 无凭证时显示 `CodeGenieOnboarding`，有凭证时显示主界面

```tsx
const [showOnboarding, setShowOnboarding] = createSignal(false)

createEffect(
  on(
    () => sync.status,
    (status) => {
      if (status !== "complete") return
      const hasCredentials = sync.data.provider.some(
        (x) => x.id !== "opencode" || Object.values(x.models).some((y) => y.cost?.input !== 0),
      )
      if (!hasCredentials) setShowOnboarding(true)
    },
  ),
)
```

**不使用 `Auth.all()` 的原因**: 导入 `Auth`/`AppRuntime`/`Effect` 会引发循环依赖导致黑屏。`sync.data.provider` 已经足够判断是否有凭证。

---

### 3.4 logo.tsx 修改

**文件**: `packages/opencode/src/cli/cmd/tui/component/logo.tsx`

**修改内容**:

1. **添加 `Show` 导入**
2. **添加 `column` 属性**: 支持 `"left"` | `"right"` | undefined（显示全部）
3. **条件渲染**: 根据 `props.column` 只渲染左列、右列或全部

---

### 3.5 logo.ts 修改

**文件**: `packages/opencode/src/cli/logo.ts`

**修改类型**: 替换 Logo 数据为 CodeGenie 三 G 渐变设计（11 行 left + 12 行 right）。

---

### 3.6 providers.ts 修改

**文件**: `packages/opencode/src/cli/cmd/providers.ts`

**修改内容**:

1. 添加 `PLUGIN_PROVIDER_CONFIG` 常量映射 codegenie 的自定义名称
2. 添加 codegenie 优先级 `-1`（排在第一位）
3. 添加 codegenie hint `"recommended"`
4. **Bug 修复 (2026-04-25)**: 将 `pluginProviders` 从追加到数组末尾改为与 `providers` 合并后统一 `sortBy` 排序
5. **Bug 修复 (2026-04-25)**: 新增 `PLUGIN_HINT` 映射，让 codegenie 的 hint 为 `"recommended"` 而非 `"plugin"`

**修复前**:
```typescript
const options = [
  ...pipe(providers, values(), sortBy(...), map(...)),
  ...pluginProviders.map((x) => ({ label: x.name, value: x.id, hint: "plugin" })),
]
```

**修复后**:
```typescript
const PLUGIN_HINT: Record<string, string> = { codegenie: "recommended" }
const options = sortBy(
  [
    ...pipe(providers, values(), map(...)),
    ...pluginProviders.map((x) => ({ label: x.name, value: x.id, hint: PLUGIN_HINT[x.id] ?? "plugin" })),
  ],
  (x) => priority[x.value] ?? 99,
  (x) => x.label ?? x.value,
)
```

---

### 3.7 provider.ts 修改

**文件**: `packages/opencode/src/provider/provider.ts`

**修改位置 1**: 约第 1148 行，`configProviders` 定义之后

```typescript
const codegenieAuth = yield* auth.get("codegenie").pipe(Effect.orElseSucceed(() => undefined))
if (codegenieAuth) {
  const { CODEGENIE_PROVIDER_CONFIG } = yield* Effect.promise(() => import("@/plugin/codegenie-models"))
  configProviders.push(["codegenie", CODEGENIE_PROVIDER_CONFIG])
}
```

**修改位置 2**: `getSmallModel` 函数中，为 codegenie provider 指定小模型优先级

```typescript
if (providerID.startsWith("codegenie")) {
  priority = ["deepseek-v3.2"]
}
```

> **说明**: codegenie provider 目前提供 `glm-5`（大模型）和 `deepseek-v3.2`（轻量模型），选择 `deepseek-v3.2` 作为 small model 用于摘要、标题生成等辅助任务。

**修改位置 3**: `custom(dep)` 函数末尾，添加 `codegenie` custom loader

```typescript
codegenie: Effect.fnUntraced(function* () {
  const auth = yield* dep.auth("codegenie")
  if (!auth) return { autoload: false }
  if (auth.type === "oauth") {
    if (auth.expires && Date.now() >= auth.expires) {
      const { codegenieAuth } = yield* Effect.promise(() => import("@/plugin/codegenie"))
      const newTokens = yield* Effect.promise(() => codegenieAuth.refreshToken())
      if (newTokens) {
        return { autoload: true, options: { apiKey: newTokens.accessToken } }
      }
      return { autoload: false }
    }
    return { autoload: true, options: { apiKey: auth.access } }
  }
  return { autoload: false }
}),
```

---

### 3.8 dialog-model.tsx 修改

**文件**: `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`

**修改内容 1**: Provider 排序（codegenie 排在 opencode 之前）

```typescript
sortBy(
  (provider) => provider.id !== "codegenie" && provider.id !== "opencode",
  (provider) => provider.id === "opencode",
  (provider) => provider.name,
),
```

**修改内容 2**: "Free" 标签支持 codegenie（两处）

```typescript
footer: model.cost?.input === 0 && (provider.id === "opencode" || provider.id === "codegenie") ? "Free" : undefined,
```

---

## 4. 与 copy 项目的主要差异

| 差异项 | copy 项目 | 新项目 | 原因 |
|--------|-----------|--------|------|
| Auth 写入方式 | `Auth.set()` (namespace 便捷函数) | `saveAuthToDisk()` (直接文件写入) | 新项目无 Auth 便捷函数，且导入 AppRuntime/Effect 导致循环依赖黑屏 |
| 认证检测 | `Auth.all()` + `AppRuntime.runPromise` | `sync.data.provider.some(...)` | 避免在 TUI 组件中导入 Auth/AppRuntime/Effect |
| Plugin 系统 | `ServiceMap.Service` | `Context.Service` | 新项目使用不同的 Effect Context API |
| Onboarding 触发 | `Auth.all()` 在 home.tsx | `sync.data.provider` 在 home.tsx | 避免循环依赖 |
| Logo 组件 | 自定义渐变渲染 + charMap/charOpacity | 添加 `column` prop + `Show` 条件渲染 | 新项目 logo.tsx 使用高级 shader 动画，改动最小化 |

---

## 5. 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 1.0 | 2026-03-25 | 初始版本（copy 项目） |
| 2.0 | 2026-04-21 | 适配新工程 Effect 框架：saveAuthToDisk 替代 Auth.set、sync.data.provider 替代 Auth.all |
| 2.1 | 2026-04-21 | 按 SDD 格式更新：修正 app.tsx 为未修改、补充 DEFAULT_CONFIG 完整字段、补充 CodeGenieAuth API、修正核心模块描述 |
| 3.0 | 2026-04-25 | Bug 修复：saveAuthToDisk 路径改用 Global.Path.data、providers.ts 统一排序 + PLUGIN_HINT |
