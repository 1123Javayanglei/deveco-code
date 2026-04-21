# 发布系统改造 - 源码修改清单

> **设计原则**: 将构建时下载逻辑迁移至 postinstall 阶段，统一 vendor 目录结构，仅支持 3 个目标平台。

---

## 1. 修改概览

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `packages/opencode/script/postinstall.ts` | 新增 | `bun install` 后自动下载 ripgrep 和 mcp-bridge 到 `.build-cache/`，使用镜像加速 + 并行下载 |
| `packages/opencode/script/build.ts` | 修改 | 添加 vendor 缓存复制逻辑，补全 package.json 的 bin/files 字段 |
| `packages/opencode/script/publish.ts` | 修改 | 添加平台白名单过滤，只发布 darwin-arm64、darwin-x64、win32-x64 |
| `packages/opencode/script/postinstall.mjs` | 修改 | 添加 vendor 目录复制逻辑 |
| `packages/opencode/src/file/ripgrep.ts` | 修改 | 添加 vendor 目录和 dev 模式 fallback 查找路径 |
| `packages/opencode/package.json` | 修改 | 添加 postinstall 脚本 + mcp-bridge 依赖 |
| `packages/opencode/.gitignore` | 修改 | 添加 `.build-cache/` |

**总计**: 新增 1 个文件，修改 6 个文件。

---

## 2. 支持平台

```
darwin-arm64, darwin-x64, win32-x64
```

---

## 3. 缓存目录结构

```
.build-cache/
├── ripgrep/
│   ├── darwin-arm64/rg
│   ├── darwin-x64/rg
│   └── win32-x64/rg.exe
└── mcp-bridge/
    ├── darwin-arm64/{napi_bridge.node, package.json}
    ├── darwin-x64/{napi_bridge.node, package.json}
    └── win32-x64/{napi_bridge.node, package.json}
```

---

## 4. 构建产物目录结构

```
dist/opencode-darwin-arm64/
├── bin/
│   └── opencode
├── vendor/
│   ├── ripgrep/
│   │   └── rg
│   └── mcp-bridge-native/
│       ├── package.json
│       └── napi_bridge.node
└── package.json               ← 含 bin、files、os、cpu 字段
```

---

## 5. 详细修改说明

### 5.1 `packages/opencode/script/postinstall.ts`（新增）

`bun install` 后自动执行的下载脚本，所有平台并行下载（`Promise.all`）：

- **ripgrep**: 默认使用 `ghproxy.net` 镜像，支持 `RIPGREP_DOWNLOAD_BASE` 环境变量覆盖
- **mcp-bridge**: 从 npmmirror 下载 tarball 直取，支持 `NPM_REGISTRY` 环境变量覆盖
- **幂等**: 已缓存的二进制自动跳过
- **代理支持**: `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`

### 5.2 `packages/opencode/script/build.ts`

添加 vendor 缓存复制和 package.json 补全：

- `rgArchiveMap` 定义 ripgrep 归档映射（版本 15.1.0）
- `mcpCacheDir` / `rgCacheDir` 指向 `.build-cache/` 子目录
- 构建循环中从缓存复制 ripgrep 到 `dist/{name}/vendor/ripgrep/`
- 构建循环中从缓存复制 mcp-bridge 到 `dist/{name}/vendor/mcp-bridge-native/`
- package.json 添加 `bin: { opencode: "./bin/opencode" }` 和 `files: ["bin/**/*", "vendor/**/*"]`
- release 打包从 `dist/{key}/bin` 改为 `dist/{key}`（包含 vendor）

### 5.3 `packages/opencode/script/publish.ts`

添加 `ALLOWED_PLATFORMS` 白名单：

- 仅发布 `darwin-arm64`、`darwin-x64`、`win32-x64`
- 跳过 baseline 和不在白名单中的平台

### 5.4 `packages/opencode/script/postinstall.mjs`

在原有硬链接逻辑后添加 vendor 目录递归复制：

- 从平台包 `vendor/` 复制到主包 `vendor/`
- 包含 `vendor/ripgrep/` 和 `vendor/mcp-bridge-native/`

### 5.5 `packages/opencode/src/file/ripgrep.ts`

在 filepath 查找链中添加 2 个新路径（vendor + dev 模式）：

| 优先级 | 查找路径 | 场景 |
|--------|----------|------|
| 1 | 系统 PATH (`which("rg")`) | 用户已安装 ripgrep |
| **2** | **`{execDir}/../vendor/ripgrep/rg`** | **npm 生产模式（新增）** |
| 3 | `Global.Path.bin/rg` | 全局缓存 |
| **4** | **`{sourceDir}/../../.build-cache/ripgrep/{platform}/rg`** | **开发模式（新增）** |
| 5 | GitHub 下载 | 最终 fallback |

### 5.6 `packages/opencode/package.json`

- 添加 `"postinstall": "bun run script/postinstall.ts"` 脚本
- 添加 `@deveco-codegenie/mcp-bridge` 及 3 个平台包依赖（仅用于打包）

### 5.7 `packages/opencode/.gitignore`

```gitignore
# 新增
.build-cache/
```

---

## 6. 流程总结

```
bun install
  └── postinstall.ts → 并行下载 ripgrep + mcp-bridge 到 .build-cache/

bun run build
  └── build.ts → 从 .build-cache/ 复制到 dist/{platform}/vendor/

bun run publish
  └── publish.ts → 白名单过滤 → 发布各平台包 + 主包

npm install @opencode-ai/opencode-cli
  └── optionalDependencies → 安装对应平台包
  └── postinstall.mjs → 硬链接二进制 + 复制 vendor/ 到主包
```
