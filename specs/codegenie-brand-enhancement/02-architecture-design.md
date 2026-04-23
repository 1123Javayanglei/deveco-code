# CodeGenie 品牌增强 - 架构设计说明书

## 1. 文档概述

### 1.1 文档目的

基于需求分析说明书，本文档详细描述 CodeGenie 品牌增强的替换模式、数据流设计和接口规范。

### 1.2 设计原则

- **一致性**: 统一的替换规则，完整的品牌体验
- **安全性**: 排除规则保护外部依赖不被误改
- **可追溯**: 每项替换有明确的映射关系
- **性能优先**: 批量替换优化，不影响构建速度

### 1.3 需求索引

| 需求编号 | 需求名称 | 替换类型 |
|---------|---------|---------|
| REQ-001 | 数据库名称 | 文件名替换 |
| REQ-002 | mDNS 域名 | 字符串替换 |
| REQ-003 | 应用名称 | 全局标识替换 |
| REQ-004 | 文本标识 | 大小写敏感替换 |
| REQ-005 | 环境变量 | 前缀替换 |
| REQ-006 | 标题缩写 | 上下文替换 |
| REQ-007 | 退出消息 | 结构替换 |
| REQ-008 | User-Agent | HTTP 头替换 |
| REQ-009 | scriptName | CLI 命令替换 |
| REQ-010 | HTTP Headers | Header 键值替换 |

---

## 2. 替换模式设计

### 2.1 替换模式分类

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           替换模式架构图                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │  标识符替换  │     │  字符串替换  │     │  结构替换   │            │
│    │  Identifier │     │   String    │     │  Structural │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│          │                   │                   │                     │
│          │                   │                   │                     │
│          ▼                   ▼                   ▼                     │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │ 应用名称    │     │ 数据库名    │     │ 退出消息    │            │
│    │ 环境变量    │     │ mDNS 域名   │     │ Logo 渲染   │            │
│    │ User-Agent │     │ 文本标识    │     │             │            │
│    │ Headers    │     │ 标题缩写    │     │             │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 标识符替换模式

适用于代码中的标识符、变量名、配置键等需要精确匹配的内容。

#### 2.2.1 应用名称替换

| 原值 | 目标值 | 匹配规则 |
|------|--------|---------|
| `const app = "opencode"` | `const app = "codegenie"` | 精确匹配 |
| `"name": "opencode"` | `"name": "codegenie"` | JSON 字段值 |
| `"opencode": "./bin/opencode"` | `"codegenie": "./bin/codegenie"` | CLI 命令定义 |

**实现位置**:
- `src/global/index.ts` - 全局应用名称
- `package.json` - 包名和 bin 命令

#### 2.2.2 环境变量替换

**替换范围分类**:

| 类型 | 替换策略 | 示例 | 说明 |
|-----|---------|------|------|
| `process.env.OPENCODE_*` | **替换** → CODEGENIE | `process.env.OPENCODE_API_KEY` | 用户配置的环境变量 |
| `declare global { const OPENCODE_* }` | **保持** | `declare global { const OPENCODE_VERSION }` | TypeScript 全局声明 |
| `declare const OPENCODE_*` | **保持** | `declare const OPENCODE_MIGRATIONS` | 顶层全局常量声明 |

**process.env 环境变量映射**:

| 原变量名 | 目标变量名 | 替换规则 |
|---------|-----------|---------|
| `OPENCODE_API_KEY` | `CODEGENIE_API_KEY` | 前缀替换 |
| `OPENCODE_API_URL` | `CODEGENIE_API_URL` | 前缀替换 |
| `OPENCODE_MODEL` | `CODEGENIE_MODEL` | 前缀替换 |
| `OPENCODE_DEBUG` | `CODEGENIE_DEBUG` | 前缀替换 |
| `OPENCODE_CONFIG_PATH` | `CODEGENIE_CONFIG_PATH` | 前缀替换 |
| `OPENCODE_CONFIG_DIR` | `CODEGENIE_CONFIG_DIR` | 前缀替换 |
| `OPENCODE_CONFIG_CONTENT` | `CODEGENIE_CONFIG_CONTENT` | 前缀替换 |
| `OPENCODE_CONSOLE_TOKEN` | `CODEGENIE_CONSOLE_TOKEN` | 前缀替换 |
| `OPENCODE_SERVER_PASSWORD` | `CODEGENIE_SERVER_PASSWORD` | 前缀替换 |
| `OPENCODE_AUTO_SHARE` | `CODEGENIE_AUTO_SHARE` | 前缀替换 |
| `OPENCODE_MCP_PORT` | `CODEGENIE_MCP_PORT` | 前缀替换 |

**全局声明排除规则**:

| 变量名 | 声明类型 | 排除原因 |
|--------|---------|---------|
| `OPENCODE_VERSION` | `declare global {}` | 构建时注入，TypeScript 全局声明 |
| `OPENCODE_CHANNEL` | `declare global {}` | 构建时注入，TypeScript 全局声明 |
| `OPENCODE_LIBC` | `declare const` | 构建时注入，顶层全局常量 |
| `OPENCODE_MIGRATIONS` | `declare const` | 构建时注入，顶层全局常量 |
| `OPENCODE_WORKER_PATH` | 构建配置 | 构建时注入 |
| `OPENCODE_RUN_ID` | 常量 | Worker 进程通信标识 |
| `OPENCODE_PROCESS_ROLE` | 常量 | Worker 进程通信标识 |

#### 2.2.3 User-Agent 替换

| 原值 | 目标值 | 上下文 |
|------|--------|--------|
| `opencode/${channel}/${version}/${client}` | `codegenie/${channel}/${version}/${client}` | 安装检查 |
| `opencode/${version} gitlab-ai-provider/${v}` | `codegenie/${version} gitlab-ai-provider/${v}` | GitLab Provider |
| `opencode/${version} cloudflare-workers-ai` | `codegenie/${version} cloudflare-workers-ai` | Cloudflare Workers |
| `opencode/${version} cloudflare-ai-gateway` | `codegenie/${version} cloudflare-ai-gateway` | Cloudflare Gateway |
| `opencode/${version}` | `codegenie/${version}` | LLM 会话 |

### 2.3 字符串替换模式

适用于文本内容、日志消息、命令描述等需要大小写敏感替换的内容。

#### 2.3.1 数据库名称替换

| 原值 | 目标值 | 匹配规则 |
|------|--------|---------|
| `opencode.db` | `codegenie.db` | 精确匹配 |
| `opencode-${channel}.db` | `codegenie-${channel}.db` | 模板匹配 |

**数据流**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  应用启动   │────▶│  检查频道   │────▶│  构建路径   │
│             │     │  配置       │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  默认路径   │◀────│  频道路径   │
                    │ codegenie.db│     │ codegenie-{channel}.db
                    └─────────────┘     └─────────────┘
```

#### 2.3.2 mDNS 域名替换

| 原值 | 目标值 | 上下文 |
|------|--------|--------|
| `opencode.local` | `codegenie.local` | mDNS 服务域名 |
| `opencode-${port}` | `codegenie-${port}` | mDNS 服务名称 |

**数据流**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  服务器启动 │────▶│  mDNS 注册  │────▶│  广播服务   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  服务发现   │
                    │ codegenie.local
                    └─────────────┘
```

#### 2.3.3 文本标识替换

| 原值 | 目标值 | 匹配规则 |
|------|--------|---------|
| `opencode` | `codegenie` | 小写精确匹配 |
| `OpenCode` | `CodeGenie` | 标题大小写匹配 |
| `OPENCODE` | `CODEGENIE` | 大写精确匹配 |
| `Opencode` | `Codegenie` | 首字母大写匹配 |

**排除规则**:

| 排除类型 | 排除内容 | 匹配模式 |
|---------|---------|---------|
| URL | `https://opencode.ai` | URL 协议前缀 |
| GitHub | `github.com/anomalyco/opencode` | 仓库路径 |
| SDK 包名 | `@opencode-ai/*` | NPM scope |
| Effect ID | `@opencode/*` | Effect Service ID |
| 外部插件 | `opencode-gitlab-auth` | 插件包名 |
| 外部插件 | `opencode-poe-auth` | 插件包名 |

#### 2.3.4 标题缩写替换

| 原值 | 目标值 | 上下文 |
|------|--------|--------|
| `OC` | `CodeGenie` | 服务器标题 |
| `OC` | `CodeGenie` | OAuth 回调页面标题 |
| `OC` | `CodeGenie` | Logo 显示标题 |

**注意**: 仅在标题上下文中替换，不替换代码中的 `OC` 变量名或其他缩写。

### 2.4 结构替换模式

适用于需要结构性变更的内容，如退出消息、Logo 渲染等。

#### 2.4.1 退出消息替换

**原结构**:
```typescript
exit.message.set("opencode", "Goodbye!")
```

**目标结构**:
```typescript
exit.message.set(...logo, "", "Goodbye from CodeGenie!")
```

**变更要点**:
1. 使用 spread 操作符展开 logo
2. 首行留空
3. 品牌标识替换为 `CodeGenie`

#### 2.4.2 HTTP Headers 替换

**x-opencode-* Headers**:

| 原 Header | 目标 Header |
|-----------|------------|
| `x-opencode-sync` | `x-codegenie-sync` |
| `x-opencode-directory` | `x-codegenie-directory` |
| `x-opencode-workspace` | `x-codegenie-workspace` |
| `x-opencode-proxy-url` | `x-codegenie-proxy-url` |
| `x-opencode-project` | `x-codegenie-project` |
| `x-opencode-session` | `x-codegenie-session` |
| `x-opencode-request` | `x-codegenie-request` |
| `x-opencode-client` | `x-codegenie-client` |

**HTTP-Referer / X-Title Headers**:

| Header | 原值 | 目标值 |
|--------|------|--------|
| `HTTP-Referer` | `https://opencode.ai/` | 保持不变 |
| `X-Title` | `opencode` | `codegenie` |

**数据流**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  HTTP 请求  │────▶│  Header 构建 │────▶│  发送请求   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Headers    │
                    │  x-codegenie-*
                    │  User-Agent: codegenie/...
                    └─────────────┘
```

---

## 3. 数据流设计

### 3.1 环境变量数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        环境变量数据流                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                       │
│  │  用户配置   │  CODEGENIE_API_KEY                                    │
│  │  环境变量   │  CODEGENIE_API_URL                                    │
│  │             │  CODEGENIE_MODEL                                      │
│  └─────────────┘  CODEGENIE_DEBUG                                      │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  配置加载   │  process.env.CODEGENIE_*                              │
│  │             │                                                       │
│  └─────────────┘                                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│  │  Provider   │     │  Storage    │     │  Server     │              │
│  │  配置       │     │  配置       │     │  配置       │              │
│  └─────────────┘     └─────────────┘     └─────────────┘              │
│                                                                         │
│  ┌─────────────┐                                                       │
│  │  排除变量   │  OPENCODE_VERSION (构建时)                            │
│  │  (保持不变) │  OPENCODE_CHANNEL (构建时)                            │
│  │             │  OPENCODE_RUN_ID (进程通信)                          │
│  └─────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 数据库路径数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        数据库路径数据流                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                       │
│  │  应用启动   │                                                       │
│  └─────────────┘                                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐     ┌─────────────┐                                  │
│  │  检查频道   │────▶│  默认频道?   │                                  │
│  │  配置       │     │             │                                  │
│  └─────────────┘     └─────────────┘                                  │
│         │                   │                                          │
│         │          ┌────────┴────────┐                                 │
│         │          │                 │                                 │
│         │          ▼                 ▼                                 │
│         │   ┌─────────────┐   ┌─────────────┐                         │
│         │   │  是          │   │  否         │                         │
│         │   │  codegenie.db│   │  codegenie-{channel}.db               │
│         │   └─────────────┘   └─────────────┘                         │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  构建路径   │  ~/.config/codegenie/codegenie.db                     │
│  │             │  ~/.config/codegenie/codegenie-{channel}.db          │
│  └─────────────┘                                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  数据库连接 │                                                       │
│  └─────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 mDNS 服务发现数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       mDNS 服务发现数据流                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                       │
│  │  服务器启动 │                                                       │
│  │  (port)     │                                                       │
│  └─────────────┘                                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  mDNS 注册  │  hostname: "codegenie.local"                         │
│  │             │  service: "codegenie-{port}"                         │
│  └─────────────┘                                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  广播服务   │  _codegenie._tcp.local                               │
│  └─────────────┘                                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐     ┌─────────────┐                                  │
│  │  客户端发现 │────▶│  解析服务   │                                  │
│  │             │     │             │                                  │
│  └─────────────┘     └─────────────┘                                  │
│         │                   │                                          │
│         │                   ▼                                          │
│         │            ┌─────────────┐                                  │
│         │            │  连接服务   │  codegenie.local:port            │
│         │            └─────────────┘                                  │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  CLI 显示   │  "Available at: http://codegenie.local:{port}"       │
│  └─────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.4 HTTP 请求 Headers 数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HTTP 请求 Headers 数据流                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                       │
│  │  请求发起   │  Provider / LLM / Plugin                              │
│  └─────────────┘                                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────┐                                                       │
│  │  Headers 构建│                                                      │
│  └─────────────┘                                                       │
│         │                                                              │
│         ├──────────────────────────────────────────────────────────┐   │
│         │                                                          │   │
│         ▼                                                          ▼   │
│  ┌─────────────┐                                           ┌─────────────┐
│  │  标准Headers │                                           │  自定义Headers│
│  │             │                                           │             │
│  │ User-Agent: │                                           │ x-codegenie-*│
│  │ codegenie/  │                                           │             │
│  │ {version}   │                                           │ x-codegenie-project
│  │             │                                           │ x-codegenie-session
│  │ HTTP-Referer│                                           │ x-codegenie-request
│  │ : opencode.ai│                                          │ x-codegenie-client
│  │ (保持不变)  │                                           │             │
│  │             │                                           │ X-Title:    │
│  │ X-Title:    │                                           │ codegenie   │
│  │ codegenie   │                                           │             │
│  └─────────────┘                                           └─────────────┘
│         │                                                          │   │
│         └──────────────────────────────────────────────────────────┘   │
│                                  │                                     │
│                                  ▼                                     │
│                           ┌─────────────┐                             │
│                           │  发送请求   │                             │
│                           └─────────────┘                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 接口设计

### 4.1 全局标识接口

| 接口位置 | 接口名称 | 原值 | 目标值 |
|---------|---------|------|--------|
| `src/global/index.ts` | `app` | `"opencode"` | `"codegenie"` |
| `package.json` | `name` | `"opencode"` | `"codegenie"` |
| `package.json` | `bin` | `"opencode"` | `"codegenie"` |

### 4.2 存储接口

| 接口位置 | 接口名称 | 原值 | 目标值 |
|---------|---------|------|--------|
| `src/storage/db.ts` | 数据库文件名 | `"opencode.db"` | `"codegenie.db"` |
| `src/storage/db.ts` | 频道数据库 | `"opencode-{channel}.db"` | `"codegenie-{channel}.db"` |

### 4.3 网络接口

| 接口位置 | 接口名称 | 原值 | 目标值 |
|---------|---------|------|--------|
| `src/server/mdns.ts` | mDNS 域名 | `"opencode.local"` | `"codegenie.local"` |
| `src/server/mdns.ts` | mDNS 服务名 | `"opencode-{port}"` | `"codegenie-{port}"` |
| `src/cli/network.ts` | 显示域名 | `"opencode.local"` | `"codegenie.local"` |
| `src/config/server.ts` | 默认域名 | `"opencode.local"` | `"codegenie.local"` |

### 4.4 HTTP 接口

| 接口位置 | Header 名称 | 原值 | 目标值 |
|---------|------------|------|--------|
| `src/server/fence.ts` | 同步 Header | `x-opencode-sync` | `x-codegenie-sync` |
| `src/server/proxy.ts` | 目录 Header | `x-opencode-directory` | `x-codegenie-directory` |
| `src/server/proxy.ts` | 工作区 Header | `x-opencode-workspace` | `x-codegenie-workspace` |
| `src/server/proxy.ts` | 代理 URL Header | `x-opencode-proxy-url` | `x-codegenie-proxy-url` |
| `src/session/llm.ts` | 项目 Header | `x-opencode-project` | `x-codegenie-project` |
| `src/session/llm.ts` | 会话 Header | `x-opencode-session` | `x-codegenie-session` |
| `src/session/llm.ts` | 请求 Header | `x-opencode-request` | `x-codegenie-request` |
| `src/session/llm.ts` | 客户端 Header | `x-opencode-client` | `x-codegenie-client` |

### 4.5 OAuth 接口

| 接口位置 | 接口名称 | 原值 | 目标值 |
|---------|---------|------|--------|
| `src/mcp/oauth-provider.ts` | `client_name` | `"OpenCode"` | `"CodeGenie"` |
| `src/account/account.ts` | `clientId` | `"opencode-cli"` | `"codegenie-cli"` |

---

## 5. 排除规则设计

### 5.1 排除规则分类

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           排除规则架构                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │  URL 排除    │     │  SDK 排除   │     │  构建排除   │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│          │                   │                   │                     │
│          │                   │                   │                     │
│          ▼                   ▼                   ▼                     │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │ opencode.ai │     │ @opencode-ai/*│     │ OPENCODE_VERSION       │
│    │ github.com/ │     │ @opencode/*  │     │ OPENCODE_CHANNEL        │
│    │ anomalyco/  │     │              │     │ OPENCODE_LIBC           │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│                                                                         │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │  插件排除   │     │  进程排除   │     │  变量排除   │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│          │                   │                   │                     │
│          │                   │                   │                     │
│          ▼                   ▼                   ▼                     │
│    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│    │ opencode-   │     │ OPENCODE_   │     │ opencodeProcess│
│    │ gitlab-auth │     │ RUN_ID      │     │ OpenCodeSession│
│    │ opencode-   │     │ OPENCODE_   │     │              │            │
│    │ poe-auth    │     │ PROCESS_ROLE│     │              │            │
│    └─────────────┘     └─────────────┘     └─────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 排除规则详情

#### 5.2.1 URL 排除

| 排除模式 | 匹配示例 | 排除原因 |
|---------|---------|---------|
| `https://opencode.ai` | 官网 URL | 外部网站 |
| `https://opencode.ai/*` | 安装脚本等 | 外部网站 |
| `github.com/anomalyco/opencode` | GitHub 仓库 | 外部仓库 |
| `api.github.com/repos/anomalyco/opencode` | GitHub API | 外部 API |

#### 5.2.2 SDK 包名排除

| 排除模式 | 匹配示例 | 排除原因 |
|---------|---------|---------|
| `@opencode-ai/*` | `@opencode-ai/sdk` | 独立 NPM 包 |
| `@opencode-ai/*` | `@opencode-ai/shared` | 独立 NPM 包 |
| `@opencode-ai/*` | `@opencode-ai/plugin` | 独立 NPM 包 |
| `@opencode-ai/*` | `@opencode-ai/script` | 独立 NPM 包 |

#### 5.2.3 Effect Service ID 排除

| 排除模式 | 匹配示例 | 排除原因 |
|---------|---------|---------|
| `@opencode/*` | `@opencode/Plugin` | Effect Context Service ID |
| `@opencode/*` | `@opencode/Session` | Effect Context Service ID |
| `@opencode/*` | `@opencode/Config` | Effect Context Service ID |
| `@opencode/*` | `@opencode/LLM` | Effect Context Service ID |
| `@opencode/*` | `@opencode/Provider` | Effect Context Service ID |
| `@opencode/*` | `@opencode/Installation` | Effect Context Service ID |
| `@opencode/*` | `@opencode/Account` | Effect Context Service ID |
| `@opencode/*` | `@opencode/FileWatcher` | Effect Context Service ID |

#### 5.2.4 构建时变量排除

| 变量名 | 排除原因 |
|--------|---------|
| `OPENCODE_VERSION` | 构建时注入，非用户配置 |
| `OPENCODE_CHANNEL` | 构建时注入，非用户配置 |
| `OPENCODE_LIBC` | 构建时注入，非用户配置 |
| `OPENCODE_MIGRATIONS` | 构建时注入，非用户配置 |
| `OPENCODE_WORKER_PATH` | 构建时注入，非用户配置 |

#### 5.2.5 进程通信标识排除

| 变量名 | 排除原因 |
|--------|---------|
| `OPENCODE_RUN_ID` | Worker 进程通信标识 |
| `OPENCODE_PROCESS_ROLE` | Worker 进程通信标识 |

#### 5.2.6 外部插件排除

| 排除模式 | 匹配示例 | 排除原因 |
|---------|---------|---------|
| `opencode-gitlab-auth` | GitLab 认证插件 | 外部插件 |
| `opencode-poe-auth` | Poe 认证插件 | 外部插件 |

#### 5.2.7 代码变量名排除

| 排除模式 | 匹配示例 | 排除原因 |
|---------|---------|---------|
| `opencodeProcess` | 变量名 | 内部变量名 |
| `OpenCodeSession` | 类型名 | 内部类型名 |

---

## 6. 性能设计

### 6.1 批量替换优化

| 优化措施 | 实现方式 | 预期效果 |
|---------|---------|---------|
| 文件分组 | 按文件类型分组处理 | 减少上下文切换 |
| 并行处理 | 多文件并行替换 | 加速 3-4 倍 |
| 增量替换 | 只处理变更文件 | 减少 70% 处理量 |
| 规则缓存 | 缓存正则编译结果 | 减少 20% 编译时间 |

### 6.2 替换顺序优化

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          替换执行顺序                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. 精确匹配替换（优先级最高）                                           │
│     ├── 数据库名: opencode.db → codegenie.db                           │
│     ├── mDNS 域名: opencode.local → codegenie.local                    │
│     ├── User-Agent: opencode/ → codegenie/                             │
│     └── Headers: x-opencode-* → x-codegenie-*                          │
│                                                                         │
│  2. 大小写敏感替换（中等优先级）                                         │
│     ├── OPENCODE → CODEGENIE                                           │
│     ├── OpenCode → CodeGenie                                           │
│     ├── Opencode → Codegenie                                           │
│     └── opencode → codegenie                                           │
│                                                                         │
│  3. 上下文替换（低优先级）                                               │
│     ├── 标题缩写: OC → CodeGenie                                       │
│     └── 退出消息: 结构性变更                                            │
│                                                                         │
│  4. 排除验证（最后执行）                                                 │
│     └── 验证排除项未被误改                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 验证性能

| 验证项 | 验证方式 | 预期耗时 |
|--------|---------|---------|
| 类型检查 | `bun typecheck` | < 30s |
| 遗留检查 | grep 排除规则 | < 5s |
| 构建验证 | `bun build` | < 60s |

---

## 7. 文件变更索引

### 7.1 核心变更文件

| 需求 | 文件路径 | 变更类型 |
|-----|---------|---------|
| REQ-001 | `src/storage/db.ts` | 数据库名 |
| REQ-002 | `src/server/mdns.ts` | mDNS 域名 |
| REQ-002 | `src/cli/network.ts` | mDNS 域名 |
| REQ-002 | `src/config/server.ts` | mDNS 域名 |
| REQ-003 | `src/global/index.ts` | 应用名称 |
| REQ-003 | `package.json` | 包名、bin |
| REQ-004 | 多个 CLI/TUI 文件 | 文本标识 |
| REQ-005 | `src/util/opencode-process.ts` | 环境变量 |
| REQ-005 | `src/installation/version.ts` | 环境变量 |
| REQ-006 | `src/server/server.ts` | 标题缩写 |
| REQ-006 | `src/mcp/oauth-callback.ts` | 标题缩写 |
| REQ-006 | `src/cli/logo.ts` | 标题缩写 |
| REQ-008 | `src/installation/index.ts` | User-Agent |
| REQ-008 | `src/provider/provider.ts` | User-Agent |
| REQ-008 | `src/session/llm.ts` | User-Agent |
| REQ-008 | `src/plugin/codex.ts` | User-Agent |
| REQ-010 | `src/server/fence.ts` | Headers |
| REQ-010 | `src/server/proxy.ts` | Headers |
| REQ-010 | `src/session/llm.ts` | Headers |
| REQ-010 | `src/provider/provider.ts` | Headers |

### 7.2 变更统计

| 变更类型 | 文件数 | 变更行数 |
|---------|-------|---------|
| 数据库名 | 1 | 2 |
| mDNS 域名 | 3 | 5 |
| 应用名称 | 2 | 3 |
| 文本标识 | ~20 | ~30 |
| User-Agent | 4 | 8 |
| HTTP Headers | 4 | 15 |
| OAuth 标识 | 2 | 2 |
| **总计** | **~15** | **~65** |

---

## 8. 版本历史

| 版本 | 日期 | 修改内容 |
| ---- | ---------- | -------- |
| 2.0 | 2026-04-22 | 完整重写，聚焦替换模式和数据流设计，移除 brand-replacer-tool 章节 |
| 1.4 | 2026-04-09 | 原 §10「运行时产品默认」迁至 `specs/configure/` |
| 1.3 | 2026-04-09 | 曾描述 `flag.ts` 内 `!falsy` 求值 |
| 1.2 | 2026-04-09 | 曾新增运行时默认章节 |
| 1.1 | 2026-04-09 | 补充 Logo 模块结构 |
| 1.0 | 2026-04-02 | 初始版本 |