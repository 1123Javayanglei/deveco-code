# 需求分析说明书: CodeGenie 华为账号登录集成

**功能分支**: `codegenie-auth`
**创建日期**: 2026-03-25
**状态**: 已实现（阶段 1-4，含 Bug 修复）
**输入**: CodeGenie 华为账号 OAuth 登录集成

---

## 1. 简介

### 1.1 目的

本文档分析 OpenCode 框架的登录鉴权机制，并描述 CodeGenie 华为账号登录集成的需求。

### 1.2 范围

**包含**:
- OpenCode 插件系统与 Hook 机制
- 认证数据存储与管理
- Provider 注册与加载流程
- CLI 认证入口
- CodeGenie 华为账号 OAuth 集成
- TUI 首次使用引导
- CodeGenie 模型列表集成

**不包含**:
- 华为认证服务端的实现
- CodeGenie API Gateway 的实现
- 其他 Provider 的认证逻辑

### 1.3 假设和约束

| 类型 | 描述 |
|------|------|
| 假设 | 华为开发者认证服务可用且稳定 |
| 假设 | 用户本地有浏览器可用 |
| 假设 | 本地端口 10101 或 34567-34570 可用 |
| 约束 | 插件文件不能导入 `AppRuntime`/`Effect`，否则循环依赖导致黑屏 |
| 约束 | `saveAuthToDisk` 必须与 `Auth.Service` 读写同一 auth.json 文件，路径通过 `Global.Path.data` 获取 |
| 约束 | 模型信息暂时硬编码，不通过 API 动态获取 |
| 约束 | 对原始代码侵入性最小化 |

### 1.4 术语与缩写

| 术语/缩写 | 全称 | 说明 |
|-----------|------|------|
| OAuth | Open Authorization | 开放授权协议 |
| JWT | JSON Web Token | 基于 JSON 的开放标准令牌 |
| AES-128-GCM | Advanced Encryption Standard | 128位高级加密标准-GCM模式 |
| TUI | Terminal User Interface | 终端用户界面 |
| Provider | AI Model Provider | AI 模型提供商 |
| AuthHook | Authentication Hook | 认证钩子，Plugin 系统的认证扩展点 |

---

## 2. 系统上下文

### 2.1 系统定位

CodeGenie 华为账号登录集成是 codegenie-cli 的核心认证模块，位于 OpenCode 插件系统与 Provider 管理层之间。它通过 Plugin/Hook 机制扩展认证能力，为 CodeGenie 用户提供 OAuth 登录、Token 安全存储、模型列表访问等功能。

### 2.2 系统边界

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

**外部交互**:
- 华为认证服务: `https://devecostudio.huawei.com` — OAuth 授权与 Token 交换
- CodeGenie API: `https://cn.devecostudio.huawei.com/sse/codeGenie/maas/v2` — 模型推理

### 2.3 核心模块

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| Auth Storage | `packages/opencode/src/auth/index.ts` | 认证数据持久化 |
| Plugin System | `packages/opencode/src/plugin/index.ts` | 插件加载与管理 |
| Hooks Registry | `packages/plugin/src/index.ts` | Hook 类型定义 |
| Provider Manager | `packages/opencode/src/provider/provider.ts` | Provider 信息管理 |
| ProviderAuth Service | `packages/opencode/src/provider/auth.ts` | OAuth/API 认证流程 |
| CLI Providers Command | `packages/opencode/src/cli/cmd/providers.ts` | CLI 认证入口 |

---

## 3. 需求分析概述

### 3.1 需求来源

- **产品需求**: CodeGenie 作为华为开发者工具，需要集成华为账号 OAuth 登录
- **用户需求**: 用户期望一键登录即可使用 CodeGenie 提供的免费 AI 模型
- **合规需求**: 用户认证数据需加密存储，符合安全规范

### 3.2 需求目标

1. 支持华为 OAuth 登录，用户可在 CLI/TUI 中完成认证
2. Token 安全存储（AES-128-GCM 加密），支持自动刷新
3. 登录后自动显示 CodeGenie 免费模型，未登录时隐藏
4. 首次使用 TUI 时提供引导界面

### 3.3 关键利益相关者

| 角色 | 职责 | 关注点 |
|------|------|--------|
| CodeGenie 产品用户 | 使用 CLI 工具进行开发 | 登录流程是否便捷、模型是否可用 |
| CodeGenie 平台运营 | 管理用户认证与模型服务 | 认证成功率、模型使用率 |
| 安全合规团队 | 监督数据安全与隐私合规 | Token 加密存储、数据最小化 |
| 开发者 | 实现和维护认证模块 | 代码侵入性、循环依赖风险 |

---

## 4. 需求场景分析

### 4.1 业务场景

#### 4.1.1 业务流程图

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

#### 4.1.2 业务规则

| 规则编号 | 规则名称 | 规则描述 | 优先级 |
|----------|----------|----------|--------|
| BR-001 | CodeGenie 优先排序 | Provider 列表中 codegenie priority = -1，排在最前 | 高 |
| BR-002 | 未登录隐藏模型 | 未通过 CodeGenie OAuth 认证时，不显示 CodeGenie 模型 | 高 |
| BR-003 | 免费模型标记 | CodeGenie 模型 cost.input = 0，显示 "Free" 标签 | 中 |
| BR-004 | 首次引导触发 | 无任何凭证时 TUI 启动显示引导界面 | 高 |
| BR-005 | Token 自动刷新 | OAuth Token 过期后自动刷新，失败时提示重新登录 | 中 |

### 4.2 用户操作场景与关键路径

#### 4.2.1 用户角色定义

| 角色ID | 角色名称 | 角色描述 | 权限范围 |
|--------|----------|----------|----------|
| UR-001 | 首次用户 | 未配置任何 Provider 的用户 | 可使用引导界面登录 CodeGenie 或配置其他 Provider |
| UR-002 | CodeGenie 用户 | 已通过 CodeGenie OAuth 登录的用户 | 可使用 CodeGenie 免费模型 |
| UR-003 | 其他 Provider 用户 | 已配置其他 Provider 但未登录 CodeGenie | 可正常使用，CodeGenie 模型不可见 |

#### 4.2.2 用户操作场景

**场景 US-001: CLI 登录 CodeGenie** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 用户通过 CLI 命令完成 CodeGenie OAuth 登录 |
| 前置条件 | 未登录 CodeGenie，有华为开发者账号 |
| 操作步骤 | 1. 运行 `opencode auth login`<br>2. 选择 "CodeGenie OAuth (recommended)"<br>3. 在浏览器中完成华为账号授权<br>4. 等待 CLI 显示登录成功 |
| 预期结果 | 登录成功，Token 安全存储到 `~/.config/codegenie/token.enc` |
| 异常处理 | 浏览器授权取消或超时时显示错误提示，不崩溃 |

**场景 US-002: TUI 首次引导登录** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 首次启动 TUI 无凭证时，通过引导界面完成 CodeGenie 登录 |
| 前置条件 | 清除 `~/.config/codegenie/` 和 `~/.local/share/codegenie/auth.json` |
| 操作步骤 | 1. 启动 TUI<br>2. 在引导界面选择 "CodeGenie OAuth"<br>3. 在浏览器中完成华为账号授权<br>4. 等待 TUI 显示登录成功并进入主界面 |
| 预期结果 | 登录成功，引导界面消失，进入主界面 |
| 异常处理 | OAuth 服务不可用时，引导界面提供 "Other providers" 选项 |

**场景 US-003: 使用 CodeGenie 免费模型** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 已登录用户在模型选择列表中使用 CodeGenie 免费模型 |
| 前置条件 | 已通过 CodeGenie OAuth 登录 |
| 操作步骤 | 1. 打开模型选择 `/models`<br>2. 查看 CodeGenie 分组<br>3. 选择 GLM-5 或 deepseek-v3.2<br>4. 发送消息 |
| 预期结果 | 消息正常发送并收到响应 |
| 异常处理 | Token 过期时自动刷新，刷新失败提示重新登录 |

**场景 US-004: 未登录用户无法看到 CodeGenie 模型** (优先级: P2)

| 项目 | 描述 |
|------|------|
| 场景描述 | 未登录 CodeGenie 的用户在模型列表中看不到 CodeGenie 分组 |
| 前置条件 | 未通过 CodeGenie OAuth 登录 |
| 操作步骤 | 1. 启动 TUI<br>2. 打开模型选择 `/models` |
| 预期结果 | 列表中不出现 "CodeGenie" 分组 |
| 异常处理 | 无 |

#### 4.2.3 关键路径分析

| 路径编号 | 路径描述 | 关键节点 | 风险点 |
|----------|----------|----------|--------|
| KP-001 | CLI OAuth 登录 | 浏览器授权 → Token 交换 → 加密存储 | 本地端口占用、浏览器不可用 |
| KP-002 | TUI 首次引导 | 认证检测 → 引导界面 → OAuth 登录 → 主界面 | 循环依赖导致黑屏 |
| KP-003 | 模型列表显示 | Auth 状态检查 → Provider 注入 → 排序渲染 | Token 过期、类型不兼容 |

### 4.3 研发与维护阶段场景

#### 4.3.1 开发阶段场景

| 场景 | 描述 | 注意事项 |
|------|------|----------|
| 插件开发 | 新增 CodegenieAuthPlugin 到 INTERNAL_PLUGINS | 插件文件不能导入 AppRuntime/Effect |
| 模型配置 | 新增 codegenie-models.ts 定义模型资源 | 模型定义需符合 Config.Provider schema |
| TUI 组件 | 新增 CodeGenieOnboarding 引导组件 | 使用 saveAuthToDisk 替代 Auth.set |

#### 4.3.2 测试阶段场景

| 场景 | 描述 | 测试要点 |
|------|------|----------|
| OAuth 登录测试 | 验证完整登录流程 | Token 加密存储、多区域支持 |
| 引导界面测试 | 验证首次启动引导 | 无凭证→显示引导、有凭证→跳过引导 |
| 模型列表测试 | 验证模型显示与隐藏 | 登录→显示、登出→隐藏、Free 标签 |

#### 4.3.3 运维阶段场景

| 场景 | 描述 | 运维要求 |
|------|------|----------|
| Token 过期处理 | 自动刷新 Token | 刷新失败时提示用户重新登录 |
| 华为服务变更 | 认证服务 URL 或协议变更 | 需更新 DEFAULT_CONFIG 常量 |
| 模型变更 | 新增或下线模型 | 需更新 codegenie-models.ts |

### 4.4 兼容性分析

#### 4.4.1 版本兼容性

| 兼容类型 | 兼容要求 | 影响范围 |
|----------|----------|----------|
| 向前兼容 | 新增插件不影响现有 Provider | 所有用户 |
| 向后兼容 | auth.json 格式不变，新增 codegenie 条目 | 已有用户 |

#### 4.4.2 平台兼容性

| 平台 | 兼容性要求 | 备注 |
|------|------------|------|
| macOS | `open()` 使用系统默认浏览器 | 主要目标平台 |
| Windows | `open()` 使用系统默认浏览器 | 主要目标平台 |
| Linux | `open()` 使用 xdg-open | 非 primary 目标平台 |

#### 4.4.3 数据兼容性

| 数据类型 | 兼容性要求 | 迁移策略 |
|----------|------------|----------|
| auth.json | 新增 codegenie 条目，不修改已有条目 | 无需迁移 |
| token.enc | CodeGenie 专用加密存储 | 新增文件，不影响已有数据 |

---

## 5. 功能性需求分析

### 5.1 功能需求列表

| 需求编号 | 需求名称 | 需求描述 | 优先级 | 来源 |
|----------|----------|----------|--------|------|
| FR-001 | 华为 OAuth 登录 | 支持 OAuth 方式登录华为开发者账号 | P1 | 产品需求 |
| FR-002 | JWT Token 安全存储 | 登录成功后获取 JWT Token 并使用 AES-128-GCM 加密存储 | P1 | 安全需求 |
| FR-003 | CLI 认证入口 | 在 CLI `opencode auth login` / `auth logout` / `auth list` 中显示 CodeGenie | P1 | 产品需求 |
| FR-004 | Provider 推荐提示 | 在 provider 列表中显示 "recommended" 提示 | P2 | 用户体验 |
| FR-005 | Provider 优先排序 | 在 provider 列表中排在最前面（priority = -1） | P2 | 产品需求 |
| FR-006 | CodeGenie 模型显示 | 登录后模型选择列表最前面显示 CodeGenie 提供的模型 | P1 | 产品需求 |
| FR-007 | 免费模型标记 | CodeGenie 提供 GLM-5 和 deepseek-v3.2 两个模型，均标记为 "Free" | P1 | 产品需求 |
| FR-008 | 模型硬编码配置 | 模型信息暂时硬编码在 `codegenie-models.ts` 中，不通过 API 动态获取 | P2 | 技术约束 |
| FR-009 | 未登录隐藏模型 | 未登录 CodeGenie OAuth 时，不显示 CodeGenie 模型 | P1 | 产品需求 |
| FR-010 | TUI 首次引导 | 首次启动 TUI 时，无凭证用户显示引导界面 | P1 | 用户体验 |
| FR-011 | Token 自动刷新 | OAuth Token 过期后自动刷新，无需用户重新登录 | P2 | 用户体验 |
| FR-012 | 多区域支持 | 支持中国、新加坡、欧洲、俄罗斯多区域登录 | P2 | 产品需求 |
| FR-013 | auth.json 路径一致性 | `saveAuthToDisk` 必须与 `Auth.Service` 读写同一 auth.json 文件，路径通过 `Global.Path.data` 获取，不能硬编码 | P1 | Bug 修复 |
| FR-014 | Plugin Provider 统一排序 | CLI `auth login` 的 provider 列表中，plugin providers 必须与 models.dev providers 统一按 priority 排序，codegenie 应排第一且标记 "recommended" | P1 | Bug 修复 |

### 5.2 功能需求详细说明

#### FR-001: 华为 OAuth 登录

| 项目 | 描述 |
|------|------|
| 需求描述 | 支持 OAuth 方式登录华为开发者账号，通过本地服务器接收回调获取 Token |
| 验收标准 | 1. `opencode auth login` 列表第一项显示 "CodeGenie OAuth (recommended)"<br>2. 选择 CodeGenie 后能打开浏览器完成登录<br>3. 登录成功后 Token 安全存储 |
| 关联场景 | US-001, US-002 |
| 依赖需求 | 无 |

#### FR-002: JWT Token 安全存储

| 项目 | 描述 |
|------|------|
| 需求描述 | 登录成功后获取 JWT Token 并使用 AES-128-GCM 加密存储到 `~/.config/codegenie/token.enc` |
| 验收标准 | 1. Token 以 AES-128-GCM 加密存储<br>2. 文件权限为 0600<br>3. 密钥文件权限为 0600 |
| 关联场景 | US-001 |
| 依赖需求 | FR-001 |

#### FR-003: CLI 认证入口

| 项目 | 描述 |
|------|------|
| 需求描述 | 在 CLI `opencode auth login` / `auth logout` / `auth list` 中显示 CodeGenie 选项 |
| 验收标准 | 1. `auth login` 列表显示 CodeGenie OAuth<br>2. `auth list` 显示 CodeGenie 认证状态<br>3. `auth logout` 能登出 CodeGenie |
| 关联场景 | US-001 |
| 依赖需求 | FR-001 |

#### FR-006: CodeGenie 模型显示

| 项目 | 描述 |
|------|------|
| 需求描述 | 登录后模型选择列表最前面显示 CodeGenie 提供的模型（GLM-5 和 deepseek-v3.2） |
| 验收标准 | 1. 登录后 `/models` 列表最前面显示 "CodeGenie" 分组<br>2. 包含 GLM-5 和 deepseek-v3.2<br>3. 两个模型均显示 "Free" 标签 |
| 关联场景 | US-003 |
| 依赖需求 | FR-001 |

#### FR-009: 未登录隐藏模型

| 项目 | 描述 |
|------|------|
| 需求描述 | 未登录 CodeGenie OAuth 时，不显示 CodeGenie 模型 |
| 验收标准 | 1. 未登录时 `/models` 列表中不出现 CodeGenie 分组<br>2. 登出后 CodeGenie 分组消失 |
| 关联场景 | US-004 |
| 依赖需求 | FR-006 |

#### FR-010: TUI 首次引导

| 项目 | 描述 |
|------|------|
| 需求描述 | 首次启动 TUI 时，无凭证用户显示引导界面，包含 CodeGenie OAuth 和 Other providers 两个选项 |
| 验收标准 | 1. 无凭证时显示引导界面<br>2. 已登录用户直接进入主界面<br>3. 已配置其他 Provider 直接进入主界面 |
| 关联场景 | US-002 |
| 依赖需求 | FR-001 |

#### FR-011: Token 自动刷新

| 项目 | 描述 |
|------|------|
| 需求描述 | OAuth Token 过期后自动刷新，刷新失败时提示用户重新登录 |
| 验收标准 | 1. Token 过期后自动刷新<br>2. 刷新失败时 CodeGenie 模型不可用<br>3. 不影响其他 Provider |
| 关联场景 | US-003 |
| 依赖需求 | FR-002 |

#### FR-013: auth.json 路径一致性

| 项目 | 描述 |
|------|------|
| 需求描述 | `saveAuthToDisk` 必须与 `Auth.Service` 读写同一 auth.json 文件，路径必须通过 `Global.Path.data` 动态获取，不能硬编码为 `~/.local/share/opencode/auth.json` |
| 验收标准 | 1. TUI 内登录后 `Auth.Service` 能读取到认证数据<br>2. TUI 内登录后模型列表正常显示<br>3. 退出 TUI 后再次启动仍保持登录状态<br>4. CLI `auth login` 和 TUI 引导登录写入同一 auth.json |
| 关联场景 | US-001, US-002 |
| 依赖需求 | FR-001, FR-010 |
| Bug 背景 | `saveAuthToDisk` 硬编码路径为 `~/.local/share/opencode/auth.json`，而 `Auth.Service` 读取 `~/.local/share/codegenie/auth.json`（通过 `Global.Path.data`），导致 TUI 内登录后认证数据对 `Auth.Service` 不可见，表现为模型列表为空且退出后需重新登录 |

#### FR-014: Plugin Provider 统一排序

| 项目 | 描述 |
|------|------|
| 需求描述 | CLI `auth login` 的 provider 列表中，plugin providers（如 codegenie）必须与 models.dev providers 统一按 priority 排序，且 codegenie 应标记为 "recommended" 而非 "plugin" |
| 验收标准 | 1. `auth login` 列表第一项显示 "CodeGenie OAuth"，hint 为 "recommended"<br>2. codegenie 排在 opencode 之前（priority -1 < 0）<br>3. 其他 plugin providers 仍标记为 "plugin" |
| 关联场景 | US-001 |
| 依赖需求 | FR-003, FR-005 |
| Bug 背景 | plugin providers 被追加到 options 数组末尾，不参与 priority 排序，且 hint 统一为 "plugin"，导致 codegenie 排在 opencode 之后且不显示 "recommended" |

### 5.3 功能依赖关系

```
FR-001 (OAuth 登录)
  ├── FR-002 (Token 存储)
  │     └── FR-011 (Token 刷新)
  ├── FR-003 (CLI 入口)
  │     └── FR-014 (统一排序)
  ├── FR-004 (推荐提示)
  ├── FR-005 (优先排序)
  │     └── FR-014 (统一排序)
  ├── FR-006 (模型显示)
  │     ├── FR-007 (免费标记)
  │     ├── FR-008 (硬编码配置)
  │     └── FR-009 (未登录隐藏)
  ├── FR-010 (TUI 引导)
  │     └── FR-013 (路径一致性)
  └── FR-013 (路径一致性)

FR-012 (多区域支持) ── FR-001
```

| 需求ID | 依赖需求 | 依赖类型 | 说明 |
|--------|----------|----------|------|
| FR-002 | FR-001 | 强依赖 | Token 存储依赖登录成功 |
| FR-003 | FR-001 | 强依赖 | CLI 入口依赖 OAuth 插件注册 |
| FR-006 | FR-001 | 强依赖 | 模型显示依赖登录状态 |
| FR-009 | FR-006 | 强依赖 | 隐藏逻辑依赖模型显示逻辑 |
| FR-010 | FR-001 | 强依赖 | 引导登录依赖 OAuth 插件 |
| FR-011 | FR-002 | 强依赖 | 刷新依赖存储的 Token |
| FR-012 | FR-001 | 弱依赖 | 多区域是登录的扩展配置 |
| FR-013 | FR-001, FR-010 | 强依赖 | 路径一致性是登录和引导登录正常工作的前提 |
| FR-014 | FR-003, FR-005 | 强依赖 | 统一排序是 CLI 入口和优先排序正确展示的前提 |

---

## 6. 非功能性需求分析

### 6.1 定位

目标用户群体为使用 codegenie-cli TUI 的开发者，需要快速完成华为账号认证并使用 CodeGenie 提供的免费 AI 模型。

### 6.2 系统可靠性

| 指标 | 要求 | 说明 |
|------|------|------|
| 登录可用性 | 99%+ | 依赖华为认证服务可用性 |
| Token 刷新成功率 | 99%+ | 网络正常时刷新应成功 |
| 故障恢复策略 | 降级处理 | Token 刷新失败时提示重新登录，不影响其他 Provider |

### 6.3 安全隐私

#### 6.3.1 安全需求

| 安全类型 | 需求描述 | 安全等级 |
|----------|----------|----------|
| 数据加密 | Token 使用 AES-128-GCM 加密存储 | 高 |
| 文件权限 | Token 和密钥文件权限为 0600 | 高 |
| 传输安全 | OAuth 回调使用 localhost HTTPS | 中 |
| 数据最小化 | 仅存储必要的认证信息 | 中 |

#### 6.3.2 隐私需求

| 隐私类型 | 需求描述 | 合规要求 |
|----------|----------|----------|
| 数据收集 | 仅收集认证必需的 Token 信息 | 最小化原则 |
| 数据存储 | Token 加密存储在本地，不上传服务器 | 本地优先 |
| 数据使用 | 仅用于 AI 模型 API 调用认证 | 限定用途 |

### 6.4 可测试性

| 测试类型 | 测试要求 | 覆盖率目标 |
|----------|----------|------------|
| 手动测试 | 验证 OAuth 登录完整流程 | 关键路径 100% |
| 手动测试 | 验证 TUI 引导界面 | 关键路径 100% |
| 手动测试 | 验证模型列表显示与隐藏 | 关键路径 100% |

### 6.5 合规性

| 合规标准 | 适用范围 | 合规要求 |
|----------|----------|----------|
| 华为开发者服务条款 | CodeGenie 用户 | 使用华为认证服务需遵守服务条款 |
| 数据安全法 | Token 存储 | 敏感数据加密存储 |

---

## 7. 系统影响分析

### 7.1 功能影响列表

| 影响模块 | 影响类型 | 影响程度 | 影响描述 |
|----------|----------|----------|----------|
| `plugin/index.ts` | 修改 | 低 | 新增 CodegenieAuthPlugin 到 INTERNAL_PLUGINS |
| `cli/cmd/providers.ts` | 修改 | 低 | 添加 codegenie 配置、优先级、hint |
| `provider/provider.ts` | 修改 | 中 | 注入 CodeGenie 配置 + custom loader |
| `cli/cmd/tui/routes/home.tsx` | 修改 | 中 | 添加认证检测 + CodeGenieOnboarding 条件渲染 |
| `cli/cmd/tui/component/dialog-model.tsx` | 修改 | 低 | 排序 codegenie 最前 + Free 标签 |
| `cli/logo.ts` | 修改 | 低 | 替换为 CodeGenie Logo 数据 |
| `cli/cmd/tui/component/logo.tsx` | 修改 | 低 | 添加 column 属性支持 |

### 7.2 功能影响分析

#### 7.2.1 对现有功能的影响

| 现有功能 | 影响描述 | 兼容性处理 | 风险评估 |
|----------|----------|------------|----------|
| Provider 列表 | 新增 codegenie 条目 | 使用 priority 排序，不影响已有 Provider | 低 |
| Auth 存储 | 新增 codegenie 认证条目 | auth.json 格式不变，仅新增条目 | 低 |
| 模型选择 | 新增 CodeGenie 模型分组 | 使用 sortBy 排序，不影响已有模型 | 低 |
| TUI 启动 | 新增认证检测逻辑 | 使用 sync.data.provider 检测，不导入 Auth | 中（循环依赖风险） |

#### 7.2.2 对数据的影响

| 数据类型 | 影响描述 | 数据迁移方案 | 回滚方案 |
|----------|----------|--------------|----------|
| auth.json | 新增 codegenie 条目 | 无需迁移 | 删除 codegenie 条目即可 |
| token.enc | 新增 CodeGenie 加密 Token 文件 | 无需迁移 | 删除 `~/.config/codegenie/` 目录 |

#### 7.2.3 对接口的影响

| 接口名称 | 影响类型 | 影响描述 | 兼容性方案 |
|----------|----------|----------|------------|
| Plugin.list() | 扩展 | 返回结果新增 CodegenieAuthPlugin | 向后兼容，不影响已有插件 |
| Auth.set() | 扩展 | 新增 codegenie 的认证数据 | 向后兼容 |
| Provider Manager | 扩展 | 新增 codegenie custom loader | 向后兼容 |

#### 7.2.4 风险评估与缓解措施

| 风险项 | 风险等级 | 影响范围 | 缓解措施 |
|--------|----------|----------|----------|
| 循环依赖导致黑屏 | 高 | 所有用户 | 插件文件不导入 AppRuntime/Effect，使用 saveAuthToDisk |
| OAuth 服务不可用 | 中 | 首次用户无法登录 | 引导界面提供 Other providers 选项 |
| Token 解析失败 | 低 | 已登录用户 | 清除损坏的 Token，显示引导界面 |
| 本地端口占用 | 低 | OAuth 回调失败 | 多端口尝试（10101, 34567-34570） |

---

## 附录

### A. 文件路径索引

| 用途 | 路径 |
|------|------|
| Plugin 类型定义 | `packages/plugin/src/index.ts` |
| Plugin 管理器 | `packages/opencode/src/plugin/index.ts` |
| CodeGenie 插件 | `packages/opencode/src/plugin/codegenie.ts` |
| CodeGenie 模型定义 | `packages/opencode/src/plugin/codegenie-models.ts` |
| CLI 认证命令 | `packages/opencode/src/cli/cmd/providers.ts` |
| Auth 存储 | `packages/opencode/src/auth/index.ts` |
| ProviderAuth 服务 | `packages/opencode/src/provider/auth.ts` |
| Provider 管理 | `packages/opencode/src/provider/provider.ts` |
| TUI 引导组件 | `packages/opencode/src/cli/cmd/tui/component/codegenie-onboarding.tsx` |
| TUI 主页 | `packages/opencode/src/cli/cmd/tui/routes/home.tsx` |
| 模型选择对话框 | `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` |
| Logo 组件 | `packages/opencode/src/cli/cmd/tui/component/logo.tsx` |
| Logo 数据 | `packages/opencode/src/cli/logo.ts` |

### B. 配置与存储

| 数据 | 存储位置 | 格式 |
|------|----------|------|
| OpenCode Auth | `~/.local/share/opencode/auth.json` | JSON，权限 0600 |
| CodeGenie Token | `~/.config/codegenie/token.enc` | 加密 JSON |
| CodeGenie Key | `~/.config/codegenie/.token_key` | 二进制，权限 0600 |

### C. 华为认证服务配置

```typescript
const DEFAULT_CONFIG = {
  baseUrl: "https://devecostudio.huawei.com",
  authUrl: "console/DevEcoIDE/apply",
  tempTokenCheckUrl: "authrouter/auth/api/temptoken/check",
  jwtTokenCheckUrl: "authrouter/auth/api/jwToken/check",
  successRedirectUrl: "console/DevEcoCodeGenie/loginSuccess",
  failedRedirectUrl: "console/DevEcoCodeGenie/loginFailed",
  appId: "1008",
  defaultPort: 10101,
  timeout: 600000,
  countryCode: "CN",
}
```

### D. 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 1.0 | 2026-03-25 | 初始版本 |
| 1.1 | 2026-03-25 | 添加 OpenCode 原始代码修改清单 |
| 2.0 | 2026-03-31 | 精简需求，最小化侵入式修改 |
| 2.1 | 2026-04-02 | 添加 CodeGenie 模型列表集成需求（FR-006~FR-009） |
| 3.0 | 2026-04-21 | 按 SDD 格式重构：修正 appId、补充 DEFAULT_CONFIG、新增 FR-010~FR-012 |
| 4.0 | 2026-04-22 | 按 SDD 模板完整重构：补充系统上下文、需求场景分析、非功能需求、系统影响分析等章节 |
| 4.1 | 2026-04-25 | 补充 FR-013（auth.json 路径一致性）和 FR-014（Plugin Provider 统一排序）需求，修正 US-002 前置条件路径 |
