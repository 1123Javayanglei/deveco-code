# 发布系统改造 - 需求分析说明书

**创建日期**: 2026-04-21
**状态**: 草稿

---

## 1. 简介

### 1.1 目的

对 opencode 发布系统进行改造：将构建时下载逻辑迁移至 postinstall 阶段，统一 vendor 目录结构，缩减发布平台范围至 3 个目标平台。

### 1.2 范围

**包含**：
- 将 ripgrep 和 mcp-bridge 的下载逻辑独立为 postinstall.ts
- 统一 `.build-cache/` 缓存目录结构和 `vendor/` 构建产物目录结构
- 发布平台白名单过滤（darwin-arm64、darwin-x64、win32-x64）
- npm 安装后自动复制 vendor 目录
- ripgrep 运行时查找路径适配

**不包含**：
- CI/CD 流水线改造
- 新增平台支持
- 二进制文件签名或公证

### 1.3 假设和约束

| 类型 | 描述 |
|------|------|
| 假设 | 用户环境可通过代理或直连访问 GitHub releases 和 npmmirror |
| 约束 | 仅支持 3 个平台：darwin-arm64、darwin-x64、win32-x64 |
| 约束 | 使用 bun 作为开发时运行时，npm 作为发布目标 |
| 约束 | mcp-bridge 仅用于打包，运行时不直接引用 |

### 1.4 术语与缩写

| 术语/缩写 | 全称 | 说明 |
|-----------|------|------|
| vendor | 第三方二进制 | 随产品分发的第三方可执行文件（ripgrep、mcp-bridge） |
| postinstall | 安装后脚本 | npm/bun install 完成后自动执行的脚本 |
| mcp-bridge | MCP 桥接库 | 鸿蒙 NAPI 桥接二进制，仅打包分发 |

---

## 2. 系统上下文

```
开发者环境                          npm 生态                        用户环境
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ bun install  │              │              │              │ npm install  │
│      │       │              │              │              │      │       │
│      ▼       │              │              │              │      ▼       │
│ postinstall  │──下载缓存──▶ │  .build-cache│              │ postinstall  │
│      │       │              │              │              │     .mjs     │
│      ▼       │              │              │              │      │       │
│ bun build    │──复制vendor─▶│  dist/       │──npm publish─▶│ 复制vendor   │
│      │       │              │              │              │      │       │
│      ▼       │              │              │              │      ▼       │
│ bun publish  │──────────────▶│  npm registry│─────────────▶│ opencode     │
└──────────────┘              └──────────────┘              └──────────────┘

外部依赖：
├── GitHub Releases (ripgrep)
├── npmmirror (mcp-bridge)
└── 代理环境变量 (HTTPS_PROXY / HTTP_PROXY / ALL_PROXY)
```

---

## 3. 需求场景分析

### 3.1 业务流程

```
开发者构建流程:

bun install
    │
    ▼
postinstall.ts ──▶ 并行下载 ripgrep + mcp-bridge 到 .build-cache/
    │
    ▼
bun run build
    │
    ▼
build.ts ──▶ 从 .build-cache/ 复制到 dist/.../vendor/
    │
    ▼
bun run publish ──▶ 白名单过滤 ──▶ npm publish


用户安装流程:

npm install @opencode-ai/opencode-cli
    │
    ▼
optionalDependencies ──▶ 安装对应平台包
    │
    ▼
postinstall.mjs ──▶ 硬链接二进制 + 复制 vendor/
```

### 3.2 业务规则

| 规则编号 | 规则名称 | 规则描述 | 优先级 |
|----------|----------|----------|--------|
| BR-001 | 平台白名单 | 仅构建和发布 darwin-arm64、darwin-x64、win32-x64 | 高 |
| BR-002 | 下载幂等 | 已缓存的二进制自动跳过 | 高 |
| BR-003 | 并行下载 | 所有平台的所有二进制并行下载 | 高 |
| BR-004 | 代理支持 | 支持 HTTPS_PROXY / HTTP_PROXY / ALL_PROXY | 中 |
| BR-005 | 镜像加速 | ripgrep 默认使用 ghproxy.net 镜像 | 中 |

### 3.3 用户场景

**US-001: 开发者首次构建** (P1)

| 项目 | 描述 |
|------|------|
| 前置条件 | 已安装 bun 运行时 |
| 操作步骤 | 1. `bun install` 触发 postinstall.ts<br>2. 并行下载 ripgrep + mcp-bridge<br>3. `bun run build` 从缓存复制 vendor<br>4. 构建产物可正常运行 |
| 预期结果 | 6 个二进制文件（3 ripgrep + 3 mcp-bridge）缓存到 .build-cache/ |
| 异常处理 | 单平台下载失败打印警告但不阻断 |

**US-002: 开发者增量构建** (P1)

| 项目 | 描述 |
|------|------|
| 前置条件 | .build-cache/ 中已有缓存 |
| 操作步骤 | `bun install` → 检测到缓存，跳过下载 → `bun run build` |
| 预期结果 | 跳过下载，构建速度不受网络影响 |

**US-003: 用户 npm 安装** (P1)

| 项目 | 描述 |
|------|------|
| 操作步骤 | `npm install` → optionalDependencies 安装平台包 → postinstall.mjs 硬链接 + 复制 vendor/ |
| 预期结果 | vendor/ripgrep/rg 和 vendor/mcp-bridge-native/ 可被运行时正确找到 |

**US-004: 发布到 npm** (P1)

| 项目 | 描述 |
|------|------|
| 操作步骤 | `bun run publish` → 白名单过滤 → 发布各平台包 + 主包 |
| 预期结果 | npm 上可见 3 个平台包 + 1 个主包 |

---

## 4. 功能性需求

| 需求编号 | 需求名称 | 需求描述 | 优先级 |
|----------|----------|----------|--------|
| FR-001 | postinstall 下载脚本 | 新增 postinstall.ts，并行下载 ripgrep 和 mcp-bridge 到 .build-cache/ | P1 |
| FR-002 | build.ts vendor 复制 | 从 .build-cache/ 复制到 dist/.../vendor/，补全 package.json bin/files | P1 |
| FR-003 | publish 白名单过滤 | 仅发布 ALLOWED_PLATFORMS 中的平台包 | P1 |
| FR-004 | npm postinstall vendor 复制 | postinstall.mjs 从平台包复制 vendor/ 到主包 | P1 |
| FR-005 | ripgrep 路径适配 | ripgrep.ts 添加 vendor 目录 + dev 模式 fallback | P1 |
| FR-006 | mcp-bridge 依赖 | package.json 添加 @deveco-codegenie/mcp-bridge 及平台包 | P1 |

### 依赖关系

| 需求ID | 依赖需求 | 说明 |
|--------|----------|------|
| FR-002 | FR-001 | build.ts 依赖 postinstall.ts 预先下载的缓存 |
| FR-005 | FR-004 | ripgrep 运行时依赖 postinstall.mjs 复制的 vendor |
| FR-003 | FR-002 | 发布依赖构建产物 |

---

## 5. 系统影响分析

| 影响模块 | 影响类型 | 影响程度 | 影响描述 |
|----------|----------|----------|----------|
| `script/postinstall.ts` | 新增 | 高 | 并行下载 ripgrep + mcp-bridge |
| `script/build.ts` | 修改 | 高 | vendor 缓存复制 + package.json 补全 |
| `script/publish.ts` | 修改 | 中 | 平台白名单过滤 |
| `script/postinstall.mjs` | 修改 | 中 | vendor 目录复制 |
| `src/file/ripgrep.ts` | 修改 | 中 | 添加 vendor + dev 模式 fallback |
| `package.json` | 修改 | 低 | postinstall 脚本 + mcp-bridge 依赖 |
| `.gitignore` | 修改 | 低 | .build-cache/ |

### 风险评估

| 风险项 | 风险等级 | 缓解措施 |
|--------|----------|----------|
| ghproxy 镜像不可用 | 中 | 支持 RIPGREP_DOWNLOAD_BASE 环境变量覆盖 |
| npmmirror 不可用 | 中 | 支持 NPM_REGISTRY 环境变量覆盖 |
| 缓存损坏 | 低 | 删除 .build-cache/ 重新下载 |

---

## 附录

### 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-21 | zhangyuchen | 初始版本 |
