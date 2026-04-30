# CodeGenie 品牌增强 - 实现指南

> **策略**: 本次品牌增强采用**直接替换策略**，无向后兼容。实现顺序基于依赖关系：底层组件优先，用户界面最后。
> 
> **重要提示**: 重命名 workspace 包名后，务必检查排除包的依赖引用和源码 import，详见 §"阶段 11: Workspace 依赖检查"。

---

## 一、实现阶段规划

### 1.1 阶段依赖关系

```
Phase 1: 数据库名称 (REQ-001)
    ↓
Phase 2: mDNS 域名 (REQ-002)
    ↓
Phase 3: 应用名称 (REQ-003) ← 核心变更，影响下游
    ↓
Phase 4: 环境变量 (REQ-005)
    ↓
Phase 5: 文本品牌 (REQ-004)
    ↓
Phase 6: User-Agent (REQ-008)
    ↓
Phase 7: HTTP Headers (REQ-010)
    ↓
Phase 8: scriptName (REQ-009)
    ↓
Phase 9: 标题缩写 (REQ-006)
    ↓
Phase 10: 退出消息 (REQ-007)
```

### 1.2 阶段划分依据

| 阶段 | 需求 | 优先级原因 |
|-----|------|-----------|
| 1 | REQ-001 | 数据库是存储层基础，影响数据迁移 |
| 2 | REQ-002 | mDNS 是网络发现层，独立于应用逻辑 |
| 3 | REQ-003 | 应用名称影响配置目录、缓存路径等下游组件 |
| 4 | REQ-005 | 环境变量是配置层，需在应用名称后处理 |
| 5 | REQ-004 | 文本替换范围广，需在核心变更后批量处理 |
| 6 | REQ-008 | User-Agent 属 HTTP 层，依赖应用名称 |
| 7 | REQ-010 | HTTP Headers 属 HTTP 层，与 User-Agent 同层 |
| 8 | REQ-009 | scriptName 是 CLI 入口，最后处理 |
| 9 | REQ-006 | 标题缩写属 UI 层，验证后确认是否需要变更 |
| 10 | REQ-007 | 退出消息属 CLI 层，最后处理 |

---

## 二、阶段 1: 数据库名称替换 (REQ-001)

### 2.1 变更位置

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/src/storage/db.ts` | 32 | `"opencode.db"` | `"codegenie.db"` |
| `packages/opencode/src/storage/db.ts` | 34 | `"opencode-${safe}.db"` | `"codegenie-${safe}.db"` |

### 2.2 实现步骤

**Step 1**: 打开 `packages/opencode/src/storage/db.ts`

**Step 2**: 定位第 32 行，将 `"opencode.db"` 替换为 `"codegenie.db"`

**Step 3**: 定位第 34 行，将 `"opencode-${safe}.db"` 替换为 `"codegenie-${safe}.db"`

### 2.3 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查数据库文件名已替换
grep -n "opencode.db" src/storage/db.ts
# 预期结果: 无匹配

# 检查新名称存在
grep -n "codegenie.db" src/storage/db.ts
# 预期结果: 2 处匹配（第 32、34 行）

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 2.4 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| 数据库文件创建 | 启动应用，检查数据目录 | 文件名为 `codegenie.db` |
| 多频道版本 | 设置 `OPENCODE_CHANNEL=dev` 启动 | 文件名为 `codegenie-dev.db` |
| 数据迁移 | 检查旧数据库是否被迁移 | 新数据库包含原有数据 |

---

## 三、阶段 2: mDNS 域名替换 (REQ-002)

### 3.1 变更位置

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/src/server/mdns.ts` | 14 | `"opencode.local"` | `"codegenie.local"` |
| `packages/opencode/src/server/mdns.ts` | 15 | `"opencode-${port}"` | `"codegenie-${port}"` |
| `packages/opencode/src/cli/network.ts` | 23 | `"opencode.local"` | `"codegenie.local"` |
| `packages/opencode/src/cli/network.ts` | 24 | `"opencode.local"` | `"codegenie.local"` |
| `packages/opencode/src/config/server.ts` | 11 | `"opencode.local"` | `"codegenie.local"` |

### 3.2 实现步骤

**Step 1**: 打开 `packages/opencode/src/server/mdns.ts`

**Step 2**: 定位第 14 行，将 `"opencode.local"` 替换为 `"codegenie.local"`

**Step 3**: 定位第 15 行，将 `"opencode-${port}"` 替换为 `"codegenie-${port}"`

**Step 4**: 打开 `packages/opencode/src/cli/network.ts`

**Step 5**: 定位第 23、24 行，将 `"opencode.local"` 替换为 `"codegenie.local"`

**Step 6**: 打开 `packages/opencode/src/config/server.ts`

**Step 7**: 定位第 11 行，将 `"opencode.local"` 替换为 `"codegenie.local"`

### 3.3 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查 mDNS 域名已替换
grep -rn "opencode.local" src/server/mdns.ts src/cli/network.ts src/config/server.ts
# 预期结果: 无匹配

# 检查新域名存在
grep -rn "codegenie.local" src/server/mdns.ts src/cli/network.ts src/config/server.ts
# 预期结果: 5 处匹配

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 3.4 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| mDNS 服务广播 | 启动服务，使用 `dns-sd` 或 `avahi-browse` 检查 | 发现 `codegenie.local` |
| 网络命令 | 执行 `codegenie network` | 显示 `codegenie.local` |
| 服务名称 | 启动服务，检查服务名 | 服务名为 `codegenie-{port}` |

---

## 四、阶段 3: 应用名称替换 (REQ-003)

### 4.1 变更位置

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/src/global/index.ts` | 8 | `const app = "opencode"` | `const app = "codegenie"` |
| `packages/opencode/package.json` | 4 | `"name": "opencode"` | `"name": "codegenie"` |
| `packages/opencode/package.json` | 22 | `"opencode": "./bin/opencode"` | `"codegenie": "./bin/codegenie"` |
| `packages/opencode/src/index.ts` | 108 | `process.env.OPENCODE = "1"` | `process.env.CODEGENIE = "1"` |
| `packages/opencode/src/index.ts` | 111 | `Log.Default.info("opencode", ...)` | `Log.Default.info("codegenie", ...)` |

> **注意**: `src/index.ts` 第 108 行的 `process.env.OPENCODE = "1"` 是**内部进程标识**，不是构建时全局声明，必须修改。第 111 行是日志品牌标识，属于 REQ-004 文本品牌替换范围。这两处容易被遗漏，务必检查。

### 4.2 实现步骤

**Step 1**: 打开 `packages/opencode/src/global/index.ts`

**Step 2**: 定位第 8 行，将 `const app = "opencode"` 替换为 `const app = "codegenie"`

**Step 3**: 打开 `packages/opencode/package.json`

**Step 4**: 定位第 4 行，将 `"name": "opencode"` 替换为 `"name": "codegenie"`

**Step 5**: 定位第 22 行，将 `"opencode": "./bin/opencode"` 替换为 `"codegenie": "./bin/codegenie"`

### 4.3 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查应用名称已替换
grep -n "const app = \"opencode\"" src/global/index.ts
# 预期结果: 无匹配

# 检查新名称存在
grep -n "const app = \"codegenie\"" src/global/index.ts
# 预期结果: 1 处匹配

# 检查 package.json
grep -n '"name": "opencode"' package.json
# 预期结果: 无匹配

grep -n '"name": "codegenie"' package.json
# 预期结果: 1 处匹配

# 检查内部进程标识（易遗漏！）
grep -n 'process.env.OPENCODE = "1"' src/index.ts
# 预期结果: 无匹配

grep -n 'process.env.CODEGENIE = "1"' src/index.ts
# 预期结果: 1 处匹配

# 检查日志品牌标识（易遗漏！）
grep -n 'Log.Default.info("opencode"' src/index.ts
# 预期结果: 无匹配

grep -n 'Log.Default.info("codegenie"' src/index.ts
# 预期结果: 1 处匹配

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 4.4 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| 配置目录 | 检查 `~/.config/` 目录 | 目录名为 `codegenie` |
| 数据目录 | 检查 `~/.local/share/` 目录 | 目录名为 `codegenie` |
| 缓存目录 | 检查 `~/.cache/` 目录 | 目录名为 `codegenie` |
| CLI 命令 | 执行 `codegenie --version` | 命令可执行 |

---

## 五、阶段 4: 环境变量替换 (REQ-005)

### 5.1 替换范围分类

| 类型 | 替换策略 | 示例 | 说明 |
|-----|---------|------|------|
| `process.env.OPENCODE_*` | **替换** → CODEGENIE | `process.env.OPENCODE_API_KEY` | 用户配置的环境变量 |
| `declare global { const OPENCODE_* }` | **保持** | `declare global { const OPENCODE_VERSION }` | TypeScript 全局声明 |
| `declare const OPENCODE_*` | **保持** | `declare const OPENCODE_MIGRATIONS` | 顶层全局常量声明 |

### 5.2 保持不变的全局声明

| 文件路径 | 行号 | 声明类型 | 变量名 |
|---------|------|---------|--------|
| `src/installation/version.ts` | 1-4 | `declare global {}` | OPENCODE_VERSION, OPENCODE_CHANNEL |
| `src/storage/db.ts` | 19 | `declare const` | OPENCODE_MIGRATIONS |
| `src/file/watcher.ts` | 20 | `declare const` | OPENCODE_LIBC |
| `src/util/opencode-process.ts` | 1-2 | 常量 | OPENCODE_RUN_ID, OPENCODE_PROCESS_ROLE |

### 5.3 需替换的环境变量（process.env）

> 注：`src/flag/flag.ts` 中的 process.env 环境变量已迁移为 CODEGENIE_*，无需额外变更。

| 原变量名 | 目标变量名 |
|---------|-----------|
| `OPENCODE_API_KEY` | `CODEGENIE_API_KEY` |
| `OPENCODE_API_URL` | `CODEGENIE_API_URL` |
| `OPENCODE_MODEL` | `CODEGENIE_MODEL` |
| `OPENCODE_DEBUG` | `CODEGENIE_DEBUG` |
| `OPENCODE_DISABLE_CLAUDE_CODE` | `CODEGENIE_DISABLE_CLAUDE_CODE` |
| `OPENCODE_CONFIG_PATH` | `CODEGENIE_CONFIG_PATH` |
| `OPENCODE_CONFIG_DIR` | `CODEGENIE_CONFIG_DIR` |
| `OPENCODE_CONFIG_CONTENT` | `CODEGENIE_CONFIG_CONTENT` |
| `OPENCODE_CONSOLE_TOKEN` | `CODEGENIE_CONSOLE_TOKEN` |
| `OPENCODE_SERVER_PASSWORD` | `CODEGENIE_SERVER_PASSWORD` |
| `OPENCODE_AUTO_SHARE` | `CODEGENIE_AUTO_SHARE` |
| `OPENCODE_MCP_PORT` | `CODEGENIE_MCP_PORT` |

### 5.4 实现步骤

**Step 1**: 确认 process.env 环境变量已迁移（检查 `src/flag/flag.ts`）

```bash
cd packages/opencode
grep -n "CODEGENIE_" src/flag/flag.ts | head -10
# 预期结果：显示 CODEGENIE_* 环境变量（已迁移）
```

**Step 2**: 验证全局声明保持 OPENCODE（不替换）

```bash
# 验证 declare global 保持 OPENCODE
grep -n "declare global" src/installation/version.ts
grep -n "OPENCODE_VERSION\|OPENCODE_CHANNEL" src/installation/version.ts
# 预期结果：存在匹配，保持 OPENCODE

# 验证 declare const 保持 OPENCODE
grep -n "declare const OPENCODE" src/storage/db.ts src/file/watcher.ts
# 预期结果：存在匹配，保持 OPENCODE
```

### 5.5 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查用户配置环境变量已替换为 CODEGENIE
grep -rn "process.env.CODEGENIE_" src --include="*.ts" --include="*.tsx"
# 预期结果：存在匹配（已迁移）

# 检查 declare global 保持 OPENCODE
grep -rn "declare global" src --include="*.ts" -A 3
grep -n "OPENCODE_VERSION\|OPENCODE_CHANNEL" src/installation/version.ts
# 预期结果：保持 OPENCODE

# 检查 declare const 保持 OPENCODE
grep -n "declare const OPENCODE" src/storage/db.ts src/file/watcher.ts
# 预期结果：保持 OPENCODE

# 检查进程通信标识保持不变
grep -rn "OPENCODE_RUN_ID\|OPENCODE_PROCESS_ROLE" src --include="*.ts"
# 预期结果：存在匹配（保持 OPENCODE）

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 5.6 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| process.env 环境变量 | 设置 `CODEGENIE_API_KEY` 启动 | 应用正确读取 |
| declare global 全局声明 | 检查版本信息 | 显示正确版本（OPENCODE_* 注入值） |
| declare const 全局声明 | 检查迁移信息 | 正确加载迁移 |
| 进程通信 | 启动 Worker 进程 | 进程正常通信（OPENCODE_RUN_ID） |

---

## 六、阶段 5: 文本品牌替换 (REQ-004)

### 6.1 变更文件列表

| 文件路径 | 变更类型 |
|---------|---------|
| `packages/opencode/src/cli/cmd/providers.ts` | 命令描述 |
| `packages/opencode/src/cli/cmd/pr.ts` | 命令描述 |
| `packages/opencode/src/cli/cmd/run.ts` | 命令描述 |
| `packages/opencode/src/cli/cmd/serve.ts` | 命令描述 |
| `packages/opencode/src/cli/cmd/uninstall.ts` | 命令描述 |
| `packages/opencode/src/cli/cmd/upgrade.ts` | 命令描述 |
| `packages/opencode/src/cli/cmd/web.ts` | 命令描述 |
| `packages/opencode/src/cli/cmd/tui/app.tsx` | TUI 显示文本 |
| `packages/opencode/src/cli/cmd/tui/attach.ts` | TUI 显示文本 |
| `packages/opencode/src/cli/cmd/tui/thread.ts` | TUI 显示文本 |
| `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` | TUI 显示文本 |
| `packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx` | TUI 显示文本 |
| `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` | TUI 显示文本 |
| `packages/opencode/src/index.ts` | 入口文件 |
| `packages/opencode/src/config/config.ts` | 配置文件名 |
| `packages/opencode/src/installation/index.ts` | 安装脚本 |
| `packages/opencode/src/plugin/copilot.ts` | 插件文本 |
| `packages/opencode/src/session/index.ts` | 会话文本 |

### 6.2 替换规则

| 原值 | 目标值 | 说明 |
|-----|--------|------|
| `opencode` | `codegenie` | 小写形式 |
| `OpenCode` | `CodeGenie` | 标题形式 |
| `OPENCODE` | `CODEGENIE` | 大写形式（仅限用户可见文本） |

### 6.3 排除规则

**以下内容不替换**:

| 排除类型 | 排除内容 | 原因 |
|---------|---------|------|
| URL | `https://opencode.ai` | 外部网站 |
| URL | `github.com/anomalyco/opencode` | 外部仓库 |
| SDK 包名 | `@opencode-ai/*` | 独立 NPM 包 |
| Effect ID | `@opencode/*` | Effect Context Service 标识符 |
| 外部插件 | `opencode-gitlab-auth` | 外部认证插件 |
| 外部插件 | `opencode-poe-auth` | 外部认证插件 |

### 6.4 实现步骤

**Step 1**: 执行批量搜索，确认替换范围

```bash
cd packages/opencode
grep -rn "opencode" src --include="*.ts" --include="*.tsx" \
  | grep -v "opencode.ai" \
  | grep -v "github.com/anomalyco/opencode" \
  | grep -v "@opencode-ai" \
  | grep -v "@opencode/" \
  | grep -v "OPENCODE_VERSION" \
  | grep -v "OPENCODE_CHANNEL" \
  | grep -v "OPENCODE_LIBC" \
  | grep -v "OPENCODE_MIGRATIONS" \
  | grep -v "OPENCODE_RUN_ID" \
  | grep -v "OPENCODE_PROCESS_ROLE"
```

**Step 2**: 逐文件检查匹配项，判断是否需要替换

**Step 3**: 对每个匹配项应用替换规则:
- 用户可见文本 → 替换
- URL → 保持不变
- SDK 包名 → 保持不变
- Effect ID → 保持不变

**Step 4**: 验证替换结果

### 6.5 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查遗留的 opencode 文本（排除 URL 和 SDK）
grep -rn "opencode" src --include="*.ts" --include="*.tsx" \
  | grep -v "opencode.ai" \
  | grep -v "github.com/anomalyco/opencode" \
  | grep -v "@opencode-ai" \
  | grep -v "@opencode/" \
  | grep -v "OPENCODE_VERSION" \
  | grep -v "OPENCODE_CHANNEL" \
  | grep -v "OPENCODE_LIBC" \
  | grep -v "OPENCODE_MIGRATIONS" \
  | grep -v "OPENCODE_RUN_ID" \
  | grep -v "OPENCODE_PROCESS_ROLE"
# 预期结果: 无匹配（或仅剩排除项）

# 检查排除项未误改
grep -rn "@codegenie-ai" src
# 预期结果: 无匹配（保持 @opencode-ai）

grep -rn "@codegenie/" src
# 预期结果: 无匹配（保持 @opencode/）

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 6.6 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| 命令描述 | 执行 `codegenie --help` | 显示 `codegenie` 品牌 |
| TUI 显示 | 启动 TUI | 显示 `CodeGenie` 品牌 |
| 错误提示 | 触发错误场景 | 错误消息含 `codegenie` |
| URL 保持 | 检查源码 | `opencode.ai` URL 保持不变 |

---

## 七、阶段 6: User-Agent 替换 (REQ-008)

### 7.1 变更位置

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/src/installation/index.ts` | 57 | `opencode/${InstallationChannel}/${InstallationVersion}/${Flag.CODEGENIE_CLIENT}` | `codegenie/${InstallationChannel}/${InstallationVersion}/${Flag.CODEGENIE_CLIENT}` |
| `packages/opencode/src/provider/provider.ts` | 552 | `opencode/${InstallationVersion} gitlab-ai-provider/${GITLAB_PROVIDER_VERSION}` | `codegenie/${InstallationVersion} gitlab-ai-provider/${GITLAB_PROVIDER_VERSION}` |
| `packages/opencode/src/provider/provider.ts` | 705 | `opencode/${InstallationVersion} cloudflare-workers-ai` | `codegenie/${InstallationVersion} cloudflare-workers-ai` |
| `packages/opencode/src/provider/provider.ts` | 776 | `opencode/${InstallationVersion} cloudflare-ai-gateway` | `codegenie/${InstallationVersion} cloudflare-ai-gateway` |
| `packages/opencode/src/session/llm.ts` | 380 | `opencode/${InstallationVersion}` | `codegenie/${InstallationVersion}` |
| `packages/opencode/src/plugin/codex.ts` | 514 | `opencode/${InstallationVersion}` | `codegenie/${InstallationVersion}` |
| `packages/opencode/src/plugin/codex.ts` | 538 | `opencode/${InstallationVersion}` | `codegenie/${InstallationVersion}` |
| `packages/opencode/src/plugin/codex.ts` | 598 | `opencode/${InstallationVersion}` | `codegenie/${InstallationVersion}` |

### 7.2 实现步骤

**Step 1**: 打开 `packages/opencode/src/installation/index.ts`

**Step 2**: 定位第 57 行，将 User-Agent 前缀从 `opencode/` 替换为 `codegenie/`

**Step 3**: 打开 `packages/opencode/src/provider/provider.ts`

**Step 4**: 定位第 552、705、776 行，替换 User-Agent 前缀

**Step 5**: 打开 `packages/opencode/src/session/llm.ts`

**Step 6**: 定位第 380 行，替换 User-Agent 前缀

**Step 7**: 打开 `packages/opencode/src/plugin/codex.ts`

**Step 8**: 定位第 514、538、598 行，替换 User-Agent 前缀

### 7.3 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查 User-Agent 已替换
grep -rn "opencode/" src --include="*.ts" --include="*.tsx" \
  | grep -v "opencode.ai" \
  | grep -v "github.com"
# 预期结果: 无匹配

# 检查新 User-Agent 存在
grep -rn "codegenie/" src --include="*.ts" --include="*.tsx"
# 预期结果: 8 处匹配

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 7.4 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| HTTP 请求 | 检查请求日志 | User-Agent 为 `codegenie/版本号` |
| Provider 请求 | 发起 API 请求 | User-Agent 正确 |
| LLM 会话 | 启动 LLM 会话 | User-Agent 正确 |

---

## 八、阶段 7: HTTP Headers 替换 (REQ-010)

### 8.1 变更位置

**x-opencode-* Headers**:

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/src/server/fence.ts` | 8 | `"x-opencode-sync"` | `"x-codegenie-sync"` |
| `packages/opencode/src/server/proxy.ts` | 27 | `"x-opencode-directory"` | `"x-codegenie-directory"` |
| `packages/opencode/src/server/proxy.ts` | 28 | `"x-opencode-workspace"` | `"x-codegenie-workspace"` |
| `packages/opencode/src/server/proxy.ts` | 63 | `"x-opencode-proxy-url"` | `"x-codegenie-proxy-url"` |
| `packages/opencode/src/server/proxy.ts` | 153 | `"x-opencode-proxy-url"` | `"x-codegenie-proxy-url"` |
| `packages/opencode/src/session/llm.ts` | 372 | `"x-opencode-project"` | `"x-codegenie-project"` |
| `packages/opencode/src/session/llm.ts` | 373 | `"x-opencode-session"` | `"x-codegenie-session"` |
| `packages/opencode/src/session/llm.ts` | 374 | `"x-opencode-request"` | `"x-codegenie-request"` |
| `packages/opencode/src/session/llm.ts` | 375 | `"x-opencode-client"` | `"x-codegenie-client"` |

**X-Title Header**:

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/src/provider/provider.ts` | 397-399 | `"X-Title": "opencode"` | `"X-Title": "codegenie"` |
| `packages/opencode/src/provider/provider.ts` | 407-409 | `"X-Title": "opencode"` | `"X-Title": "codegenie"` |
| `packages/opencode/src/provider/provider.ts` | 417-419 | `"X-Title": "opencode"` | `"X-Title": "codegenie"` |
| `packages/opencode/src/provider/provider.ts` | 427-429 | `"x-title": "opencode"` | `"x-title": "codegenie"` |
| `packages/opencode/src/provider/provider.ts` | 525-527 | `"X-Title": "opencode"` | `"X-Title": "codegenie"` |
| `packages/opencode/src/provider/provider.ts` | 809-811 | `"X-Title": "opencode"` | `"X-Title": "codegenie"` |

**OAuth 标识**:

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/src/mcp/oauth-provider.ts` | 47 | `client_name: "OpenCode"` | `client_name: "CodeGenie"` |
| `packages/opencode/src/account/account.ts` | 134 | `clientId = "opencode-cli"` | `clientId = "codegenie-cli"` |

### 8.2 实现步骤

**Step 1**: 打开 `packages/opencode/src/server/fence.ts`

**Step 2**: 定位第 8 行，将 `"x-opencode-sync"` 替换为 `"x-codegenie-sync"`

**Step 3**: 打开 `packages/opencode/src/server/proxy.ts`

**Step 4**: 定位第 27、28、63、153 行，替换所有 `"x-opencode-*"` Headers

**Step 5**: 打开 `packages/opencode/src/session/llm.ts`

**Step 6**: 定位第 372-375 行，替换所有 `"x-opencode-*"` Headers

**Step 7**: 打开 `packages/opencode/src/provider/provider.ts`

**Step 8**: 定位第 397-399、407-409、417-419、427-429、525-527、809-811 行，替换 `"X-Title"` 值

**注意**: `HTTP-Referer` 保持 `https://opencode.ai/`（外部网站 URL），仅替换 `X-Title`

**Step 9**: 打开 `packages/opencode/src/mcp/oauth-provider.ts`

**Step 10**: 定位第 47 行，将 `client_name` 替换为 `"CodeGenie"`

**Step 11**: 打开 `packages/opencode/src/account/account.ts`

**Step 12**: 定位第 134 行，将 `clientId` 替换为 `"codegenie-cli"`

### 8.3 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查 x-opencode Headers 已替换
grep -rn "x-opencode-" src --include="*.ts" --include="*.tsx"
# 预期结果: 无匹配

# 检查新 Headers 存在
grep -rn "x-codegenie-" src --include="*.ts" --include="*.tsx"
# 预期结果: 9 处匹配

# 检查 X-Title 已替换
grep -rn '"X-Title": "opencode"' src --include="*.ts"
# 预期结果: 无匹配

# 检查 HTTP-Referer 保持不变
grep -rn '"HTTP-Referer": "https://opencode.ai/' src --include="*.ts"
# 预期结果: 存在匹配（保持 opencode.ai）

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 8.4 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| Fence Headers | 启动 Fence 服务 | Headers 为 `x-codegenie-*` |
| Proxy Headers | 启动代理服务 | Headers 为 `x-codegenie-*` |
| LLM Headers | 发起 LLM 请求 | Headers 为 `x-codegenie-*` |
| OAuth client_name | 发起 OAuth 请求 | client_name 为 `CodeGenie` |
| OAuth clientId | 检查 OAuth 配置 | clientId 为 `codegenie-cli` |

---

## 九、阶段 8: scriptName 替换 (REQ-009)

### 9.1 变更位置

| 文件路径 | 行号 | 原内容 | 新内容 |
|---------|------|--------|--------|
| `packages/opencode/package.json` | 22 | `"opencode": "./bin/opencode"` | `"codegenie": "./bin/codegenie"` |

### 9.2 实现步骤

**Step 1**: 打开 `packages/opencode/package.json`

**Step 2**: 定位第 22 行，将 `"opencode": "./bin/opencode"` 替换为 `"codegenie": "./bin/codegenie"`

**Step 3**: 确保 `bin/opencode` 文件重命名为 `bin/codegenie`（或创建符号链接）

### 9.3 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查 scriptName 已替换
grep -n '"opencode":' package.json
# 预期结果: 无匹配

# 检查新 scriptName 存在
grep -n '"codegenie":' package.json
# 预期结果: 1 处匹配

# 类型检查
bun typecheck
# 预期结果: 无错误
```

### 9.4 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| CLI 命令 | 执行 `codegenie` | 命令可执行 |
| 命令别名 | 执行 `bun run codegenie` | 命令可执行 |

---

## 十、阶段 9: 标题缩写替换 (REQ-006)

### 10.1 验证结果

**源码验证**: 使用 `grep -rn '"OC"' src` 搜索，未发现 `OC` 缩写作为品牌标识的使用。

**结论**: 此需求无需变更。

### 10.2 验证命令

```bash
cd packages/opencode

# 检查 OC 缩写使用
grep -rn '"OC"' src --include="*.ts" --include="*.tsx"
# 预期结果: 无匹配（或仅剩非品牌相关使用）

# 检查标题相关代码
grep -rn "title.*opencode\|opencode.*title" src --include="*.ts" --include="*.tsx"
# 预期结果: 检查是否有标题缩写使用
```

---

## 十一、阶段 10: 退出消息替换 (REQ-007)

### 11.1 验证结果

**源码验证**: 使用 `grep` 搜索退出消息相关代码，未发现明确的 `exit.message.set` 品牌标识位置。

**Logo 结构验证**: `src/cli/logo.ts` 已正确使用 `export const logo = { left, right }` 结构，支持 spread 操作符展开，无需修改。

### 11.2 实现步骤

**Step 1**: 搜索退出消息相关代码

```bash
cd packages/opencode
grep -rn "exit.*message\|message.*exit" src --include="*.ts" --include="*.tsx"
```

**Step 2**: 检查是否有品牌标识需要替换

**Step 3**: 若存在，应用替换规则:
- 使用 `...logo` spread 操作符展开 logo
- 退出消息首行为空行
- 品牌标识替换为 `CodeGenie`

### 11.3 TDD 验证

**验证命令**:
```bash
cd packages/opencode

# 检查退出消息品牌标识
grep -rn "exit" src --include="*.ts" --include="*.tsx" | grep -i "opencode"
# 预期结果: 无匹配（或确认无需替换）

# 类型检查
bun typecheck
# 预期结果: 无错误
```

---

## 十二、阶段 11: Workspace 依赖检查（重要！）

> **警告**: 本阶段必须在所有包名重命名完成后执行，否则会导致构建失败。

### 12.1 问题背景

当 workspace 中某个包的 `package.json` 的 `name` 字段被重命名后，其他包（即使是排除修改的包）对该包的 **workspace 依赖引用** 必须同步更新。

Workspace 依赖使用 **包名匹配**（`"packageName": "workspace:*"`），而非路径匹配。

### 12.2 本次重命名的受影响项

#### 12.2.1 package.json 依赖

| 包 | 文件 | 原依赖 | 需更新为 | 状态 |
|-----|------|--------|---------|------|
| `packages/web` | `package.json` | `"opencode": "workspace:*"` | `"codegenie": "workspace:*"` | ⚠️ 必须 |

#### 12.2.2 源码 import

| 包 | 文件 | 原引用 | 需更新为 | 状态 |
|-----|------|--------|---------|------|
| `packages/web` | `src/components/Share.tsx` | `"opencode/session/*"` | `"codegenie/session/*"` | ⚠️ 必须 |
| `packages/web` | `src/components/share/part.tsx` | `"opencode/session/*"` | `"codegenie/session/*"` | ⚠️ 必须 |

### 12.3 实现步骤

**Step 1**: 搜索所有对旧包名的 workspace 依赖引用

```bash
# 搜索所有 package.json 中的 workspace 依赖
grep -rn '"opencode": "workspace' packages/*/package.json
# 预期结果: 无匹配（若有，需更新）
```

**Step 2**: 搜索排除包源码中的 import 引用

```bash
# 搜索排除包的源码 import
grep -rn 'from "opencode/' packages/web packages/desktop packages/enterprise --include="*.ts" --include="*.tsx"
# 预期结果: 无匹配（若有，需更新）
```

**Step 3**: 对每个匹配项进行更新

- `package.json` 依赖：将 `"opencode": "workspace:*"` 改为 `"codegenie": "workspace:*"`
- 源码 import：将 `"opencode/..."` 改为 `"codegenie/..."`

### 12.4 TDD 验证

**验证命令**:
```bash
# 1. 检查 workspace 依赖无遗留旧包名
grep -rn '"opencode": "workspace' packages/*/package.json
# 预期结果: 无匹配

# 2. 检查排除包源码 import 无遗留旧包名
grep -rn 'from "opencode/' packages/web packages/desktop packages/enterprise --include="*.ts" --include="*.tsx"
# 预期结果: 无匹配

# 3. 运行构建验证
bun run --cwd packages/opencode build --single --skip-install
# 预期结果: 构建成功
```

### 12.5 测试用例

| 测试项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| workspace 依赖 | `bun install` | 无报错 |
| 构建验证 | `bun run build` | 构建成功 |
| 排除包源码 | 启动 web/desktop | 正常运行 |

---

## 十三、批量替换注意事项

### 12.1 排除处理

批量替换时需特别注意以下排除项:

| 排除项 | 正则表达式 | 处理方式 |
|-------|-----------|---------|
| 外部网站 URL | `opencode\.ai` | 保持不变 |
| GitHub URL | `github\.com/anomalyco/opencode` | 保持不变 |
| SDK 包名 | `@opencode-ai/` | 保持不变 |
| Effect ID | `@opencode/` | 保持不变 |
| 构建时变量 | `OPENCODE_VERSION\|OPENCODE_CHANNEL\|OPENCODE_LIBC\|OPENCODE_MIGRATIONS` | 保持不变 |
| 进程通信标识 | `OPENCODE_RUN_ID\|OPENCODE_PROCESS_ROLE` | 保持不变 |

### 12.2 替换顺序建议

建议按以下顺序执行批量替换，避免误改:

1. **先替换明确位置**: 数据库、mDNS、应用名称等有明确行号的位置
2. **再替换 Headers**: HTTP Headers 有明确前缀 `x-opencode-`
3. **最后替换文本**: 文本替换需逐项检查排除规则

### 12.3 验证清单

每阶段完成后执行:

```bash
cd packages/opencode

# 1. 类型检查
bun typecheck

# 2. 遗留检查
grep -rn "opencode" src --include="*.ts" --include="*.tsx" \
  | grep -v "opencode.ai" \
  | grep -v "github.com/anomalyco/opencode" \
  | grep -v "@opencode-ai" \
  | grep -v "@opencode/" \
  | grep -v "OPENCODE_VERSION" \
  | grep -v "OPENCODE_CHANNEL" \
  | grep -v "OPENCODE_LIBC" \
  | grep -v "OPENCODE_MIGRATIONS" \
  | grep -v "OPENCODE_RUN_ID" \
  | grep -v "OPENCODE_PROCESS_ROLE"

# 3. 排除项验证
grep -rn "@codegenie-ai" src  # 预期: 无匹配
grep -rn "@codegenie/" src    # 预期: 无匹配
```

---

## 十四、回滚与恢复

### 14.1 Git 回滚

若需回滚单个阶段:

```bash
# 查看变更
git diff HEAD

# 回滚单个文件
git checkout HEAD -- packages/opencode/src/storage/db.ts

# 回滚所有变更
git checkout HEAD -- packages/opencode/
```

### 14.2 数据迁移回滚

数据库名称变更后，需考虑数据迁移:

```bash
# 备份旧数据库
cp ~/.local/share/opencode/opencode.db ~/.local/share/opencode/opencode.db.bak

# 若需回滚，恢复旧数据库
cp ~/.local/share/opencode/opencode.db.bak ~/.local/share/opencode/opencode.db
```

### 14.3 配置迁移回滚

环境变量变更后，需更新用户配置:

```bash
# 用户需更新环境变量
# 原: OPENCODE_API_KEY=xxx
# 新: CODEGENIE_API_KEY=xxx

# 若需回滚，恢复原环境变量名
```

---

## 十五、最终验收

### 15.1 功能验收清单

| 需求 | 验收项 | 验证命令 |
|-----|-------|---------|
| REQ-001 | 数据库名为 `codegenie.db` | `grep -n "codegenie.db" src/storage/db.ts` |
| REQ-002 | mDNS 域名为 `codegenie.local` | `grep -rn "codegenie.local" src/server/mdns.ts src/cli/network.ts src/config/server.ts` |
| REQ-003 | 应用名称为 `codegenie` | `grep -n "codegenie" src/global/index.ts package.json` |
| REQ-004 | 文本品牌已替换（排除 URL） | 见 6.5 验证命令 |
| REQ-005 | 环境变量为 `CODEGENIE_*` | 见 5.4 验证命令 |
| REQ-006 | 标题缩写已确认 | 见 10.2 验证命令 |
| REQ-007 | 退出消息已确认 | 见 11.3 验证命令 |
| REQ-008 | User-Agent 为 `codegenie/` | 见 7.3 验证命令 |
| REQ-009 | scriptName 为 `codegenie` | 见 9.3 验证命令 |
| REQ-010 | HTTP Headers 为 `x-codegenie-*` | 见 8.3 验证命令 |

### 15.2 排除验收清单

| 验收项 | 验证命令 | 预期结果 |
|-------|---------|---------|
| URL 保持不变 | `grep -rn "opencode.ai" src` | 存在匹配 |
| SDK 包名保持不变 | `grep -rn "@opencode-ai" src` | 存在匹配 |
| Effect ID 保持不变 | `grep -rn "@opencode/" src` | 存在匹配 |
| 构建时变量保持不变 | `grep -rn "OPENCODE_VERSION" src` | 存在匹配 |
| 进程通信标识保持不变 | `grep -rn "OPENCODE_RUN_ID" src` | 存在匹配 |

### 15.3 构建验证

```bash
cd packages/opencode

# 类型检查
bun typecheck
# 预期: 无错误

# 测试运行
bun test
# 预期: 测试通过

# 应用启动
bun run dev
# 预期: 正常启动
```

---

## 十六、版本历史

| 版本 | 日期 | 修改内容 |
|-----|------|---------|
| 3.0 | 2026-04-23 | 新增"阶段 11: Workspace 依赖检查"，防止排除包依赖遗漏 |
| 2.0 | 2026-04-22 | 完整重写，基于需求分析和源码变更清单，提供阶段化实现指南 |
| 1.1 | 2026-04-09 | 补充 Logo 右侧文案与 TUI 实现要点 |
| 1.0 | 2026-04-02 | 初始版本 |