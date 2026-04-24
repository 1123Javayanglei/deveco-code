# 发布系统改造 - 功能设计说明书

**创建日期**: 2026-04-21
**状态**: 草稿
**关联需求文档**: [01-requirements-analysis.md](./01-requirements-analysis.md)

---

## 1. 功能概述

### 1.1 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 性能目标 | 首次下载从 ~6 分钟优化到 ~6 秒 | Promise.all 并行下载 |
| 架构目标 | 下载逻辑与构建逻辑解耦 | 独立的 postinstall.ts |
| 平台目标 | 仅发布 3 个平台 | ALLOWED_PLATFORMS 白名单 |

### 1.2 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| 解耦 | 下载与构建分离 | postinstall.ts 负责下载，build.ts 负责复制 |
| 幂等 | 缓存存在时跳过 | 文件存在性检测 |
| 容错 | 单点失败不影响整体 | catch 后打印警告继续 |

---

## 2. 技术架构

```
开发者构建链路:
bun install
    │
    ▼
postinstall.ts  并行下载（Promise.all）
├─ downloadRipgrep(platform)  ×3
└─ downloadMcpBridge(platform) ×3
    │
    ▼
.build-cache/
├── ripgrep/{platform}/rg
└── mcp-bridge/{platform}/{napi_bridge.node, package.json}
    │
    ▼
build.ts  从缓存复制到 dist/
├─ ripgrep  → dist/{name}/vendor/ripgrep/
├─ mcp-bridge → dist/{name}/vendor/mcp-bridge-native/
└─ package.json (含 bin, files, os, cpu)
    │
    ▼
publish.ts  白名单过滤 + npm publish

用户安装链路:
npm install @opencode-ai/opencode-cli
    │
    ▼
optionalDependencies → 安装 opencode-{platform}-{arch}
    │
    ▼
postinstall.mjs → 硬链接 bin/ + 复制 vendor/
```

---

## 3. 实现设计

### 3.1 `script/postinstall.ts`（新增）

| 模块 | 职责 |
|------|------|
| 配置定义 | `RG_VERSION=15.1.0`, `RG_BASE`, `supportedPlatforms`, `rgArchiveMap` |
| `proxyEnvSet()` / `fetchWithProxy()` | 代理检测 + undici 下载 |
| `downloadBuffer()` | 通用下载，返回 Buffer |
| `downloadRipgrep()` | ripgrep 下载 + 解压（tar.gz / zip），幂等缓存 |
| `downloadMcpBridge()` | mcp-bridge 从 npmmirror tarball 直取，幂等缓存 |

并行下载:
```typescript
await Promise.all(platforms.flatMap((platform) => [
  downloadRipgrep(platform).catch(...),
  downloadMcpBridge(platform).catch(...),
]))
```

### 3.2 `script/build.ts`（修改）

新增缓存目录定义和 vendor 复制:

```typescript
const rgArchiveMap: Record<string, { archive: string; binary: string }> = {
  "darwin-arm64": { archive: `ripgrep-15.1.0-aarch64-apple-darwin.tar.gz`, binary: "rg" },
  "darwin-x64":   { archive: `ripgrep-15.1.0-x86_64-apple-darwin.tar.gz`, binary: "rg" },
  "win32-x64":    { archive: `ripgrep-15.1.0-x86_64-pc-windows-msvc.zip`, binary: "rg.exe" },
}
```

构建循环中:
- mcp-bridge: 从 `.build-cache/mcp-bridge/{os}-{arch}/` 复制到 `vendor/mcp-bridge-native/`
- ripgrep: 从 `.build-cache/ripgrep/{os}-{arch}/` 复制到 `vendor/ripgrep/`
- package.json 补全 `bin: { opencode: "./bin/opencode" }` 和 `files: ["bin/**/*", "vendor/**/*"]`
- release 打包路径从 `dist/{key}/bin` 改为 `dist/{key}`（包含 vendor）

### 3.3 `script/publish.ts`（修改）

添加平台白名单:

```typescript
const ALLOWED_PLATFORMS = new Set(["darwin-arm64", "darwin-x64", "win32-x64"])
```

跳过不在白名单中的平台和 baseline 包。

### 3.4 `script/postinstall.mjs`（修改）

在原有硬链接逻辑后添加 vendor 目录递归复制:

```javascript
const vendorSrc = path.join(platformPkgDir, "vendor")
const vendorDst = path.join(__dirname, "vendor")
if (fs.existsSync(vendorSrc)) {
  // 递归复制 vendor/ (ripgrep + mcp-bridge-native)
}
```

### 3.5 `src/file/ripgrep.ts`（修改）

在 filepath 查找链中添加 vendor 和 dev 模式路径:

| 优先级 | 查找路径 | 场景 |
|--------|----------|------|
| 1 | 系统 PATH | 用户已安装 ripgrep |
| **2** | `{execDir}/../vendor/ripgrep/rg` | **npm 生产模式（新增）** |
| 3 | `Global.Path.bin/rg` | 全局缓存 |
| **4** | `{sourceDir}/../../.build-cache/ripgrep/{platform}/rg` | **开发模式（新增）** |
| 5 | GitHub 下载 | 最终 fallback |

### 3.6 `package.json`（修改）

- 添加 `"postinstall": "bun run script/postinstall.ts"`
- 添加 mcp-bridge 依赖:
  - `@deveco-codegenie/mcp-bridge: 1.1.0`
  - `@deveco-codegenie/mcp-bridge-darwin-arm64: 1.1.0`
  - `@deveco-codegenie/mcp-bridge-darwin-x64: 1.1.0`
  - `@deveco-codegenie/mcp-bridge-win32-x64: 1.1.0`

### 3.7 `.gitignore`（修改）

```gitignore
.build-cache/
```

---

## 4. 环境变量

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `RIPGREP_DOWNLOAD_BASE` | `https://ghproxy.net/...` | ripgrep 下载源 |
| `NPM_REGISTRY` | `https://registry.npmmirror.com` | mcp-bridge npm 源 |
| `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY` | 无 | 代理配置 |

---

## 5. 设计决策

| 决策 | 原因 |
|------|------|
| 下载逻辑独立为 postinstall.ts | 解耦下载与构建，支持缓存复用 |
| Promise.all 并行下载 | 性能从 ~6 分钟优化到 ~6 秒 |
| ghproxy.net 镜像 | 国内环境 GitHub 下载慢 |
| mcp-bridge 从 npmmirror tarball 直取 | 跳过依赖解析，更可靠 |
| 仅发布 3 个平台 | 减少发布体积，Linux 不在目标范围 |
| ripgrep 版本与 ripgrep.ts 一致（15.1.0） | 避免 vendor 和运行时下载版本不一致 |

---

## 附录

### 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-21 | zhangyuchen | 初始版本 |
