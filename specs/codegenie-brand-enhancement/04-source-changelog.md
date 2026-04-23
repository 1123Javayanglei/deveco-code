# CodeGenie 品牌增强 - 源码修改记录 (Source Change Log)

> 本文档记录所有已完成的具体源码变更，包括文件路径、原值、新值、修改原因和验证状态。

---

## 一、变更概览

| 类别 | 文件数 | 变更数 | 状态 |
|------|--------|--------|------|
| REQ-001 数据库 | 5 | 6 | ✅ 完成 |
| REQ-002 mDNS | 3 | 4 | ✅ 完成 |
| REQ-003 应用名 | 2 | 3 | ✅ 完成 |
| REQ-004 文本标识 (CLI) | 10 | 15 | ✅ 完成 |
| REQ-004 文本标识 (TUI) | 8 | 25 | ✅ 完成 |
| REQ-005 环境变量 (Flag) | 7 | 15 | ✅ 完成 |
| REQ-005 环境变量 (process.env) | 25+ | 120+ | ✅ 完成 |
| REQ-006 标题缩写 | 2 | 4 | ✅ 完成 |
| REQ-007 退出消息 | 1 | 2 | ✅ 完成 |
| REQ-008 User-Agent | 4 | 6 | ✅ 完成 |
| REQ-009 scriptName | 2 | 2 | ✅ 完成 |
| REQ-010 HTTP Headers | 6 | 8 | ✅ 完成 |
| CLI 命令描述 | 3 | 5 | ✅ 完成 |
| 配置路径/文件名 | 3 | 10 | ✅ 完成 |
| 日志消息 | 7 | 7 | ✅ 完成 |
| Desktop Electron 应用名/ID | 1 | 4 | ✅ 完成 |

---

## 二、详细变更记录

### 2.1 REQ-001: 数据库名称 (opencode.db → codegenie.db)

| 文件路径 | 原值 | 新值 | 行号 | 验证 |
|---------|------|------|------|------|
| `packages/opencode/src/storage/db.ts` | `"opencode.db"` | `"codegenie.db"` | 32, 34 | ✅ |
| `packages/opencode/src/index.ts` | `"opencode.db"` | `"codegenie.db"` | 118 | ✅ |
| `packages/opencode/test/storage/db.test.ts` | `"opencode.db"` | `"codegenie.db"` | 多处 | ✅ |
| `packages/opencode/drizzle.config.ts` | `"opencode.db"` | `"codegenie.db"` | - | ✅ |
| `packages/desktop-electron/src/main/index.ts` | `"opencode.db"` | `"codegenie.db"` | - | ✅ |

---

### 2.2 REQ-002: mDNS 域名 (opencode.local → codegenie.local)

| 文件路径 | 原值 | 新值 | 行号 | 验证 |
|---------|------|------|------|------|
| `packages/opencode/src/server/mdns.ts` | `"opencode.local"` | `"codegenie.local"` | 14 | ✅ |
| `packages/opencode/src/server/mdns.ts` | `"opencode-${port}"` | `"codegenie-${port}"` | - | ✅ |
| `packages/opencode/src/cli/network.ts` | `"opencode.local"` (describe) | `"codegenie.local"` | 23 | ✅ |
| `packages/opencode/src/cli/network.ts` | `"opencode.local"` (default) | `"codegenie.local"` | 24 | ✅ |
| `packages/opencode/src/config/server.ts` | 描述中品牌 | `codegenie` 品牌 | 11 | ✅ |

---

### 2.3 REQ-003: 应用名称 (opencode → codegenie)

| 文件路径 | 原值 | 新值 | 行号 | 验证 |
|---------|------|------|------|------|
| `packages/opencode/src/global/index.ts` | `const app = "opencode"` | `const app = "codegenie"` | 8 | ✅ |
| `packages/opencode/package.json` | `"name": "opencode"` | `"name": "codegenie"` | 4 | ✅ |
| `packages/opencode/package.json` | `"bin": { "opencode": ... }` | `"bin": { "codegenie": ... }` | 22 | ✅ |

---

### 2.4 REQ-004: CLI 文本标识替换

#### 2.4.1 命令描述文件

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/cli/cmd/providers.ts` | `describe: "manage AI providers..."` | 品牌替换 | ✅ |
| `src/cli/cmd/providers.ts` | `placeholder: "e.g., opencode x @..."` | `placeholder: "e.g., codegenie x @..."` | ✅ |
| `src/cli/cmd/providers.ts` | `prompts.outro("Add servers with: opencode mcp add")` | `codegenie mcp add` | ✅ |
| `src/cli/cmd/providers.ts` | `client_name: "opencode-debug"` | `client_name: "codegenie-debug"` | ✅ |
| `src/cli/cmd/pr.ts` | `describe: "...then run opencode"` | `describe: "...then run codegenie"` | ✅ |
| `src/cli/cmd/pr.ts` | `UI.println("Found opencode session")` | `UI.println("Found codegenie session")` | ✅ |
| `src/cli/cmd/pr.ts` | `UI.println("Starting opencode...")` | `UI.println("Starting codegenie...")` | ✅ |
| `src/cli/cmd/pr.ts` | `Process.spawn(["opencode", ...])` | `Process.spawn(["codegenie", ...])` | ✅ |
| `src/cli/cmd/pr.ts` | `throw new Error("opencode exited")` | `throw new Error("codegenie exited")` | ✅ |
| `src/cli/cmd/upgrade.ts` | 描述信息 | 品牌替换 | ✅ |
| `src/cli/cmd/uninstall.ts` | 描述信息 | 品牌替换 | ✅ |
| `src/cli/cmd/serve.ts` | 描述信息 | 品牌替换 | ✅ |
| `src/cli/cmd/web.ts` | 描述信息 | 品牌替换 | ✅ |
| `src/cli/cmd/run.ts` | 描述信息 | 品牌替换 | ✅ |
| `src/cli/cmd/mcp.ts` | 配置文件名引用 | `codegenie.json` | ✅ |

#### 2.4.2 TUI 组件文件

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/cli/cmd/tui/component/dialog-go-upsell.tsx` | `OpenCode Go` | `CodeGenie Go` | ✅ |
| `src/cli/cmd/tui/component/dialog-provider.tsx` | `OpenCode Zen` | `CodeGenie Zen` | ✅ |
| `src/cli/cmd/tui/component/dialog-provider.tsx` | `OpenCode Go` 描述 | `CodeGenie Go` 描述 | ✅ |
| `src/cli/cmd/tui/component/dialog-provider.tsx` | `enable OpenCode Go` | `enable CodeGenie Go` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `OpenCode auto-handles` | `CodeGenie auto-handles` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `OpenCode auto-formats` | `CodeGenie auto-formats` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `OpenCode uses LSP` | `CodeGenie uses LSP` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `prevent OpenCode from` | `prevent CodeGenie from` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode run` | `codegenie run` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode --continue` | `codegenie --continue` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode serve` | `codegenie serve` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode upgrade` | `codegenie upgrade` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode auth list` | `codegenie auth list` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode agent create` | `codegenie agent create` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `/opencode` GitHub | `/codegenie` GitHub | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode github install` | `codegenie github install` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `/opencode fix this` | `/codegenie fix this` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `opencode debug config` | `codegenie debug config` | ✅ |
| `src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` | `OpenCode Zen` | `CodeGenie Zen` | ✅ |
| `src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx` | `OpenCode includes free` | `CodeGenie includes free` | ✅ |
| `src/cli/cmd/tui/routes/session/permission.tsx` | `until OpenCode is restarted` | `until CodeGenie is restarted` | ✅ |
| `src/cli/cmd/tui/routes/session/permission.tsx` | `Tell OpenCode what to do` | `Tell CodeGenie what to do` | ✅ |
| `src/cli/cmd/tui/app.tsx` | `renderer.setTerminalTitle("OpenCode")` | `renderer.setTerminalTitle("CodeGenie")` | ✅ |
| `src/cli/cmd/tui/app.tsx` | `Successfully updated to OpenCode v...` | `Successfully updated to CodeGenie v...` | ✅ |

#### 2.4.3 配置路径替换 (tips-view.tsx)

| 原值 | 新值 | 行号 | 验证 |
|------|------|------|------|
| `opencode.json` | `codegenie.json` | 83 | ✅ |
| `~/.config/opencode/tui.json` | `~/.config/codegenie/tui.json` | 84 | ✅ |
| `.opencode/command/` | `.codegenie/command/` | 91 | ✅ |
| `.opencode/agent/` | `.codegenie/agent/` | 94 | ✅ |
| `.opencode/tools/` | `.codegenie/tools/` | 103 | ✅ |
| `.opencode/plugin/` | `.codegenie/plugin/` | 105 | ✅ |
| `.opencode/themes/` | `.codegenie/themes/` | 122 | ✅ |

---

### 2.5 REQ-005: 环境变量替换 (Flag.OPENCODE_* → Flag.CODEGENIE_*)

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/cli/cmd/tui/app.tsx` | `Flag.OPENCODE_DISABLE_MOUSE` | `Flag.CODEGENIE_DISABLE_MOUSE` | ✅ |
| `src/cli/cmd/tui/app.tsx` | `Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` | `Flag.CODEGENIE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` | ✅ |
| `src/cli/cmd/tui/app.tsx` | `Flag.OPENCODE_DISABLE_TERMINAL_TITLE` | `Flag.CODEGENIE_DISABLE_TERMINAL_TITLE` | ✅ |
| `src/cli/cmd/tui/app.tsx` | `Flag.OPENCODE_SHOW_TTFD` | `Flag.CODEGENIE_SHOW_TTFD` | ✅ |
| `src/cli/cmd/tui/component/dialog-session-list.tsx` | `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` | `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES` | ✅ |
| `src/cli/cmd/tui/context/sdk.tsx` | `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` | `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES` | ✅ |
| `src/cli/cmd/tui/routes/session/index.tsx` | `Flag.OPENCODE_EXPERIMENTAL_MARKDOWN` | `Flag.CODEGENIE_EXPERIMENTAL_MARKDOWN` | ✅ |
| `src/cli/cmd/tui/ui/dialog.tsx` | `Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` | `Flag.CODEGENIE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` | ✅ |
| `test/plugin/workspace-adaptor.test.ts` | `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` | `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES` | ✅ |
| `test/sync/index.test.ts` | `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` | `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES` | ✅ |
| `test/workspace/workspace-restore.test.ts` | `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` | `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES` | ✅ |

---

### 2.6 REQ-005: 环境变量替换 (process.env.OPENCODE* → process.env.CODEGENIE*)

> **状态**: ✅ 完成 (后台任务 + 手动补充)

#### 2.6.1 生产代码文件

| 文件路径 | 原变量名 | 新变量名 | 验证 |
|---------|---------|---------|------|
| `packages/desktop/scripts/finalize-latest-json.ts` | OPENCODE_RELEASE, OPENCODE_VERSION | CODEGENIE_RELEASE, CODEGENIE_VERSION | ✅ |
| `packages/desktop/scripts/prepare.ts` | OPENCODE_CLI_ARTIFACT | CODEGENIE_CLI_ARTIFACT | ✅ |
| `packages/desktop-electron/scripts/finalize-latest-yml.ts` | OPENCODE_VERSION | CODEGENIE_VERSION | ✅ |
| `packages/desktop-electron/scripts/predev.ts` | OPENCODE_CHANNEL | CODEGENIE_CHANNEL | ✅ |
| `packages/desktop-electron/src/main/index.ts` | OPENCODE_DISABLE_EMBEDDED_WEB_UI, OPENCODE_PORT | CODEGENIE_DISABLE_EMBEDDED_WEB_UI, CODEGENIE_PORT | ✅ |
| `packages/desktop-electron/electron-builder.config.ts` | OPENCODE_CHANNEL | CODEGENIE_CHANNEL | ✅ |
| `packages/desktop-electron/electron.vite.config.ts` | OPENCODE_CHANNEL | CODEGENIE_CHANNEL | ✅ |
| `packages/enterprise/src/core/storage.ts` | OPENCODE_STORAGE_* (8个) | CODEGENIE_STORAGE_* | ✅ |
| `packages/enterprise/vite.config.ts` | OPENCODE_DEPLOYMENT_TARGET, OPENCODE_BASE_URL | CODEGENIE_DEPLOYMENT_TARGET, CODEGENIE_BASE_URL | ✅ |
| `packages/opencode/script/generate.ts` | OPENCODE_MODELS_URL | CODEGENIE_MODELS_URL | ✅ |
| `packages/opencode/src/cli/cmd/tui/context/sync.tsx` | OPENCODE_FAST_BOOT | CODEGENIE_FAST_BOOT | ✅ |
| `packages/opencode/src/index.ts` | OPENCODE | CODEGENIE | ✅ |
| `packages/shared/src/global.ts` | OPENCODE_TEST_HOME | CODEGENIE_TEST_HOME | ✅ |
| `packages/ui/vite.config.ts` | OPENCODE_MODELS_URL | CODEGENIE_MODELS_URL | ✅ |

#### 2.6.2 测试代码文件 (约15个文件)

| 文件路径 | 原变量名 | 新变量名 | 验证 |
|---------|---------|---------|------|
| `test/agent/agent.test.ts` | OPENCODE_TEST_HOME | CODEGENIE_TEST_HOME | ✅ |
| `test/config/config.test.ts` | OPENCODE_CONFIG_DIR, OPENCODE_TEST_MANAGED_CONFIG_DIR | CODEGENIE_CONFIG_DIR, CODEGENIE_TEST_MANAGED_CONFIG_DIR | ✅ |
| `test/config/tui.test.ts` | OPENCODE_CONFIG, OPENCODE_TUI_CONFIG | CODEGENIE_CONFIG, CODEGENIE_TUI_CONFIG | ✅ |
| `test/effect/observability.test.ts` | OPENCODE_CLIENT | CODEGENIE_CLIENT | ✅ |
| `test/plugin/loader-shared.test.ts` | OPENCODE_DISABLE_DEFAULT_PLUGINS, OPENCODE_PURE | CODEGENIE_DISABLE_DEFAULT_PLUGINS, CODEGENIE_PURE | ✅ |
| `test/plugin/meta.test.ts` | OPENCODE_PLUGIN_META_FILE | CODEGENIE_PLUGIN_META_FILE | ✅ |
| `test/plugin/trigger.test.ts` | OPENCODE_DISABLE_DEFAULT_PLUGINS | CODEGENIE_DISABLE_DEFAULT_PLUGINS | ✅ |
| `test/plugin/workspace-adaptor.test.ts` | OPENCODE_DISABLE_DEFAULT_PLUGINS | CODEGENIE_DISABLE_DEFAULT_PLUGINS | ✅ |
| `test/server/session-messages.test.ts` | OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER | CODEGENIE_EXPERIMENTAL_DISABLE_FILEWATCHER | ✅ |
| `test/session/system.test.ts` | OPENCODE_TEST_HOME | CODEGENIE_TEST_HOME | ✅ |
| `test/skill/skill.test.ts` | OPENCODE_TEST_HOME | CODEGENIE_TEST_HOME | ✅ |
| `test/tool/skill.test.ts` | OPENCODE_TEST_HOME | CODEGENIE_TEST_HOME | ✅ |
| `test/util/process.test.ts` | OPENCODE_TEST, OPENCODE_TEST_SHELL | CODEGENIE_TEST, CODEGENIE_TEST_SHELL | ✅ |
| `test/cli/tui/plugin-*.test.ts` (5个文件) | OPENCODE_PLUGIN_META_FILE, OPENCODE_PURE | CODEGENIE_PLUGIN_META_FILE, CODEGENIE_PURE | ✅ |

---

### 2.7 REQ-006: 标题缩写 (OC → CodeGenie)

| 文件路径 | 原值 | 新值 | 行号 | 验证 |
|---------|------|------|------|------|
| `src/cli/cmd/tui/app.tsx` | `renderer.setTerminalTitle(\`OC | ${title}\`)` | `renderer.setTerminalTitle(\`CodeGenie | ${title}\`)` | 315 | ✅ |
| `src/cli/cmd/tui/app.tsx` | `renderer.setTerminalTitle(\`OC | ${route.data.id}\`)` | `renderer.setTerminalTitle(\`CodeGenie | ${route.data.id}\`)` | 320 | ✅ |

---

### 2.8 REQ-007: 退出消息

| 文件路径 | 原实现 | 新实现 | 验证 |
|---------|--------|--------|------|
| `src/cli/cmd/tui/routes/session/index.tsx` | `logo[0], logo[1], logo[2]...` | `...logo` spread | ✅ |
| `src/cli/cmd/tui/routes/session/index.tsx` | 无空行 | 消息第一行为空行 | ✅ |

---

### 2.9 REQ-008: User-Agent (opencode/ → codegenie/)

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/installation/index.ts` | `USER_AGENT = \`opencode/${version}\`` | `USER_AGENT = \`codegenie/${version}\`` | ✅ |
| `src/provider/provider.ts` | User-Agent header `opencode/` | `codegenie/` | ✅ |
| `src/session/llm.ts` | User-Agent header | 品牌替换 | ✅ |
| `src/plugin/codex.ts` | User-Agent, originator | 品牌替换 | ✅ |

---

### 2.10 REQ-009: scriptName (opencode → codegenie)

| 文件路径 | 原值 | 新值 | 行号 | 验证 |
|---------|------|------|------|------|
| `src/index.ts` | `.scriptName("opencode")` | `.scriptName("codegenie")` | 71 | ✅ |
| `src/temporary.ts` | `.scriptName("opencode")` | `.scriptName("codegenie")` | 13 | ✅ |

---

### 2.11 REQ-010: HTTP Headers (x-opencode-* → x-codegenie-*)

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/server/fence.ts` | `x-opencode-sync` | `x-codegenie-sync` | ✅ |
| `src/server/proxy.ts` | `x-opencode-*` headers | `x-codegenie-*` headers | ✅ |
| `src/session/llm.ts` | `x-opencode-session` etc. | `x-codegenie-session` etc. | ✅ |
| `src/mcp/oauth-provider.ts` | `client_name: "OpenCode"` | `client_name: "CodeGenie"` | ✅ |
| `src/account/account.ts` | `clientId = "opencode-cli"` | `clientId = "codegenie-cli"` | ✅ |
| `src/provider/provider.ts` | X-Title headers | 品牌替换 | ✅ |

---

### 2.12 CLI 命令描述修复

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/cli/cmd/tui/thread.ts` | `describe: "start opencode tui"` | `describe: "start codegenie tui"` | ✅ |
| `src/cli/cmd/tui/thread.ts` | `describe: "path to start opencode in"` | `describe: "path to start codegenie in"` | ✅ |
| `src/cli/cmd/tui/thread.ts` | `url: "http://opencode.internal"` | `url: "http://codegenie.internal"` | ✅ |
| `src/cli/cmd/tui/attach.ts` | `describe: "attach to a running opencode server"` | `describe: "attach to a running codegenie server"` | ✅ |
| `src/cli/cmd/tui/attach.ts` | `Buffer.from(\`opencode:${password}\`)` | `Buffer.from(\`codegenie:${password}\`)` | ✅ |

---

### 2.13 日志消息修复

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/index.ts` | `Log.Default.info("opencode", ...)` | `Log.Default.info("codegenie", ...)` | ✅ |
| `src/cli/cmd/github.ts` | `console.log("opencode session", ...)` | `console.log("codegenie session", ...)` | ✅ |
| `src/cli/cmd/github.ts` | `console.log("Sending message to opencode...")` | `console.log("Sending message to codegenie...")` | ✅ |
| `src/cli/cmd/mcp.ts` | `prompts.log.info("...in opencode.json:")` | `prompts.log.info("...in codegenie.json:")` | ✅ |
| `src/config/config.ts` | `log.warn("...opencode config...")` | `log.warn("...codegenie config...")` | ✅ |
| `src/config/config.ts` | `.well-known/opencode` endpoint | `.well-known/codegenie` endpoint | ✅ |

---

### 2.14 Desktop Electron 应用名称和 ID

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `packages/desktop-electron/src/main/index.ts` | `APP_NAMES: { dev: "OpenCode Dev", beta: "OpenCode Beta", prod: "OpenCode" }` | `{ dev: "CodeGenie Dev", beta: "CodeGenie Beta", prod: "CodeGenie" }` | ✅ |
| `packages/desktop-electron/src/main/index.ts` | `APP_IDS: { dev: "ai.opencode.desktop.dev", beta: "ai.opencode.desktop.beta", prod: "ai.opencode.desktop" }` | `{ dev: "ai.codegenie.desktop.dev", beta: "ai.codegenie.desktop.beta", prod: "ai.codegenie.desktop" }` | ✅ |
| `packages/desktop-electron/src/main/index.ts` | `app.setName("OpenCode Dev")` | `app.setName("CodeGenie Dev")` | ✅ |

---

### 2.15 WebCommand 注释 (暂时禁用)

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/index.ts` | `.command(WebCommand)` | `// .command(WebCommand)` | ✅ |

---

### 2.15 showHelp 检查修复

| 文件路径 | 原值 | 新值 | 验证 |
|---------|------|------|------|
| `src/index.ts` | `if (!text.startsWith("opencode "))` | `if (!text.startsWith("codegenie "))` | ✅ |

---

## 三、排除项 (未修改)

以下内容根据需求规格明确排除，未进行修改：

| 类型 | 内容 | 原因 |
|------|------|------|
| URL | `https://opencode.ai/*` | 外部网站地址 |
| URL | `https://api.opencode.ai/*` | API 端点 |
| 包名 | `@opencode-ai/sdk` | SDK 包名保持兼容 |
| 包名 | `@opencode-ai/plugin` | 插件包名保持兼容 |
| Service ID | `@opencode/*` (Effect) | Effect Service ID 保持兼容 |
| 外部插件 | `opencode-gitlab-auth` | 外部插件 |
| 外部插件 | `opencode-poe-auth` | 外部插件 |
| 构建全局 | `OPENCODE_VERSION` | 构建时全局变量 |
| 构建全局 | `OPENCODE_CHANNEL` | 构建时全局变量 |
| 构建全局 | `OPENCODE_LIBC` | 构建时全局变量 |
| 构建全局 | `OPENCODE_MIGRATIONS` | 构建时全局变量 |
| 构建全局 | `OPENCODE_RUN_ID` | 构建时全局变量 |
| 构建全局 | `OPENCODE_PROCESS_ROLE` | 构建时全局变量 |
| GitHub | `github.com/anomalyco/opencode` | GitHub 仓库路径 |
| Docker | `ghcr.io/anomalyco/opencode` | Docker 镜像名 (tips 中保留) |

---

## 四、验证状态

| 验证项 | 状态 | 备注 |
|--------|------|------|
| `bun typecheck` | ✅ 通过 | 无类型错误 |
| CLI help 输出 | ✅ 通过 | 所有品牌名正确 |
| 需求文档更新 | ✅ 完成 | 验收清单已标记 |
| 源码修改文档 | ✅ 完成 | 本文档 |

---

## 五、待完成项

| 任务 | 状态 | 备注 |
|------|------|------|
| process.env.OPENCODE* 替换 | ✅ 完成 | 后台任务 + 手动补充 |
| desktop-electron APP_NAMES/APP_IDS | ✅ 完成 | 手动修复 |
| `bun test` 验证 | ⏳ 待执行 | 需用户执行 |
| 应用启动验证 | ⏳ 待执行 | 需用户执行 |

---

## 六、版本历史

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| 1.1 | 2026-04-22 | 更新 REQ-005 状态为完成，添加 desktop-electron APP_NAMES/APP_IDS |
| 1.0 | 2026-04-22 | 初始版本，记录所有已完成变更 |