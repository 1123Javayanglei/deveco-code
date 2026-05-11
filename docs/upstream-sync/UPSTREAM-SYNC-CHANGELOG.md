# Upstream Sync Changelog

> 同步规则和流程见 [UPSTREAM-SYNC-GUIDE.md](./UPSTREAM-SYNC-GUIDE.md)

## 2026-05-11 | v1.14.31 → v1.14.32

- **分支**: sync
- **上游提交数**: 23
- **冲突**: 128 个文件。17 个 package.json 版本号冲突（保留 name="codegenie"，升级版本）；packages/web/package.json workspace 依赖；1 个 extension.toml 版本号+下载 URL；bun.lock 重新生成；43 个测试文件品牌标识冲突；10 个 HTTPAPI 新文件冲突；4 个源码功能性冲突；InstanceStore/InstanceContext 新模块冲突；Logo 组件冲突；adapters 重命名冲突。
- **结构性变更**: opentui 升级至 0.2.2（renderer.waitForThemeMode 正式 API）；上游将 workspace adapters 重命名（adaptors → adapters）；新增 InstanceStore/InstanceContext 模块（Effect Service/Layer 架构）；Logo 组件上游大幅重构（添加复杂交互效果）。
- **功能性冲突**:
  - `tui/app.tsx`: 接受上游 `renderer.waitForThemeMode()` 正式 API 和 prewarm palette，保留本地品牌标识。
  - `tui/component/logo.tsx`: **保留本地简化版 + 接受 subpixel 渲染 gate**，拒绝上游复杂交互效果（shimmer/wave/burst/rings 等）。
  - `config/config.ts`: 保留 `CODEGENIE_CONFIG_CONTENT` 品牌标识，接受上游 `containsPath()` 简化逻辑。
  - `workspace-routing.ts`: 保留 `x-codegenie-directory` header 品牌标识。
  - `workspace/adapters/*.ts`: 接受上游重命名（adaptors → adapters），手动迁移本地修改。
  - `instance/instance-store.ts`、`instance/instance-context.ts`: 接受上游 Effect Service/Layer 架构。
- **品牌修复**:
  - 43 个测试文件中 `Flag.OPENCODE_*` → `Flag.CODEGENIE_*`
  - 10 个 HTTPAPI 新文件中 `OPENCODE_*` → `CODEGENIE_*`
- **auto-merge 陷阱修复**:
  - `packages/web/package.json` workspace 依赖已正确保留为 `"codegenie": "workspace:*"`。
  - `packages/opencode/package.json` name 字段已正确保留为 `"codegenie"`。
- **主要变更**:
  - release: v1.14.32
  - upgrade opentui to 0.2.2 (#25420)
  - fix(tui): keep shell-mode prompt editable (#25419)
  - Replace Instance.disposeAll/load with fixture helper (#25418)
  - fix(httpapi): install Instance ALS for adapter Promise bridge (#25417)
  - fix(httpapi): re-land workspace create payload accepts missing extra (#25412)
  - Migrate test inits from Promise to Effect (#25377)
  - Convert LoadInput.init to Effect + extract InstanceBootstrap as a Service (#25376)
  - Drop ALS fallbacks from containsPath and workspace routing (#25374)
  - Extract InstanceStore.provide helper (#25372)
  - fix(httpapi): preserve OpenAPI parameter parity (#25291)
  - Move instance loading into Effect service (#25277)
  - fix(read): prevent unsupported image formats from being sending to provider (#21114)
  - core: fix npm package detection to properly handle cached directories without installed packages (#25354)
  - core: allow agents to access global tmp directory without permission prompts
  - fix: bedrock reasoning issue (#25303)
  - fix(session): use finite archived timestamp schema (#25275)
  - refactor: rename workspace adapters (#25272)

## 2026-05-09 | v1.14.32 → v1.14.33

- **分支**: develop
- **上游提交数**: 2
- **冲突**: 20 个文件。18 个 package.json 版本号冲突（保留 name="codegenie"，升级版本）；packages/web/package.json workspace 依赖；1 个 extension.toml 版本号+下载 URL；bun.lock 重新生成；1 个源码功能性冲突（models.ts）。
- **结构性变更**: provider/models.ts 从 Promise 模式重构为 Effect Service/Layer 模式。
- **功能性冲突**:
  - `provider/models.ts`: 接受上游 Effect Service/Layer 重构（Interface、Service extends Context.Service、layer、defaultLayer、Effect.cachedInvalidateWithTTL），保留品牌标识（`Flag.CODEGENIE_MODELS_URL`、`Flag.CODEGENIE_MODELS_PATH`、`Flag.CODEGENIE_DISABLE_MODELS_FETCH`）。
- **品牌修复**:
  - `test/provider/models.test.ts`: `Flag.OPENCODE_MODELS_PATH` → `Flag.CODEGENIE_MODELS_PATH`，`Flag.OPENCODE_DISABLE_MODELS_FETCH` → `Flag.CODEGENIE_DISABLE_MODELS_FETCH`
- **auto-merge 陷阱修复**:
  - `packages/web/package.json` workspace 依赖已正确保留为 `"codegenie": "workspace:*"`。
  - `packages/opencode/package.json` name 字段已正确保留为 `"codegenie"`。
- **主要变更**:
  - release: v1.14.33
  - fix(instance): restore InstanceBootstrap init parameter for non-Effect (#25449)

## 2026-05-06 | v1.14.31 → v1.14.32

- **分支**: upstream-tracking-develop
- **上游提交数**: 23
- **冲突**: 41 个文件。17 个 package.json 版本号冲突（保留 name="codegenie"，升级版本）；packages/web/package.json workspace 依赖；1 个 extension.toml 版本号+下载 URL；bun.lock 重新生成；4 个源码功能性冲突；18 个测试文件冲突。
- **结构性变更**: opentui 升级至 0.2.2（renderer.waitForThemeMode 正式 API）；上游将 workspace adapters 重命名（adaptors → adapters）；新增 InstanceStore/InstanceContext 模块；Logo 组件上游大幅重构（添加复杂交互效果）。
- **功能性冲突**:
  - `tui/app.tsx`: 接受上游 `renderer.waitForThemeMode()` 正式 API 和 prewarm palette，保留本地品牌标识。
  - `tui/component/logo.tsx`: **保留本地简化版**，拒绝上游复杂交互效果（shimmer/wave/burst/rings 等）。
  - `config/config.ts`: 保留 `CODEGENIE_CONFIG_CONTENT` 品牌标识，接受上游 `containsPath()` 简化逻辑。
  - `workspace-routing.ts`: 保留 `x-codegenie-directory` header 品牌标识。
- **品牌修复**:
  - 18 个测试文件中 `Flag.OPENCODE_*` → `Flag.CODEGENIE_*`
- **主要变更**:
  - release: v1.14.32
  - upgrade opentui to 0.2.2 (#25420)
  - fix(tui): keep shell-mode prompt editable (#25419)
  - Replace Instance.disposeAll/load with fixture helper (#25418)
  - fix(httpapi): install Instance ALS for adapter Promise bridge (#25417)
  - fix(httpapi): re-land workspace create payload accepts missing extra (#25412)
  - Migrate test inits from Promise to Effect (#25377)
  - Convert LoadInput.init to Effect + extract InstanceBootstrap as a Service (#25376)
  - Drop ALS fallbacks from containsPath and workspace routing (#25374)
  - Extract InstanceStore.provide helper (#25372)
  - fix(httpapi): preserve OpenAPI parameter parity (#25291)
  - Move instance loading into Effect service (#25277)
  - fix(read): prevent unsupported image formats from being sending to provider (#21114)
  - core: fix npm package detection to properly handle cached directories without installed packages (#25354)
  - core: allow agents to access global tmp directory without permission prompts
  - fix: bedrock reasoning issue (#25303)
  - fix(session): use finite archived timestamp schema (#25275)
  - refactor: rename workspace adapters (#25272)

## 2026-05-06 | v1.14.30 → v1.14.31

- **分支**: upstream-tracking-develop
- **上游提交数**: 93
- **冲突**: 43 个文件。16 个 package.json 版本号冲突（保留 name="codegenie"，升级版本）；packages/web/package.json workspace 依赖；1 个 extension.toml 版本号；bun.lock 重新生成；6 个核心源码冲突；10 个测试文件冲突。
- **结构性变更**: 上游将 workspace.ts 重构为 Effect Service/Layer 模式，删除旧的函数式实现；新增 AzureAuthPlugin；新增 CLAUDE_EXTERNAL_DIR/AGENTS_EXTERNAL_DIR 常量；新增 CORS 中间件；新增 config.instructions 配置支持；SDK types 使用 hey-api/openapi-ts 生成。
- **功能性冲突**:
  - `workspace.ts`: 接受上游 Effect Service/Layer 重构，保留 `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES`、`CODEGENIE_AUTH_CONTENT`、`CODEGENIE_WORKSPACE_ID` 品牌标识。
  - `llm.ts`: 保留 `x-codegenie-*` headers 和 `User-Agent: codegenie/*`，接受上游 `opencodeProjectID` 变量重构。
  - `session.ts`: 保留 `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES`。
  - `skill/index.ts`: 保留 `CODEGENIE_DISABLE_DEFAULT_SKILLS`、`Defaults.ensure()`、`CODEGENIE_SKILL_PATTERN`，合并上游 `CLAUDE_EXTERNAL_DIR` 支持。
  - `instruction.ts`: 保留 `Flag.CODEGENIE_DISABLE_CLAUDE_CODE_PROMPT`、`Flag.CODEGENIE_DISABLE_PROJECT_CONFIG`，合并上游 `config.instructions` 处理逻辑。
  - `plugin/index.ts`: 保留本地内部插件（CodegenieAuthPlugin、AnalyticsPlugin、HarmonyNapiDynamicToolsPlugin），合并上游 AzureAuthPlugin。
- **品牌修复**:
  - `global.ts`: `OPENCODE_CONFIG_DIR` → `CODEGENIE_CONFIG_DIR`
  - `ui.ts`: `OPENCODE_DISABLE_EMBEDDED_WEB_UI` → `CODEGENIE_DISABLE_EMBEDDED_WEB_UI`
  - `workspace.test.ts`: 多处 `OPENCODE_EXPERIMENTAL_WORKSPACES` → `CODEGENIE_EXPERIMENTAL_WORKSPACES`
- **SDK 修复**: 重新生成 SDK types（`bun run build` in packages/sdk/js）以解决 MessageV2.Part 类型不匹配问题（新增 QueueError type）。
- **plan.ts 修复**: 添加 `Instance` 导入，修复 `Session.plan()` 调用参数（需要 `instance: InstanceContext`）。
- **auto-merge 陷阱修复**:
  - `packages/web/package.json` workspace 依赖已正确保留为 `"codegenie": "workspace:*"`。
- **主要变更**:
  - feat(workspace): Effect Service/Layer refactor (#24xxx)
  - feat(plugin): add AzureAuthPlugin for Azure authentication
  - feat(skill): support external Claude/Agents directories
  - feat(config): add instructions field for additional instruction files
  - feat(cors): add CORS middleware for HTTPAPI
  - fix(sdk): regenerate types to include new error types
  - Multiple HTTPAPI parity improvements

## 2026-04-30 | v1.14.29 → v1.14.30

- **分支**: upstream-tracking-develop
- **上游提交数**: 42
- **冲突**: 29 个文件。16 个 package.json 版本号冲突（保留 name="codegenie"，升级版本）；packages/web/package.json workspace 依赖；1 个 extension.toml 版本号+下载 URL；bun.lock 重新生成；4 个源码功能性冲突；5 个测试文件冲突。
- **结构性变更**: 上游新增 `ServerBackend` 模块选择后端（hono vs effect-httpapi），引入 `withBackend()`、`select()`、`Legacy()` 函数；新增 `ProxyUtil` 模块整合 proxy 相关工具函数；删除 `CodeSearchTool`（标记 broken）；新增 session `path` 过滤功能。
- **功能性冲突**:
  - `server/backend.ts`: 新增文件，将 `Flag.OPENCODE_EXPERIMENTAL_HTTPAPI` 改为 `Flag.CODEGENIE_EXPERIMENTAL_HTTPAPI`。
  - `server/server.ts`: 接受上游新架构（`ServerBackend.select()`、`withBackend()`），保留品牌标识。
  - `server/proxy.ts`: 接受上游移除内联函数改用 `ProxyUtil`，保留 `x-codegenie-proxy-url` header。
  - `server/proxy-util.ts`: 将 `x-opencode-directory`/`x-opencode-workspace` 改为 `x-codegenie-directory`/`x-codegenie-workspace`。
  - `session/session.ts`: 接受新增 `path` 过滤功能，将 `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` 改为 `Flag.CODEGENIE_EXPERIMENTAL_WORKSPACES`。
  - `tool/registry.ts`: 接受删除 `CodeSearchTool`，保留 `Flag.CODEGENIE_ENABLE_EXA`。
- **测试文件冲突**: 5 个测试文件（httpapi-json-parity/mcp/provider/sync/workspace）接受上游新增 `mock.restore()` 和 `Server.Legacy()` 分支，将所有 `Flag.OPENCODE_*` 改为 `Flag.CODEGENIE_*`。
- **auto-merge 陷阱修复**:
  - `packages/web/package.json` workspace 依赖已正确保留为 `"codegenie": "workspace:*"`。
- **语法修复**: `server/server.ts` 和 `tool/registry.ts` 编辑残留的多余 `}` 已移除。
- **主要变更**:
  - fix(desktop): Path mismatches cause sessions missing + strong ID + existing data fix (#25013)
  - feat: add Mistral Medium 3.5 with reasoning support (#24996)
  - Refactor HttpApi workspace routing and proxy boundaries (#25006)
  - fix(core): reconnect editor context for session directory (#24984)
  - chore: rm broken codesearch tool (#24992)
  - tweak: adjust order of system prompt instructions: Global, Project, Skills (#24974)
  - Prepare Effect HttpApi backend parity (#24853)
  - fix(session): remap compaction tail_start_id when forking (#24898)
  - feat: make it easier to toggle on/off paste summary in the tui (#24869)
  - feat(core): filter sessions by path and add setting to disable (#24849)

## 2026-04-29 | v1.14.28 → v1.14.29

- **分支**: upstream-tracking-develop
- **上游提交数**: 53
- **冲突**: 42 个文件。27 个 package.json/extension.toml 冲突（接受版本号升级，保留 name="codegenie"）；12 个测试文件冲突（接受上游）；3 个源码功能性冲突；bun.lock 重新生成。
- **结构性变更**: 上游重构 HTTPAPI 路由处理，删除 server.ts 和 routes/instance/index.ts 中的旧路由注册代码块（已整合到新的 httpapi/public.ts、httpapi/global.ts 等文件）。
- **导入路径重构**: 上游继续 Effect 迁移，多个文件导入路径从桶文件改为直接导入（如 `@/session` → `@/session/session`，`@/util` → `@opencode-ai/core/util/log`）。
- **功能性冲突**:
  - `server.ts`: 接受上游删除旧 HTTPAPI 路由注册块，保留 `Flag.CODEGENIE_EXPERIMENTAL_HTTPAPI` 和 `Flag.CODEGENIE_WORKSPACE_ID` 品牌标识。
  - `routes/instance/index.ts`: 接受上游删除旧 HTTPAPI 路由注册块。
  - `llm.ts`: 接受导入路径重构，保留 `x-codegenie-*` headers 和 `Flag.CODEGENIE_CLIENT` 品牌标识。
  - `share/session.ts`: 接受导入路径重构，保留 `Flag.CODEGENIE_AUTO_SHARE`。
  - `skill/index.ts`: 接受导入路径重构，保留 `Flag.CODEGENIE_DISABLE_DEFAULT_SKILLS`、`Flag.CODEGENIE_DISABLE_EXTERNAL_SKILLS` 和 `Defaults.ensure()` 本地功能。
  - `tool/registry.ts`: 接受导入路径重构，保留 HarmonyOS 工具（HdcLogTool、SwitchCwdTool、OhKnowledgeTool）和品牌标识（`Flag.CODEGENIE_CLIENT`、`Flag.CODEGENIE_EXPERIMENTAL_LSP_TOOL`、`Flag.CODEGENIE_ENABLE_EXA`）。
  - `home.tsx`: 接受导入路径重构，保留 `CodeGenieOnboarding` 组件。
  - `project.ts`: 接受导入路径重构，保留 `Flag.CODEGENIE_FAKE_VCS`、`Flag.CODEGENIE_EXPERIMENTAL_ICON_DISCOVERY`。
- **本地源码修复**: `security/local-crypto.ts`、`session/oh-knowledge-async.ts`、`skill/defaults.ts` 导入路径更新为 Effect 模式。
- **auto-merge 陷阱修复**:
  - `packages/web/package.json` workspace 依赖被覆盖为 `"opencode": "workspace:*"`，手动改回 `"codegenie": "workspace:*"`。
  - 测试文件中 `Flag.OPENCODE_EXPERIMENTAL_HTTPAPI`、`Flag.OPENCODE_SERVER_PASSWORD`、`Flag.OPENCODE_SERVER_USERNAME`、`Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` 需改为 `CODEGENIE_*`。
- **待修复问题**:
  - bun 版本要求从 1.3.12 升级到 1.3.13。
- **已修复问题**:
  - 测试文件 `test/session/prompt.test.ts`、`test/session/snapshot-tool-race.test.ts` Layer 类型不匹配（Effect v4 类型推断问题）。修复：添加 `ServeError` 导入、`TestLLMServer.layer` 类型注解、`Layer.provideMerge` 替换 `Layer.provide`、测试调用处类型断言。
- **主要变更**:
  - feat(core): store relative path for sessions (#24704)
  - feat(core): file context improvements and option to disable (#24661)
  - refactor(httpapi): fork server startup by flag (#24799)
  - refactor(httpapi): align request body openapi shape (#24811)
  - fix(httpapi): multiple OpenAPI and session parity fixes (#24660-#24809)
  - fix(tui): Zed editor context polling stability (#24656/#24662/#24711)
  - fix(session): compaction and shell cancellation improvements (#24553/#24676/#24677)
  - docs: bump GitHub stars count to 150K (#24792)
  - zen: coupons
  - chore: bump effect beta (#24705)

## 2026-04-28 | v1.14.27 → v1.14.28

- **分支**: upstream-tracking-develop
- **上游提交数**: 7
- **冲突**: 23 个文件。16 个 package.json 纯版本号冲突（接受上游）；packages/opencode/package.json 保留 name="codegenie"、升级版本号；packages/extensions/zed/extension.toml 版本号+下载 URL；bun.lock 重新生成。
- **功能性冲突**:
  - `cli/upgrade.ts`: 保留 `Flag.CODEGENIE_DISABLE_AUTOUPDATE`，采用上游简化调用方式（`Installation.method()` 直接调用替代 `AppRuntime.runPromise` 包装）。
  - `installation/index.ts`: 保留 CodeGenie `viewVersion` 方案（包管理器子进程查询），拒绝上游 Homebrew/Chocolatey/Scoop/curl 等不适用于 CodeGenie 的分发渠道。移除不再使用的 `NpmConfig` 导入。
  - `test/installation/installation.test.ts`: 重写 npm/bun/pnpm 测试为 subprocess mock 方式，与 `viewVersion` 源码方案一致。
  - `test/npm.test.ts`: 上游删除此文件（测试重构到 `packages/core/test/`），接受删除。
- **auto-merge 陷阱修复**:
  - `packages/web/package.json` workspace 依赖被覆盖为 `"opencode": "workspace:*"`，手动改回 `"codegenie": "workspace:*"`。
- **主要变更**:
  - Refactor npm config handling (#24565)
  - feat(go): models endpoint
  - fix: ignore GitHub Actions changelog contributor (#24567)

## 2026-04-27 | v1.14.26 → v1.14.27

- **分支**: upstream-tracking-develop
- **上游提交数**: 12
- **冲突**: 22 个文件。15 个 package.json 纯版本号冲突（接受上游）；packages/opencode/package.json 保留 name="codegenie"、升级版本号；packages/extensions/zed/extension.toml 版本号；bun.lock 重新生成。
- **功能性冲突**:
  - `installation/index.ts`: 上游重构为自引用 `result` 对象模式，新增 brew/curl/choco/scoop 等完整安装方法支持。CodeGenie 保留精简版 Method 类型（npm/pnpm/bun/unknown）、自有品牌标识（`@codegenie-ai/codegenie-cli`、`codegenie/` USER_AGENT），适配上游新结构，移除不再需要的 `import path`。
  - `shell/shell.ts`: 上游大幅重构 — BLACKLIST/LOGIN/POSIX Set 替换为 META record 表，新增 `ps()`/`args()`/`list()` 函数，`preferred/acceptable` 从常量改为支持 configShell 参数的函数。移除本地 `redirectKind()`/`adaptWindowsRedirects()` 函数。`gitbash()` 保留 `Flag.CODEGENIE_GIT_BASH_PATH`。
  - `tool/bash.ts`: 移除本地 PS Set 和 `Shell.adaptWindowsRedirects` 调用（上游已通过 shell 重构解决），`DEFAULT_TIMEOUT` 保留 `Flag.CODEGENIE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS`。
- **auto-merge 陷阱修复**:
  - 8 个测试文件（httpapi-config/event/pty/sync/tui/session/instance/experimental/workspace）中 `Flag.OPENCODE_EXPERIMENTAL_HTTPAPI` 和 `Flag.OPENCODE_EXPERIMENTAL_WORKSPACES` 被上游新测试引入，需改为 `CODEGENIE_*`。
  - `test/util/shell-redirect.test.ts` 引用已删除的 `redirectKind`/`adaptWindowsRedirects`，删除该测试文件。
  - `packages/web/package.json` 和 `packages/plugin/package.json` 出现重复 version 行（sed 替换冲突标记时产生），手动修复。
- **主要变更**:
  - feat: configurable shell selection + desktop settings UI (#20602)
  - feat(httpapi): bridge event stream/pty/tui routes (#24518/#24547/#24548)
  - core: refactor Installation service to use a single consolidated result object
  - fix(tui): hide provider checks before onboarding (#24551)
  - fix(tui): update toast duration handling to use default value (#23395)
  - upgrade opentui to 0.1.105 (#24555)

## 2026-04-27 | v1.14.25 → v1.14.26

- **分支**: upstream-tracking-develop
- **上游提交数**: 63
- **冲突**: 29 个文件。15 个 package.json 纯版本号冲突（接受上游）；packages/opencode/package.json 保留 name="codegenie"、升级版本号；packages/extensions/zed/extension.toml 版本号+下载 URL；bun.lock 重新生成。
- **结构性变更**: 上游将 `packages/shared/` 重命名为 `packages/core/`（`@opencode-ai/shared` → `@opencode-ai/core`）。所有本地 `@opencode-ai/shared` 引用已更新为 `@opencode-ai/core`。`packages/opencode/src/global/index.ts` 上游已删除（Global 移入 core 包），本地跟随删除。
- **品牌冲突**:
  - `global.ts`: 保留 `app = "codegenie"` 和 `CODEGENIE_TEST_HOME`
  - `llm.ts`: 保留 `x-codegenie-*` headers，合并上游新增的 `User-Agent` header
  - `ui.ts`: 保留 CodeGenie logo/mark 系统，import 路径更新为 `@opencode-ai/core`
  - `server/routes/ui.ts`: import 路径更新为 `@opencode-ai/core/flag/flag`，保留 `CODEGENIE_` flag 引用
- **权限冲突**:
  - `agent.ts`: 保留 HarmonyOS 工具权限（bash/build_project/check_ets_files 等 deny），合并上游 `external_directory` 和 `plan_exit` 配置
- **import 路径修复**: 全局搜索修复遗漏的 `@/global` → `@opencode-ai/core/global` 和 `@/installation/version` → `@opencode-ai/core/installation/version` 引用（涉及 skill/defaults.ts、plugin/analytics/storage.ts、skill/index.ts、tui/routes/home.tsx 等文件）
- **auto-merge 陷阱修复**: packages/web/package.json workspace 依赖被覆盖为 opencode，手动改回 codegenie
- **主要变更**:
  - refactor: rename shared package to core (#24309)
  - refactor: remove lazy cross-spawn runtime (#24305)
  - core: consolidate shared infrastructure into core package
  - core: move Global module to @opencode-ai/core for centralized path management
  - core: Add User-Agent header to identify client version in HTTP requests
  - feat(httpapi): bridge workspace mutations, session lifecycle/message/read routes, MCP oauth/control endpoints, file search, catalog, config update, worktree mutations, instance dispose, project git init/update, experimental tool/session routes (#24356-#24510)
  - feat(go): add Go model listing endpoint (#24304)
  - feat(tui): show /connect tip when user has no models configured (#24014)
  - feat(tui): read Zed editor context from state db (#24352)
  - feat: add startup debug command (#24310)
  - upgrade opentui to 0.1.104 (#24531)
  - fix(editor): reject lock files with no workspace match for cwd (#24323)
  - fix(config): preserve permission order with Effect decode (#24308)
  - fix: bump openrouter sdk version to resolve deepseek reasoning issue (#24435)

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
