# 功能设计说明书: CodeGenie 华为账号登录集成

**功能分支**: `codegenie-auth`
**创建日期**: 2026-03-25
**状态**: 已实现（阶段 1-3）
**关联需求文档**: [01-requirements-analysis.md](./01-requirements-analysis.md)

---

## 目录

1. [功能概述](#1-功能概述)
2. [实现思路](#2-实现思路)
3. [实现设计](#3-实现设计)
4. [接口设计](#4-接口设计)
5. [周边依赖关系](#5-周边依赖关系)
6. [安全隐私设计](#6-安全隐私设计)
7. [性能功耗设计](#7-性能功耗设计)
8. [本地数据库设计](#8-本地数据库设计)
9. [DFX分析](#9-dfx分析)
10. [其它功能性设计](#10-其它功能性设计)
- [附录](#附录)

---

## 1. 功能概述

### 1.1 功能简介

基于需求分析说明书，本文档详细描述 CodeGenie 华为账号登录、TUI 引导、模型列表集成各模块的功能设计、接口定义和数据流。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 支持华为 OAuth 登录 + 模型列表集成 + TUI 引导 | 用户可在 30 秒内完成首次配置 |
| 性能目标 | 不影响已有用户的启动速度 | 已认证用户无额外延迟 |
| 质量目标 | 最大化复用现有机制，最小侵入 | 核心修改点 < 5 处 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| **Plugin/Hook 优先** | 通过 Plugin/Hook 机制支持自定义扩展 | 复用 `CodegenieAuthPlugin` 的 auth hook |
| **安全性** | 敏感数据加密存储，最小权限原则 | Token 使用 AES-128-GCM 加密 |
| **解耦** | 模块间通过接口通信，降低耦合度 | 模型定义独立于认证插件 |
| **最小侵入** | 对原始代码的修改尽可能少 | 仅修改必要文件 |
| **避免循环依赖** | 插件文件不导入 `AppRuntime`/`Effect` | 使用 `saveAuthToDisk` 直接写 auth.json |

---

## 2. 实现思路

### 2.1 整体方案

通过 OpenCode 的 Plugin/Hook 机制扩展认证能力，新增 CodegenieAuthPlugin 注册到 INTERNAL_PLUGINS。认证流程复用 ProviderAuth Service 的 OAuth 机制，模型列表通过 Provider Manager 的 custom loader 注入。TUI 引导界面在 home.tsx 中通过 sync.data.provider 检测认证状态。

### 2.2 技术架构

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
│    ┌─────────────┐     ┌─────────────┐                                  │
│    │  TUI Home   │     │ CodeGenie   │                                  │
│    │  (检测+引导) │     │ Onboarding  │                                  │
│    └─────────────┘     └─────────────┘                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 核心流程

```
用户触发认证
    │
    ├── CLI: opencode auth login ──▶ ProviderAuth.authorize()
    │
    └── TUI: 首次引导 ──▶ CodeGenieOnboarding ──▶ LoginService.login()
                                                              │
                                                              ▼
                                                    启动 LocalAuthServer
                                                              │
                                                              ▼
                                                    打开浏览器 OAuth 授权
                                                              │
                                                              ▼
                                                    回调获取 tempToken
                                                              │
                                                              ▼
                                                    tempToken → jwtToken
                                                              │
                                                              ▼
                                                    saveAuthToDisk() 写入 auth.json
                                                              │
                                                              ▼
                                                    TokenStorage.saveToken() 加密存储
```

### 2.4 关键技术点

| 技术点 | 描述 | 解决方案 |
|--------|------|----------|
| 循环依赖 | 插件文件导入 AppRuntime/Effect 导致黑屏 | 使用 saveAuthToDisk() 直接写 auth.json |
| 条件渲染 | Privacy/模型列表需根据状态动态显示 | 使用 sync.data.provider 检测认证状态 |
| Token 安全 | JWT Token 需加密存储 | AES-128-GCM 加密，文件权限 0600 |
| 多端口支持 | 默认端口可能被占用 | 依次尝试 10101, 34567-34570 |
| Token 刷新 | OAuth Token 过期后自动续期 | custom loader 中检测过期并刷新 |

### 2.5 技术选型

| 技术领域 | 选型方案 | 选型理由 | 备选方案 |
|----------|----------|----------|----------|
| 加密算法 | AES-128-GCM | 对称加密+认证标签，性能好 | AES-256-GCM |
| OAuth 回调 | 本地 HTTP 服务器 | 标准OAuth回调机制 | 手动复制 Token |
| 状态检测 | sync.data.provider | 避免循环依赖 | Auth.all()（有循环依赖风险） |

---

## 3. 实现设计

### 3.1 模块设计

#### 3.1.1 模块划分

| 模块名称 | 职责描述 | 关键类/组件 | 依赖模块 |
|----------|----------|-------------|----------|
| CodeGenie Auth Plugin | 华为 OAuth 认证插件 | CodegenieAuthPlugin, LoginService, TokenStorage, LocalAuthServer | Auth Storage |
| CodeGenie Models | 模型资源定义 | CODEGENIE_PROVIDER_CONFIG | Config schema |
| Provider 注入 | 动态注入 CodeGenie Provider | custom loader | Auth, Provider Manager |
| TUI 引导 | 首次使用引导界面 | CodeGenieOnboarding | sync, saveAuthToDisk |
| CLI 入口 | Provider 列表配置 | providers.ts | Plugin Manager |

#### 3.1.2 模块职责

```
┌──────────────────────────────────────────────────────────────────┐
│                     CodeGenie Auth Plugin                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ TokenStorage │  │LocalAuthServer│  │    LoginService      │  │
│  │ AES-128-GCM  │  │ 多端口回调    │  │ OAuth + Token 交换   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ CodeGenieAuth│  │HttpClient    │  │  saveAuthToDisk      │  │
│  │ 公共 API     │  │ HTTP 封装    │  │  直接写 auth.json    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 类设计

#### 3.2.1 TokenStorage

| 项目 | 描述 |
|------|------|
| 所属模块 | CodeGenie Auth Plugin |
| 类描述 | AES-128-GCM 加密的 Token 存储 |
| 设计模式 | 单例 |

| 属性名 | 类型 | 访问权限 | 描述 |
|--------|------|----------|------|
| keyFilePath | string | private | `~/.config/codegenie/.token_key` |
| algorithm | string | private | `"aes-128-gcm"` |
| keyLength | number | private | 16 |
| ivLength | number | private | 12 |

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| saveToken | token: string | Promise\<void\> | 加密存储 Token |
| loadToken | - | Promise\<string \| null\> | 解密读取 Token |
| clearToken | - | Promise\<void\> | 清除 Token 文件 |

#### 3.2.2 LocalAuthServer

| 项目 | 描述 |
|------|------|
| 所属模块 | CodeGenie Auth Plugin |
| 类描述 | 本地 OAuth 回调服务器 |
| 设计模式 | 单例 |

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| start | - | Promise\<number\> | 启动服务器，返回实际端口 |
| waitForCallback | timeout?: number | Promise\<CallbackData\> | 等待 OAuth 回调 |
| stop | - | void | 停止服务器 |

#### 3.2.3 LoginService

| 项目 | 描述 |
|------|------|
| 所属模块 | CodeGenie Auth Plugin |
| 类描述 | 华为 OAuth 登录核心逻辑 |
| 设计模式 | 单例 |

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| login | - | Promise\<LoginResult\> | 执行完整登录流程 |
| getJwtToken | tempToken, siteId | Promise\<string\> | 用 tempToken 换取 jwtToken |
| getUserInfoFromJwt | jwt | UserInfo | 解析 JWT 获取用户信息 |
| generateClientSecret | - | string | 生成 client secret |

#### 3.2.4 CodeGenieAuth (公共 API)

| 项目 | 描述 |
|------|------|
| 所属模块 | CodeGenie Auth Plugin |
| 类描述 | CodeGenie 认证公共 API |
| 设计模式 | 单例 |

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| isLoggedIn | - | Promise\<boolean\> | 检查是否已登录 |
| getSession | - | Promise\<CodeGenieSession \| null\> | 获取当前会话信息 |
| login | - | Promise\<LoginResult\> | 执行登录 |
| logout | - | Promise\<void\> | 执行登出 |
| isTokenExpired | expires: number | boolean | 检查 Token 是否过期 |
| refreshToken | - | Promise\<{accessToken, refreshToken} \| null\> | 刷新 Token |

### 3.3 流程设计

#### 3.3.1 主流程: OAuth 登录

```
LoginService.login()
    │
    ├── 1. generateClientSecret()
    │
    ├── 2. LocalAuthServer.start() → 尝试端口 10101, 34567-34570
    │
    ├── 3. openLoginPage(port, clientSecret) → 打开浏览器
    │
    ├── 4. LocalAuthServer.waitForCallback() → 等待回调
    │       │
    │       ├── 成功: 获取 { tempToken, siteId }
    │       └── 超时: 抛出 TimeoutError
    │
    ├── 5. getJwtToken(tempToken, siteId) → 换取 JWT
    │
    ├── 6. getUserInfoFromJwt(jwt) → 解析用户信息
    │
    ├── 7. saveAuthToDisk("codegenie", { type: "api", key: jwt })
    │
    └── 8. TokenStorage.saveToken(jwt) → 加密存储
```

#### 3.3.2 主流程: TUI 首次引导

```
TUI 启动
    │
    ▼
sync.bootstrap() 完成 (sync.status === "complete")
    │
    ▼
检测: sync.data.provider 是否有非 opencode 的 provider
    │
    ├── 有凭证 → 显示主界面 (Logo + Prompt)
    │
    └── 无凭证 → 显示 CodeGenieOnboarding
                    │
                    ├── entry: 选择 CodeGenie OAuth 或 Other providers
                    │
                    ├── auth: 浏览器 OAuth 登录等待界面
                    │
                    └── providers: 其他 Provider 列表
                    │
                    ▼
              引导完成 → setShowOnboarding(false) → 显示主界面
```

#### 3.3.3 主流程: 模型列表注入

```
Provider Manager 初始化
    │
    ├── 1. 加载 models.dev 数据库
    │
    ├── 2. 合并配置文件中的 Provider
    │
    ├── 3. 检查环境变量
    │
    ├── 4. 检查 Auth 存储
    │       └── 若 codegenie 已认证 → 注入 CODEGENIE_PROVIDER_CONFIG
    │
    └── 5. 调用 custom loader
            └── codegenie loader: 检查 Auth 状态
                ├── 已认证 + 未过期 → { autoload: true, options: { apiKey } }
                ├── 已认证 + 已过期 → 尝试刷新
                │   ├── 刷新成功 → { autoload: true, options: { apiKey } }
                │   └── 刷新失败 → { autoload: false }
                └── 未认证 → { autoload: false }
```

#### 3.3.4 异常流程

| 异常场景 | 处理流程 | 错误码 | 错误信息 |
|----------|----------|--------|----------|
| 所有端口占用 | 依次尝试 5 个端口，全部失败抛出错误 | PORT_IN_USE | "All ports are in use" |
| OAuth 授权超时 | 10 分钟超时，显示错误提示 | AUTH_TIMEOUT | "Login timeout" |
| Token 刷新失败 | CodeGenie 模型不可用，提示重新登录 | REFRESH_FAILED | 静默降级 |
| Token 文件损坏 | 清除损坏文件，显示引导界面 | TOKEN_CORRUPT | 静默清除 |
| 浏览器不可用 | open() 失败静默处理 | BROWSER_UNAVAILABLE | 静默忽略 |

### 3.4 状态设计

#### 3.4.1 TUI 引导状态机

```
                    ┌──────────┐
                    │  entry   │ ← 初始状态
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │                     │
         选择 CodeGenie       选择 Other
              │                     │
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │   auth   │         │ providers│
        └────┬─────┘         └────┬─────┘
             │                     │
        登录成功/失败          配置完成
             │                     │
             ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │  主界面   │         │  主界面   │
        └──────────┘         └──────────┘
```

| 状态名称 | 状态描述 | 进入条件 | 退出条件 | 允许转换 |
|----------|----------|----------|----------|----------|
| entry | 显示两个选项 | TUI 启动且无凭证 | 用户选择选项 | auth, providers |
| auth | OAuth 登录等待 | 用户选择 CodeGenie OAuth | 登录成功/失败 | 主界面 |
| providers | 其他 Provider 列表 | 用户选择 Other providers | 配置完成 | 主界面 |

---

## 4. 接口设计

### 4.1 调用接口

#### 4.1.1 外部依赖接口

| 接口名称 | 提供方 | 接口描述 | 调用场景 |
|----------|--------|----------|----------|
| Auth.get() | Auth Service | 获取指定 Provider 的认证信息 | Provider Manager 初始化时 |
| Auth.all() | Auth Service | 获取所有认证信息 | CLI auth list 命令 |
| Plugin.list() | Plugin Manager | 获取所有已注册插件 | CLI auth login 命令 |
| sync.data.provider | Sync Context | 获取 Provider 连接状态 | TUI 认证检测 |
| open() | open 包 | 在默认浏览器中打开 URL | OAuth 登录打开浏览器 |

#### 4.1.2 华为认证服务接口

**接口: tempToken 检查**

| 项目 | 描述 |
|------|------|
| 接口地址 | `{baseUrl}/{tempTokenCheckUrl}` |
| 请求方式 | POST |
| 接口描述 | 用 tempToken 换取访问令牌 |

**请求参数:**

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| tempToken | string | 是 | OAuth 回调获取的临时令牌 | - |
| clientSecret | string | 是 | 客户端密钥 | - |
| siteId | string | 是 | 站点 ID | "1" |

**接口: jwtToken 检查**

| 项目 | 描述 |
|------|------|
| 接口地址 | `{baseUrl}/{jwtTokenCheckUrl}` |
| 请求方式 | POST |
| 接口描述 | 用访问令牌换取 JWT Token |

### 4.2 提供接口

#### 4.2.1 对外提供接口列表

| 接口编号 | 接口名称 | 接口类型 | 接口描述 |
|----------|----------|----------|----------|
| PI-001 | AuthHook | Plugin Hook | CodeGenie OAuth 认证钩子 |
| PI-002 | custom loader | Provider Hook | CodeGenie Provider 动态加载器 |
| PI-003 | saveAuthToDisk | 工具函数 | 直接写入 auth.json（避免循环依赖） |
| PI-004 | codegenieAuth | 公共 API | 登录/登出/刷新/状态查询 |

#### 4.2.2 AuthHook 接口详细定义

**接口: PI-001**

| 项目 | 描述 |
|------|------|
| 接口名称 | CodegenieAuthPlugin.auth |
| 接口类型 | Plugin Hook |
| 接口描述 | 注册 CodeGenie OAuth 认证方法到 ProviderAuth Service |

```typescript
const authHook: AuthHook = {
  provider: "codegenie",
  methods: [
    {
      type: "oauth",
      label: "CodeGenie OAuth",
      authorize: async () => {
        const result = await codegenieAuth.login()
        if (result.success) {
          await saveAuthToDisk("codegenie", { type: "api", key: result.jwtToken })
          return { type: "success", key: result.jwtToken, provider: "codegenie" }
        }
        return { type: "failed" }
      },
    },
  ],
}
```

#### 4.2.3 custom loader 接口详细定义

**接口: PI-002**

| 项目 | 描述 |
|------|------|
| 接口名称 | codegenie custom loader |
| 接口类型 | Provider Hook |
| 接口描述 | 根据 Auth 状态决定是否自动加载 CodeGenie Provider |

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

### 4.3 子系统/模块间接口基线

#### 4.3.1 模块间接口关系图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CLI auth      │────▶│  Plugin Manager │────▶│   AuthHook      │
│   commands      │     │  .list()        │     │   .authorize()  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   TUI Home      │────▶│  sync.data      │     │  LoginService   │
│   .provider     │     │  .provider      │     │  .login()       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Provider      │────▶│  custom loader  │────▶│  saveAuthToDisk │
│   Manager       │     │  (codegenie)    │     │  ()             │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### 4.3.2 模块间接口定义

| 接口ID | 调用方 | 被调用方 | 接口名称 | 数据格式 | 通信方式 |
|--------|--------|----------|----------|----------|----------|
| MI-001 | CLI providers.ts | Plugin Manager | Plugin.list() | Plugin[] | 同步 |
| MI-002 | CLI providers.ts | AuthHook | authorize() | AuthResult | 异步 |
| MI-003 | TUI home.tsx | sync context | sync.data.provider | Provider[] | 响应式 |
| MI-004 | Provider Manager | custom loader | codegenie() | LoaderResult | 异步 |
| MI-005 | LoginService | saveAuthToDisk | saveAuthToDisk() | void | 异步 |

---

## 5. 周边依赖关系

### 5.1 网络依赖

#### 5.1.1 网络依赖列表

| 依赖项 | 依赖类型 | 网络要求 | 带宽要求 | 延迟要求 |
|--------|----------|----------|----------|----------|
| 华为认证服务 | 强依赖 | HTTPS | 低 | < 5s |
| CodeGenie API | 强依赖 | HTTPS/SSE | 中 | < 30s (流式) |
| models.dev | 弱依赖 | HTTPS | 低 | < 3s |

#### 5.1.2 网络异常处理

| 异常场景 | 处理策略 | 重试机制 | 降级方案 |
|----------|----------|----------|----------|
| 认证服务超时 | 显示错误提示 | 无重试 | 提供其他 Provider 选项 |
| Token 刷新失败 | 静默降级 | 无重试 | CodeGenie 模型不可用 |
| API 调用失败 | 显示错误 | SDK 内置重试 | 不影响其他 Provider |

### 5.2 UX 设计稿依赖

| 设计稿ID | 页面/组件名称 | 状态 | 更新日期 |
|----------|---------------|------|----------|
| UX-001 | CodeGenieOnboarding 引导界面 | 已实现 | 2026-04-21 |
| UX-002 | CodeGenie Logo 渐变设计 | 已实现 | 2026-04-21 |

---

## 6. 安全隐私设计

### 6.1 数据安全

| 安全类型 | 设计方案 | 实现位置 |
|----------|----------|----------|
| Token 加密存储 | AES-128-GCM，密钥长度 16 字节，IV 12 字节 | TokenStorage |
| 文件权限 | Token 和密钥文件权限 0600 | saveToken(), key 生成 |
| 传输安全 | OAuth 回调使用 localhost | LocalAuthServer |
| 数据最小化 | 仅存储 JWT Token，不存储用户密码 | LoginService |

### 6.2 隐私保护

| 隐私类型 | 设计方案 | 说明 |
|----------|----------|------|
| 数据收集 | 仅收集认证必需的 Token | 不收集用户行为数据 |
| 数据存储 | 全部本地存储，不上传服务器 | auth.json + token.enc |
| 数据使用 | 仅用于 AI 模型 API 调用认证 | custom loader 设置 apiKey |

### 6.3 敏感接口保护

| 接口ID | 敏感级别 | 保护措施 | 审计要求 |
|--------|----------|----------|----------|
| PI-001 (AuthHook) | 高 | OAuth 流程，不暴露密钥 | 无 |
| PI-003 (saveAuthToDisk) | 高 | 文件权限 0600 | 无 |
| PI-004 (codegenieAuth) | 中 | Token 加密存储 | 无 |

---

## 7. 性能功耗设计

### 7.1 性能目标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| TUI 启动延迟 | 已认证用户 < 100ms 额外延迟 | 对比有无 CodeGenie 插件的启动时间 |
| OAuth 登录耗时 | < 30s（不含用户操作时间） | 从点击到 Token 存储完成 |
| Token 刷新耗时 | < 3s | 从检测过期到刷新完成 |
| 模型列表渲染 | < 50ms 额外延迟 | 对比有无 CodeGenie 模型的渲染时间 |

### 7.2 性能优化策略

| 优化点 | 策略 | 说明 |
|--------|------|------|
| 插件加载 | 懒加载 codegenie-models | 使用 `Effect.promise(() => import(...))` |
| 认证检测 | 使用 sync.data.provider | 避免导入 Auth/AppRuntime/Effect |
| Token 刷新 | 仅在过期时刷新 | custom loader 中检查 expires |

---

## 8. 本地数据库设计

### 8.1 存储结构

#### 8.1.1 auth.json

**存储位置**: `~/.local/share/opencode/auth.json`
**文件权限**: 0600

```json
{
  "codegenie": {
    "type": "api",
    "key": "eyJhbG..."
  }
}
```

#### 8.1.2 token.enc

**存储位置**: `~/.config/codegenie/token.enc`
**文件权限**: 0600

```json
{
  "encrypted": "base64-encoded-ciphertext",
  "iv": "base64-encoded-iv",
  "authTag": "base64-encoded-auth-tag",
  "timeStamp": 1700000000000
}
```

#### 8.1.3 .token_key

**存储位置**: `~/.config/codegenie/.token_key`
**文件权限**: 0600
**格式**: 16 字节二进制密钥

---

## 9. DFX分析

### 9.1 可维护性

| 维护场景 | 设计方案 | 维护成本 |
|----------|----------|----------|
| 新增模型 | 修改 codegenie-models.ts | 低（1 个文件） |
| 新增区域 | 修改 CountryCode/LanguageCode/SiteId 常量 | 低（1 个文件） |
| URL 变更 | 修改 DEFAULT_CONFIG 常量 | 低（1 个文件） |
| 认证协议变更 | 修改 LoginService | 中（核心逻辑） |

### 9.2 可扩展性

| 扩展场景 | 设计方案 | 扩展点 |
|----------|----------|--------|
| 新增认证方式 | AuthHook.methods 数组新增条目 | AuthHook 接口 |
| 动态模型列表 | 替换 codegenie-models.ts 为 API 调用 | CODEGENIE_PROVIDER_CONFIG |
| 新增 Provider | 新增 Plugin 到 INTERNAL_PLUGINS | Plugin 体系 |

### 9.3 可靠性

| 故障场景 | 恢复策略 | 恢复时间 |
|----------|----------|----------|
| Token 文件损坏 | 自动清除，显示引导界面 | < 1s |
| OAuth 服务不可用 | 提供其他 Provider 选项 | 即时 |
| Token 过期 | 自动刷新，失败时降级 | < 3s |
| 端口占用 | 多端口尝试 | < 1s |

### 9.4 可测试性

| 测试类型 | 测试方案 | 覆盖范围 |
|----------|----------|----------|
| 手动测试 | 按 test-cases.md 验证 | 关键路径 100% |
| 回归测试 | 验证已有功能不受影响 | Provider 列表、Auth 存储、模型选择 |

---

## 10. 其它功能性设计

### 10.1 多区域支持

```typescript
const CountryCode = { CHINA: "CN", RUSSIA: "RU", SINGAPORE: "SG", EUROPE: "EU" }
const LanguageCode = { CHINA: "zh_CN", RUSSIA: "ru_RU", EUROPE: "de_DE" }
const SiteId = { CHINA: "1", SINGAPORE: "5", EUROPE: "7", RUSSIA: "8" }
```

| 区域 | 域名 | siteId |
|------|------|--------|
| 中国 | cn.devecostudio.huawei.com | 1 |
| 新加坡 | sg.devecostudio.huawei.com | 5 |
| 欧洲 | eu.devecostudio.huawei.com | 7 |
| 俄罗斯 | ru.devecostudio.huawei.com | 8 |

### 10.2 CodeGenieOnboarding 组件设计

| 步骤 | 说明 | 关键交互 |
|------|------|----------|
| `entry` | 显示两个选项：CodeGenie OAuth、Other providers | 键盘上下选择，Enter 确认 |
| `auth` | CodeGenie 浏览器 OAuth 登录等待界面 | 自动打开浏览器，等待回调 |
| `providers` | 其他 Provider 列表（排除 codegenie，按优先级排序） | 键盘选择，Enter 确认 |

**关键设计**:
- 使用 `saveAuthToDisk()` 写入认证数据（不导入 AppRuntime/Effect）
- 键盘事件在 dialog 打开时自动禁用
- 引导完成后调用 `props.onComplete()` 通知父组件
- 水平布局：左 Logo + 右内容

### 10.3 home.tsx 认证检测设计

```tsx
const [showOnboarding, setShowOnboarding] = createSignal(false)
let authChecked = false

createEffect(
  on(
    () => sync.status,
    (status) => {
      if (status !== "complete") return
      if (authChecked) return
      authChecked = true
      const hasCredentials = sync.data.provider.some(
        (x) => x.id !== "opencode" || Object.values(x.models).some((y) => y.cost?.input !== 0),
      )
      if (!hasCredentials) {
        setShowOnboarding(true)
      }
    },
  ),
)
```

**设计决策**:
- 使用 `sync.data.provider` 而非 `Auth.all()`，避免导入 Auth/AppRuntime/Effect
- 检测逻辑与 `useConnected()` 一致
- `showOnboarding` 默认为 `false`，确保已登录用户先看到主界面
- `authChecked` 标志确保只检测一次

### 10.4 Provider 列表排序设计

```typescript
const priority = {
  codegenie: -1,
  opencode: 0,
  openai: 1,
  // ...
}
```

```typescript
sortBy(
  (provider) => provider.id !== "codegenie" && provider.id !== "opencode",
  (provider) => provider.id === "opencode",
  (provider) => provider.name,
)
```

### 10.5 Free 标签设计

```typescript
footer: model.cost?.input === 0 && (provider.id === "opencode" || provider.id === "codegenie") ? "Free" : undefined,
```

### 10.6 Small Model 选择设计

`getSmallModel` 函数根据 provider 类型选择轻量模型，用于摘要、标题生成等辅助任务：

| Provider | Small Model | 说明 |
|----------|------------|------|
| opencode | `gpt-5-nano` | 默认轻量模型 |
| **codegenie** | **`deepseek-v3.2`** | codegenie provider 的轻量模型 |
| github-copilot | `gpt-5-mini` → `claude-haiku-4.5` | 优先 copilot 提供的轻量模型 |

```typescript
if (providerID.startsWith("codegenie")) {
  priority = ["deepseek-v3.2"]
}
```

> **设计决策**: codegenie provider 目前提供 `glm-5`（主力模型，支持推理）和 `deepseek-v3.2`（轻量模型），选择 `deepseek-v3.2` 作为 small model 以降低辅助任务的 token 消耗。

---

## 附录

### A. 设计决策记录

| 决策ID | 决策内容 | 决策原因 | 决策日期 |
|--------|----------|----------|----------|
| D-001 | 使用 saveAuthToDisk 替代 Auth.set | 导入 AppRuntime/Effect 导致循环依赖黑屏 | 2026-04-21 |
| D-002 | 使用 sync.data.provider 替代 Auth.all | 避免在 TUI 组件中导入 Auth/AppRuntime/Effect | 2026-04-21 |
| D-003 | Token 存储使用 AES-128-GCM | 平衡安全性与性能 | 2026-03-25 |
| D-004 | 模型信息硬编码 | API 动态获取暂不可用 | 2026-03-25 |
| D-005 | 引导界面在 home.tsx 而非 app.tsx | 最小化修改范围，app.tsx 保留 DialogProviderList | 2026-04-21 |

### B. 与 copy 项目的主要差异

| 差异项 | copy 项目 | 新项目 | 原因 |
|--------|-----------|--------|------|
| Auth 写入方式 | `Auth.set()` (namespace 便捷函数) | `saveAuthToDisk()` (直接文件写入) | 无 Auth 便捷函数，且导入导致循环依赖 |
| 认证检测 | `Auth.all()` + `AppRuntime.runPromise` | `sync.data.provider.some(...)` | 避免循环依赖 |
| Plugin 系统 | `ServiceMap.Service` | `Context.Service` | 不同 Effect Context API |
| Logo 组件 | 自定义渐变渲染 + charMap/charOpacity | 添加 `column` prop + `Show` 条件渲染 | 最小化改动 |

### C. 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 1.0 | 2026-03-25 | 初始版本 |
| 2.0 | 2026-03-31 | 精简设计，最小化侵入式修改 |
| 3.0 | 2026-04-21 | 按 SDD 格式重构：修正实现描述、补充 CodeGenieAuth API |
| 4.0 | 2026-04-22 | 按 SDD 模板完整重构：补充目录、周边依赖、安全隐私、DFX 等章节；合并 03-tui-auth-check.md 内容 |
