# 配置迁移源代码变更记录 (Config Migration Source Code Changes)

> **策略**: 本次配置迁移采用**直接替换策略**：CODEGENIE_* 替换 OPENCODE_*，无向后兼容。

---

## 一、变更范围确认

### 需要重命名

| 类别 | 新值 | 状态 |
|-----|------|------|
| 环境变量 | CODEGENIE_* | ✅ 完成 |
| 配置文件 | codegenie.json | ✅ 完成 |
| 配置目录 | .codegenie | ✅ 完成 |
| Claude Code 继承 | 默认禁用 | ✅ 完成 |

### 不需要重命名（明确排除）

| 类别 | 内容 | 原因 |
|-----|------|------|
| SDK 包名 | @opencode-ai/sdk, @opencode-ai/shared, @opencode-ai/plugin | 独立 NPM 包 |
| 外部插件 | opencode-gitlab-auth, opencode-poe-auth | 外部认证插件 |
| Effect ID | @opencode/Plugin, @opencode/Session, @opencode/Config | Effect Context Service 标识符 |
| 网站 URL | https://opencode.ai | 外部网站 URL |
| 代码变量名 | opencodeProcess, OpenCodeSession | 内部变量名 |
| 构建时全局变量 | OPENCODE_VERSION, OPENCODE_CHANNEL, OPENCODE_LIBC, OPENCODE_MIGRATIONS, OPENCODE_WORKER_PATH | 构建时注入，非用户配置 |
| 进程元数据 | OPENCODE_PROCESS_ROLE, OPENCODE_RUN_ID | Worker 进程通信标识 |
| HTTP Headers | x-opencode-client | 客户端标识头 |
| User Agent | opencode/ | HTTP 请求标识 |

---

## 二、环境变量映射表

### 2.1 用户配置环境变量

| 新变量名 | 旧变量名 | 用途说明 |
|---------|---------|---------|
| CODEGENIE_CONFIG | OPENCODE_CONFIG | 自定义配置文件路径 |
| CODEGENIE_CONFIG_DIR | OPENCODE_CONFIG_DIR | 配置目录路径 |
| CODEGENIE_CONFIG_CONTENT | OPENCODE_CONFIG_CONTENT | 配置内容（内联） |
| CODEGENIE_PERMISSION | OPENCODE_PERMISSION | 权限配置 |
| CODEGENIE_DB | OPENCODE_DB | 数据库路径 |
| CODEGENIE_CONSOLE_TOKEN | OPENCODE_CONSOLE_TOKEN | Console 认证令牌 |
| CODEGENIE_SERVER_PASSWORD | OPENCODE_SERVER_PASSWORD | 服务器密码 |
| CODEGENIE_SERVER_USERNAME | OPENCODE_SERVER_USERNAME | 服务器用户名 |
| CODEGENIE_WORKSPACE_ID | OPENCODE_WORKSPACE_ID | 工作空间 ID |
| CODEGENIE_TUI_CONFIG | OPENCODE_TUI_CONFIG | TUI 配置 |
| CODEGENIE_PLUGIN_META_FILE | OPENCODE_PLUGIN_META_FILE | 插件元数据文件 |
| CODEGENIE_CLIENT | OPENCODE_CLIENT | 客户端类型 |
| CODEGENIE_FAKE_VCS | OPENCODE_FAKE_VCS | 模拟 VCS |
| CODEGENIE_MODELS_URL | OPENCODE_MODELS_URL | 模型列表 URL |
| CODEGENIE_MODELS_PATH | OPENCODE_MODELS_PATH | 模型列表路径 |
| CODEGENIE_GIT_BASH_PATH | OPENCODE_GIT_BASH_PATH | Git Bash 路径 |
| CODEGENIE_ROUTE | OPENCODE_ROUTE | TUI 初始路由（JSON） |
| CODEGENIE_FAST_BOOT | OPENCODE_FAST_BOOT | 跳过同步等待直接就绪 |

### 2.2 功能开关环境变量

| 新变量名 | 旧变量名 | 用途说明 |
|---------|---------|---------|
| CODEGENIE_AUTO_SHARE | OPENCODE_AUTO_SHARE | 自动分享 |
| CODEGENIE_AUTO_HEAP_SNAPSHOT | OPENCODE_AUTO_HEAP_SNAPSHOT | 自动 Heap 快照 |
| CODEGENIE_DISABLE_AUTOUPDATE | OPENCODE_DISABLE_AUTOUPDATE | 禁用自动更新 |
| CODEGENIE_ALWAYS_NOTIFY_UPDATE | OPENCODE_ALWAYS_NOTIFY_UPDATE | 总是通知更新 |
| CODEGENIE_DISABLE_PRUNE | OPENCODE_DISABLE_PRUNE | 禁用清理 |
| CODEGENIE_DISABLE_TERMINAL_TITLE | OPENCODE_DISABLE_TERMINAL_TITLE | 禁用终端标题 |
| CODEGENIE_SHOW_TTFD | OPENCODE_SHOW_TTFD | 显示 TTFD |
| CODEGENIE_DISABLE_DEFAULT_PLUGINS | OPENCODE_DISABLE_DEFAULT_PLUGINS | 禁用默认插件 |
| CODEGENIE_DISABLE_LSP_DOWNLOAD | OPENCODE_DISABLE_LSP_DOWNLOAD | 禁用 LSP 下载 |
| CODEGENIE_ENABLE_EXPERIMENTAL_MODELS | OPENCODE_ENABLE_EXPERIMENTAL_MODELS | 启用实验模型 |
| CODEGENIE_DISABLE_AUTOCOMPACT | OPENCODE_DISABLE_AUTOCOMPACT | 禁用自动压缩 |
| CODEGENIE_DISABLE_MODELS_FETCH | OPENCODE_DISABLE_MODELS_FETCH | 禁用模型获取 |
| CODEGENIE_DISABLE_MOUSE | OPENCODE_DISABLE_MOUSE | 禁用鼠标 |
| CODEGENIE_DISABLE_PROJECT_CONFIG | OPENCODE_DISABLE_PROJECT_CONFIG | 禁用项目配置 |
| CODEGENIE_DISABLE_EMBEDDED_WEB_UI | OPENCODE_DISABLE_EMBEDDED_WEB_UI | 禁用嵌入式 Web UI |
| CODEGENIE_DISABLE_CHANNEL_DB | OPENCODE_DISABLE_CHANNEL_DB | 禁用频道数据库 |
| CODEGENIE_SKIP_MIGRATIONS | OPENCODE_SKIP_MIGRATIONS | 跳过迁移 |
| CODEGENIE_STRICT_CONFIG_DEPS | OPENCODE_STRICT_CONFIG_DEPS | 严格配置依赖 |
| CODEGENIE_ENABLE_QUESTION_TOOL | OPENCODE_ENABLE_QUESTION_TOOL | 启用问题工具 |
| CODEGENIE_PURE | OPENCODE_PURE | 纯模式 |

### 2.3 Claude Code 继承环境变量（逻辑反转）

| 新变量名 | 旧变量名 | 逻辑变化 |
|---------|---------|---------|
| CODEGENIE_DISABLE_CLAUDE_CODE | OPENCODE_DISABLE_CLAUDE_CODE | **反转**: 默认 true（禁用），设置 0/false 启用 |
| CODEGENIE_DISABLE_CLAUDE_CODE_PROMPT | OPENCODE_DISABLE_CLAUDE_CODE_PROMPT | 继承 DISABLE_CLAUDE_CODE |
| CODEGENIE_DISABLE_CLAUDE_CODE_SKILLS | OPENCODE_DISABLE_CLAUDE_CODE_SKILLS | 继承 DISABLE_CLAUDE_CODE |
| CODEGENIE_DISABLE_EXTERNAL_SKILLS | OPENCODE_DISABLE_EXTERNAL_SKILLS | 继承 DISABLE_CLAUDE_CODE_SKILLS |

### 2.4 实验性功能环境变量

| 新变量名 | 旧变量名 | 用途说明 |
|---------|---------|---------|
| CODEGENIE_EXPERIMENTAL | OPENCODE_EXPERIMENTAL | 实验模式总开关 |
| CODEGENIE_EXPERIMENTAL_FILEWATCHER | OPENCODE_EXPERIMENTAL_FILEWATCHER | 实验性文件监视 |
| CODEGENIE_EXPERIMENTAL_DISABLE_FILEWATCHER | OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER | 禁用文件监视 |
| CODEGENIE_EXPERIMENTAL_ICON_DISCOVERY | OPENCODE_EXPERIMENTAL_ICON_DISCOVERY | 图标发现 |
| CODEGENIE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT | OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT | 禁用选择复制 |
| CODEGENIE_ENABLE_EXA | OPENCODE_ENABLE_EXA | 启用 EXA 搜索 |
| CODEGENIE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS | OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS | Bash 默认超时 |
| CODEGENIE_EXPERIMENTAL_OUTPUT_TOKEN_MAX | OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX | 输出令牌上限 |
| CODEGENIE_EXPERIMENTAL_OXFMT | OPENCODE_EXPERIMENTAL_OXFMT | OXFMT 格式 |
| CODEGENIE_EXPERIMENTAL_LSP_TY | OPENCODE_EXPERIMENTAL_LSP_TY | LSP TY |
| CODEGENIE_EXPERIMENTAL_LSP_TOOL | OPENCODE_EXPERIMENTAL_LSP_TOOL | LSP 工具 |
| CODEGENIE_EXPERIMENTAL_PLAN_MODE | OPENCODE_EXPERIMENTAL_PLAN_MODE | 计划模式 |
| CODEGENIE_EXPERIMENTAL_MARKDOWN | OPENCODE_EXPERIMENTAL_MARKDOWN | Markdown（默认启用） |
| CODEGENIE_EXPERIMENTAL_HTTPAPI | OPENCODE_EXPERIMENTAL_HTTPAPI | HTTP API |
| CODEGENIE_EXPERIMENTAL_WORKSPACES | OPENCODE_EXPERIMENTAL_WORKSPACES | 工作空间 |

---

## 三、关键代码变更

### 3.1 flag.ts - 环境变量替换与 Claude Code 逻辑反转

**文件**: `packages/opencode/src/flag/flag.ts` (67 处 CODEGENIE 引用)

**变更**: 环境变量名称替换 + Claude Code 继承逻辑反转

```typescript
// 原来 (默认 false - Claude Code 启用)
const OPENCODE_DISABLE_CLAUDE_CODE = truthy("OPENCODE_DISABLE_CLAUDE_CODE")

// 改为 (默认 true - Claude Code 禁用)
const CODEGENIE_DISABLE_CLAUDE_CODE = !falsy("CODEGENIE_DISABLE_CLAUDE_CODE")
```

**语义说明**:
- `truthy`: 值为 `true` 或 `1` 时返回 true（默认 false）
- `falsy`: 值为 `false` 或 `0` 时返回 true（默认 false）
- `!falsy`: 未设置时返回 true（默认禁用）

**完整的 Flag 导出**:
```typescript
export const Flag = {
  // OTEL (保持不变)
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  // 用户配置
  CODEGENIE_CONFIG: process.env["CODEGENIE_CONFIG"],
  CODEGENIE_CONFIG_DIR: process.env["CODEGENIE_CONFIG_DIR"],
  CODEGENIE_CONFIG_CONTENT: process.env["CODEGENIE_CONFIG_CONTENT"],
  // ... 其他 CODEGENIE_* 变量

  // Claude Code 继承（逻辑反转）
  CODEGENIE_DISABLE_CLAUDE_CODE,
  CODEGENIE_DISABLE_CLAUDE_CODE_PROMPT: CODEGENIE_DISABLE_CLAUDE_CODE || truthy("CODEGENIE_DISABLE_CLAUDE_CODE_PROMPT"),
  CODEGENIE_DISABLE_CLAUDE_CODE_SKILLS,
  CODEGENIE_DISABLE_EXTERNAL_SKILLS: CODEGENIE_DISABLE_CLAUDE_CODE_SKILLS || truthy("CODEGENIE_DISABLE_EXTERNAL_SKILLS"),

  // Getter 形式（延迟计算）
  get CODEGENIE_DISABLE_PROJECT_CONFIG() { return truthy("CODEGENIE_DISABLE_PROJECT_CONFIG") },
  get CODEGENIE_TUI_CONFIG() { return process.env["CODEGENIE_TUI_CONFIG"] },
  get CODEGENIE_CONFIG_DIR() { return process.env["CODEGENIE_CONFIG_DIR"] },
  get CODEGENIE_PURE() { return truthy("CODEGENIE_PURE") },
  get CODEGENIE_PLUGIN_META_FILE() { return process.env["CODEGENIE_PLUGIN_META_FILE"] },
  get CODEGENIE_CLIENT() { return process.env["CODEGENIE_CLIENT"] ?? "cli" },
}
```

---

### 3.2 config.ts - 配置文件名替换

**文件**: `packages/opencode/src/config/config.ts` (18 处 CODEGENIE 引用)

**变更**: globalConfigFile 函数 + 配置文件发现

```typescript
// globalConfigFile 函数
function globalConfigFile() {
  const candidates = ["codegenie.jsonc", "codegenie.json", "config.json"].map((file) =>
    path.join(Global.Path.config, file),
  )
  // ...
}

// ConfigPaths.files 调用
for (const file of yield* ConfigPaths.files("codegenie", ctx.directory, ctx.worktree).pipe(Effect.orDie)) {
  yield* merge(file, yield* loadFile(file), "local")
}

// 目录内配置文件
if (dir.endsWith(".codegenie") || dir === Flag.CODEGENIE_CONFIG_DIR) {
  for (const file of ["codegenie.json", "codegenie.jsonc"]) {
    const source = path.join(dir, file)
    // ...
  }
}

// 环境变量
if (process.env.CODEGENIE_CONFIG_CONTENT) {
  const source = "CODEGENIE_CONFIG_CONTENT"
  // ...
}

process.env["CODEGENIE_CONSOLE_TOKEN"] = tokenOpt.value
```

---

### 3.3 paths.ts - 配置目录名替换

**文件**: `packages/opencode/src/config/paths.ts`

**变更**: directories 函数

```typescript
export const directories = Effect.fn("ConfigPaths.directories")(function* (directory: string, worktree?: string) {
  const afs = yield* AppFileSystem.Service
  return unique([
    Global.Path.config,
    ...(!Flag.CODEGENIE_DISABLE_PROJECT_CONFIG
      ? yield* afs.up({
          targets: [".codegenie"],  // 从 .opencode 改为 .codegenie
          start: directory,
          stop: worktree,
        })
      : []),
    ...(yield* afs.up({
      targets: [".codegenie"],  // 从 .opencode 改为 .codegenie
      start: Global.Path.home,
      stop: Global.Path.home,
    })),
    ...(Flag.CODEGENIE_CONFIG_DIR ? [Flag.CODEGENIE_CONFIG_DIR] : []),
  ])
})
```

---

### 3.4 instruction.ts - Claude 继承逻辑

**文件**: `packages/opencode/src/session/instruction.ts` (9 处 CODEGENIE 引用)

**变更**: CLAUDE.md 条件排除 + Flag 引用

```typescript
const FILES = [
  "AGENTS.md",
  ...(Flag.CODEGENIE_DISABLE_CLAUDE_CODE_PROMPT ? [] : ["CLAUDE.md"]),  // 默认排除
  "CONTEXT.md",
]

function globalFiles() {
  const files = []
  if (Flag.CODEGENIE_CONFIG_DIR) {
    files.push(path.join(Flag.CODEGENIE_CONFIG_DIR, "AGENTS.md"))
  }
  files.push(path.join(Global.Path.config, "AGENTS.md"))
  if (!Flag.CODEGENIE_DISABLE_CLAUDE_CODE_PROMPT) {
    files.push(path.join(os.homedir(), ".claude", "CLAUDE.md"))
  }
  return files
}
```

---

### 3.5 skill/index.ts - 技能发现

**文件**: `packages/opencode/src/skill/index.ts` (3 处 CODEGENIE 引用)

**变更**: 技能模式名称 + Flag 引用

```typescript
const CODEGENIE_SKILL_PATTERN = "{skill,skills}/**/SKILL.md"  // 从 OPENCODE_SKILL_PATTERN 改名

// Flag 引用用于外部技能发现条件
if (!Flag.CODEGENIE_DISABLE_EXTERNAL_SKILLS) {
  // 扫描 .claude 和 .agents 目录
}
```

---

### 3.6 lsp/server.ts - LSP 配置

**文件**: `packages/opencode/src/lsp/server.ts` (23 处 CODEGENIE 引用)

**变更**: Flag 引用批量更新

```typescript
Flag.CODEGENIE_DISABLE_LSP_DOWNLOAD
Flag.CODEGENIE_EXPERIMENTAL_LSP_TOOL
Flag.CODEGENIE_EXPERIMENTAL_LSP_TY
// 等其他 Flag 引用
```

---

### 3.7 app.tsx - TUI 主界面 Flag 引用

**文件**: `packages/opencode/src/cli/cmd/tui/app.tsx` (6 处 CODEGENIE 引用)

**变更**: Flag 引用更新

```typescript
Flag.CODEGENIE_DISABLE_MOUSE                      // 原 OPENCODE_DISABLE_MOUSE
Flag.CODEGENIE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT  // 3 处（鼠标选择复制）
Flag.CODEGENIE_DISABLE_TERMINAL_TITLE               // 原 OPENCODE_DISABLE_TERMINAL_TITLE
Flag.CODEGENIE_SHOW_TTFD                            // 原 OPENCODE_SHOW_TTFD
```

---

### 3.8 dialog.tsx / dialog-session-list.tsx / sdk.tsx / session/index.tsx - TUI 组件 Flag 引用

**文件**: `packages/opencode/src/cli/cmd/tui/ui/dialog.tsx` (2 处)
**文件**: `packages/opencode/src/cli/cmd/tui/component/dialog-session-list.tsx` (2 处)
**文件**: `packages/opencode/src/cli/cmd/tui/context/sdk.tsx` (2 处)
**文件**: `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` (2 处)

**变更**: Flag 引用更新

```typescript
// dialog.tsx
Flag.CODEGENIE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT  // 2 处

// dialog-session-list.tsx
Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES  // 2 处

// sdk.tsx
Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES  // 2 处

// session/index.tsx
Flag.CODEGENIE_EXPERIMENTAL_MARKDOWN  // 2 处
```

---

### 3.9 route.tsx / sync.tsx - TUI 上下文运行时环境变量

**文件**: `packages/opencode/src/cli/cmd/tui/context/route.tsx` (2 处)
**文件**: `packages/opencode/src/cli/cmd/tui/context/sync.tsx` (1 处)

**变更**: 运行时环境变量名替换

```typescript
// route.tsx - TUI 初始路由
process.env["CODEGENIE_ROUTE"]  // 原 OPENCODE_ROUTE

// sync.tsx - 跳过同步等待
process.env.CODEGENIE_FAST_BOOT  // 原 OPENCODE_FAST_BOOT
```

---

## 四、变更文件统计

### 4.1 按引用数量排序（前 30 个文件）

| 文件路径 | CODEGENIE 引用数 |
|---------|-----------------|
| flag/flag.ts | 67 |
| lsp/server.ts | 23 |
| config/config.ts | 18 |
| session/instruction.ts | 9 |
| cli/cmd/tui/config/tui.ts | 8 |
| provider/models.ts | 5 |
| storage/db.ts | 5 |
| tool/registry.ts | 4 |
| plugin/index.ts | 4 |
| control-plane/workspace.ts | 4 |
| cli/cmd/run.ts | 4 |
| server/routes/instance/httpapi/server.ts | 3 |
| skill/index.ts | 3 |
| provider/provider.ts | 3 |
| session/session.ts | 2 |
| lsp/lsp.ts | 2 |
| global/index.ts | 2 |
| server/middleware.ts | 2 |
| project/project.ts | 2 |
| server/server.ts | 2 |
| index.ts | 2 |
| cli/upgrade.ts | 2 |
| cli/cmd/tui/plugin/runtime.ts | 2 |
| cli/cmd/serve.ts | 2 |
| cli/cmd/session.ts | 2 |
| cli/cmd/tui/attach.ts | 2 |
| cli/cmd/web.ts | 2 |
| cli/cmd/tui/worker.ts | 2 |
| auth/index.ts | 2 |
| file/watcher.ts | 2 |
| cli/cmd/tui/app.tsx | 6 |
| cli/cmd/tui/ui/dialog.tsx | 2 |
| cli/cmd/tui/context/sdk.tsx | 2 |
| cli/cmd/tui/component/dialog-session-list.tsx | 2 |
| cli/cmd/tui/routes/session/index.tsx | 2 |
| cli/cmd/tui/context/route.tsx | 2 |
| cli/cmd/tui/context/sync.tsx | 1 |

### 4.2 变更统计

| 功能点 | 实施状态 | 完成日期 |
|-------|---------|---------|
| 环境变量替换 | ✅ 完成 | 2026-04-22 |
| 配置文件名替换 | ✅ 完成 | 2026-04-22 |
| 配置目录名替换 | ✅ 完成 | 2026-04-22 |
| Claude Code 继承禁用 | ✅ 完成 | 2026-04-22 |
| Flag引用批量更新 | ✅ 完成 | 2026-04-22 |

**总计**:
- CODEGENIE 引用: ~232 处
- 涉及文件: ~47 个 TypeScript 文件
- 保留的 @opencode-ai 引用: 111 处（未修改）

---

## 五、验证结果

### 5.1 源代码验证

```bash
# Flag.OPENCODE_* 引用检查
grep -r "Flag\.OPENCODE_" packages/opencode/src
# 结果: 0 处（全部已改为 Flag.CODEGENIE_*）

# SDK 包名未误改
grep -r "@codegenie-ai" packages/opencode/src
# 结果: 0 处（保持 @opencode-ai）

# Effect Service ID 未误改
grep -r "@codegenie/" packages/opencode/src
# 结果: 0 处（保持 @opencode/）
```

### 5.2 类型检查

```bash
bun x tsc --noEmit --skipLibCheck
# src/ 目录: 无类型错误
# script/ 目录: 预存在的依赖缺失错误（非迁移相关）
```

---

## 六、未修改内容确认

### 6.1 构建时全局变量（保持 OPENCODE）

以下变量在构建时注入，不属于用户配置，保持不变：

| 变量名 | 用途 |
|-------|------|
| OPENCODE_VERSION | 版本号 |
| OPENCODE_CHANNEL | 发布渠道 |
| OPENCODE_LIBC | libc 类型 |
| OPENCODE_MIGRATIONS | 迁移路径 |
| OPENCODE_WORKER_PATH | Worker 路径 |

### 6.2 进程通信标识（保持 OPENCODE）

| 变量名 | 用途 |
|-------|------|
| OPENCODE_PROCESS_ROLE | 进程角色（worker/main） |
| OPENCODE_RUN_ID | 运行 ID |

### 6.3 SDK 与外部依赖（保持 @opencode-ai）

| 类别 | 引用数 | 说明 |
|-----|-------|------|
| @opencode-ai/sdk | - | SDK 包名 |
| @opencode-ai/shared | 111 处引用 | 共享模块 |
| @opencode-ai/plugin | - | 插件包名 |
| @opencode/* Service ID | - | Effect Context 标识符 |

---

## 七、备注

本次配置迁移：
- 新功能默认使用 CODEGENIE 品牌
- Claude Code 继承默认禁用，显式启用需设置 `CODEGENIE_DISABLE_CLAUDE_CODE=0` 或 `false`
- 无向后兼容，用户需一次性迁移配置文件和目录名
- 构建时变量和进程通信标识保持 OPENCODE 品牌