# Upstream Sync Changelog

> 同步规则和流程见 [UPSTREAM-SYNC-GUIDE.md](./UPSTREAM-SYNC-GUIDE.md)

## 2026-04-27 | v1.14.24 → v1.14.25

- **分支**: upstream-tracking-develop
- **上游提交数**: 30
- **冲突**: 22 个文件。15 个 package.json 纯版本号冲突（接受上游）；packages/opencode/package.json 保留 name="codegenie"、升级版本号；sdks/vscode/package.json 版本号；packages/extensions/zed/extension.toml 版本号+下载 URL；bun.lock 重新生成。
- **功能逻辑冲突**:
  - `ripgrep.ts`: 上游移除 zod 迁移残留导入（fileURLToPath、z from "zod"），接受上游。
  - `lsp/server.ts`: 上游重构 C# Roslyn 支持，提取 `getRoslynLanguageServer()`/`installRoslynLanguageServer()`/`roslynLanguageServerGlobalPath()` 独立函数；新增 Razor LSP（`.razor`/`.cshtml`）和 `findVscodeRazorExtension()`；所有 `OPENCODE_DISABLE_LSP_DOWNLOAD` 保留为 `CODEGENIE_DISABLE_LSP_DOWNLOAD`。
  - `httpapi/server.ts`: 上游将认证逻辑提取到独立 `auth.ts`（支持 basic + authToken 双模式），本地 server.ts 中的旧内联认证代码（仅 basic、normalize hack）已冗余，接受上游移除。同步修正 `auth.ts` 中 `OPENCODE_SERVER_PASSWORD`/`OPENCODE_SERVER_USERNAME` 为 `CODEGENIE_SERVER_PASSWORD`/`CODEGENIE_SERVER_USERNAME`。
- **auto-merge 陷阱修复**: packages/web/package.json workspace 依赖被覆盖为 opencode，手动改回 codegenie；lsp/server.ts 清理 UTF-8 BOM 字符。
- **主要变更**:
  - feat(lsp): add Roslyn support for Razor and C# scripts (#24228)
  - refactor(ripgrep): migrate result schemas to effect (#24213)
  - refactor(schema): decode effect schemas directly (#24169)
  - refactor(httpapi): auth middleware wiring to dedicated auth.ts (#24168)
  - feat(permission): config schema now provides full IntelliSense for all tool permission keys
  - fix: ensure gpt-5.5 compacts at correct context size when using openai oauth (#24212)
  - fix(opencode): clarify git amend condition to require verifying commit landed (#19937)
  - fix: shell cwd after login startup (#24215)
  - ci: centralize opentui dependencies in workspace catalog
  - Use OpenTUI theme detection for initial TUI mode (#23846)

## 2026-04-27 | v1.14.23 → v1.14.24

- **分支**: upstream-tracking-develop
- **上游提交数**: 7
- **冲突**: 19 个文件。17 个 package.json/extension.toml 纯版本号冲突（接受上游）；packages/opencode/package.json 保留 name="codegenie"、升级版本号；packages/web/package.json workspace 依赖从 opencode 改为 codegenie；bun.lock 通过 bun install 重新生成。
- **功能逻辑冲突**: 无。
- **auto-merge 陷阱修复**: packages/web/package.json 的 workspace:* 依赖被 --theirs 覆盖为 opencode，手动改回 codegenie。
- **主要变更**:
  - feat(httpapi): bridge file read endpoints (#24098)
  - feat(httpapi): bridge mcp status endpoint (#24100)
  - fix: ensure assistant messages always have reasoning on them for deepseek (#24180)
  - fix: use existingModel as fallback for interleaved field (#24172)

## 2026-04-26 | v1.14.22 → v1.14.23

- **分支**: upstream-tracking-develop
- **上游提交数**: 42
- **冲突**: 25 个文件。16 个 package.json 版本号冲突（保留 codegenie 名称，升级版本）；bun.lock 接受上游；extension.toml 下载 URL 升级到 v1.14.23；packages/web/package.json workspace 依赖从 opencode 改为 codegenie。
- **功能逻辑冲突**: installation/index.ts（npm 版本查询重构为 viewVersion，保留本地品牌和裁剪的安装方式）；npm/index.ts（加 Stream import）；sync/index.ts（删除无用 ZodObject import）；tool/plan.ts（合并 fs + Schema import）；test/installation（接受上游新增 GitHub releases 测试和测试重命名）；test/npm.test.ts（接受上游新增 Npm.outdated 测试）。
- **auto-merge 陷阱修复**: server.ts 中 Flag.OPENCODE_EXPERIMENTAL_HTTPAPI 被覆盖回 OPENCODE_，修正为 Flag.CODEGENIE_EXPERIMENTAL_HTTPAPI。
- **主要变更**:
  - refactor(tool): migrate tool framework + all 18 built-in tools to Effect Schema (#23244)
  - refactor(session): migrate session domain to Effect Schema (#24005)
  - refactor(bus): migrate BusEvent to Effect Schema (#24040)
  - refactor(provider): migrate provider domain to Effect Schema (#24027)
  - refactor(sync): make session events schema-first (#24019)
  - feat(prompt): add shell mode UI with cancel button, custom icon, and example placeholder (#24105)
  - feat(truncate): allow configuring tool output truncation limits (#23770)
  - feat(httpapi): bridge workspace read endpoints (#24062)
  - feat(tui): support builtin protocol for handling context from editors (#24034)
  - fix: support `max` for deepseek (#24163)
  - fix: preserve empty reasoning_content for DeepSeek V4 thinking mode (#24146)
  - fix: account for additional openai retry case (#24063)
  - fix(npm): respect npmrc for version lookups (#24016)

## 2026-04-24 | v1.14.21 → v1.14.22

- **分支**: upstream-tracking-develop
- **上游提交数**: 9
- **冲突**: 19 个文件。16 个 package.json 版本号冲突（保留 codegenie 名称，升级版本）；bun.lock 接受上游；extension.toml 下载 URL 升级到 v1.14.22；packages/web/package.json workspace 依赖从 opencode 改为 codegenie。
- **主要变更**:
  - feat(project): add icon_url_override field to projects (#23955)
  - fix(npm): respect npmrc config (#24001)
  - fix: add keyed prop to Show components for proper reactivity (#23935)
  - refactor: remove redundant pending check from working memo (#23929)
  - 新增 database migration: 20260423070820_add_icon_url_override

## 2026-04-23 | v1.14.20 → v1.14.21

- **分支**: upstream-tracking-develop
- **合并提交**: 79bb903c7
- **上游提交数**: 49
- **冲突**: 21 个文件。14 个 package.json 版本号冲突（保留 codegenie 名称，升级版本）；bun.lock 接受上游（后续 bun install 重新生成）；extension.toml 下载 URL 升级到 v1.14.21；upgrade.ts 保留 CODEGENIE_DISABLE_AUTOUPDATE flag、移除重复检查；server.ts 保留 CODEGENIE_DISABLE_LSP_DOWNLOAD flag、接受 pyright 参数更新和 csharp-ls → roslyn-language-server 迁移。

---
