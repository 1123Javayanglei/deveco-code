# HarmonyOS 工具迁移 - 源码修改清单

> **设计原则**: 将 codegenie-old 的 7 个工具（4 个 HarmonyOS + 3 个 Plan）迁移到 codegenie-cli，核心工作是 async/await → Effect-TS 框架适配。

---

## 1. 修改概览

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `packages/opencode/src/tool/hdc_log.ts` | 新增 | Effect 重写设备日志采集工具 |
| `packages/opencode/src/tool/jscrash_report.ts` | 新增 | Effect 重写崩溃日志分析工具 |
| `packages/opencode/src/tool/oh_knowledge.ts` | 新增 | Effect 重写鸿蒙知识检索工具（含 Auth） |
| `packages/opencode/src/tool/switch-cwd.ts` | 新增 | Effect 重写项目目录切换工具 |
| `packages/opencode/src/tool/plan.ts` | 修改 | 新增 PlanWriteTool + PlanEnterTool |
| `packages/opencode/src/tool/hdc-log.txt` | 新增 | hdc_log 工具描述文件 |
| `packages/opencode/src/tool/jscrash-report.txt` | 新增 | jscrash_report 工具描述文件 |
| `packages/opencode/src/tool/switch-cwd.txt` | 新增 | switch_cwd 工具描述文件 |
| `packages/opencode/src/tool/plan-write.txt` | 新增 | plan_write 工具描述文件 |
| `packages/opencode/src/tool/lib/env.ts` | 新增 | DevEco 环境工具函数（直接复制） |
| `packages/opencode/src/tool/lib/session-cwd.ts` | 新增 | 会话 CWD 管理（直接复制） |
| `packages/opencode/src/tool/lib/harmony_napi.ts` | 新增 | NAPI 桥接入口（直接复制） |
| `packages/opencode/src/tool/lib/mcp-bridge.d.ts` | 新增 | MCP 桥接类型声明（直接复制） |
| `packages/opencode/src/tool/lib/emulator_tools.json` | 新增 | 模拟器工具配置（直接复制） |
| `packages/opencode/src/tool/registry.ts` | 修改 | 注册 7 个工具 + 添加 Auth.Service Layer |
| `test/session/prompt-effect.test.ts` | 修改 | 添加 Auth.defaultLayer |
| `test/session/snapshot-tool-race.test.ts` | 修改 | 添加 Auth.defaultLayer |

**总计**: 新增 14 个文件 + 修改 3 个文件。

---

## 2. 迁移工具清单

```
hdc_log           设备日志采集（collect/clear/list_devices）
jscrash_report    ArkTS/JS 崩溃日志分析
oh_knowledge      鸿蒙知识库检索（OAuth 认证）
switch_cwd        会话项目目录切换 + Harmony 项目校验
plan_enter        进入 Plan 模式（确认 → 创建 plan agent）
plan_write        写入计划文件内容
plan_exit         退出 Plan 模式（已有，无需迁移）
```

---

## 3. Effect 框架适配要点

### 3.1 导入规范

```typescript
// codegenie-old
import { Tool } from "./tool"

// codegenie-cli
import * as Tool from "./tool"
```

### 3.2 工具定义模式

```typescript
// codegenie-old (async/await)
export const ToolName = Tool.define("tool_id", async () => ({
  description: "...",
  parameters: z.object({ ... }),
  execute: async (args, ctx) => {
    const result = await someAsyncOp()
    return { title, output, metadata }
  }
}))

// codegenie-cli (Effect-TS)
export const ToolName = Tool.define("tool_id", Effect.gen(function* () {
  // 可选：捕获 Service
  const auth = yield* Auth.Service

  return {
    description: DESCRIPTION,
    parameters: Parameters,
    execute: (args: z.infer<typeof Parameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise(() => someAsyncOp())
        return { title, output, metadata }
      }).pipe(Effect.orDie),  // 确保 never 错误通道
  }
}))
```

### 3.3 关键差异

| Aspect | codegenie-old | codegenie-cli |
|--------|---------------|---------------|
| Init | `async () => ({ ... })` | `Effect.gen(function* () { return { ... } })` |
| Execute | `async execute(args, ctx)` | `execute: (args, ctx) => Effect.gen(...).pipe(Effect.orDie)` |
| Ask | `await ctx.ask(...)` | `yield* ctx.ask(...)` |
| Auth | `await Auth.get("codegenie")` | `yield* Auth.Service`（init 阶段闭包捕获） |
| Errors | `throw new Error(...)` | `throw new Error(...)`（Effect.gen 内有效） |
| Error channel | `Error` | `never`（用 `Effect.orDie` 转换） |

---

## 4. 详细修改说明

### 4.1 纯工具函数库（直接复制）

以下文件无 Effect 依赖，直接从 codegenie-old 复制：

| 文件 | 用途 |
|------|------|
| `lib/env.ts` | DevEco 路径解析（findDevEcoHome、hdcPath） |
| `lib/session-cwd.ts` | 会话 CWD 内存映射（sessionID → directory） |
| `lib/harmony_napi.ts` | NAPI 桥接初始化 |
| `lib/mcp-bridge.d.ts` | @deveco-codegenie/mcp-bridge 类型声明 |
| `lib/emulator_tools.json` | 模拟器工具 Schema |

### 4.2 Effect 适配工具

#### hdc_log（`src/tool/hdc_log.ts`）

- 依赖: `lib/env.ts`（findDevEcoHome, hdcPath）
- Effect 模式: `Effect.tryPromise(() => findDevEcoHome())`
- 参数: `action: enum[collect,clear,list_devices]`, `device_id?: string`, `log_prefix: string`, `lines: number`

#### jscrash_report（`src/tool/jscrash_report.ts`）

- 依赖: `lib/env.ts`
- 纯分析函数（~300 行 detectErrorType、findCrashAnchor 等）直接复制
- 仅 execute 包装层 Effect 适配

#### oh_knowledge（`src/tool/oh_knowledge.ts`）

- 依赖: `Auth.Service`（OAuth token）
- Service 捕获: init 阶段 `const auth = yield* Auth.Service`
- API 调用: `Effect.tryPromise(() => fetch(BASE_URL, ...))`
- 认证流程: `auth.get("codegenie")` → 检查 `type === "oauth"` → 使用 access token

#### switch_cwd（`src/tool/switch-cwd.ts`）

- 依赖: `Instance`（directory）、`external-directory`（assertExternalDirectory）
- 路径解析: 相对路径基于 `Instance.directory`
- Harmony 校验: 检查 `AppScope/app.json5` 或 `build-profile.json5 + oh-package.json5`

#### plan_enter + plan_write（`src/tool/plan.ts`）

- PlanEnterTool: 无参数，捕获 Session/Question/Provider Service，确认后创建 plan agent
- PlanWriteTool: 参数 `content: string`，捕获 Session.Service，写入计划文件
- Plan 工具受 Flag 控制: `Flag.CODEGENIE_EXPERIMENTAL_PLAN_MODE && Flag.CODEGENIE_CLIENT === "cli"`

### 4.3 注册与依赖（`src/tool/registry.ts`）

```typescript
// 新增 import
import { HdcLogTool } from "./hdc_log"
import { JscrashReportTool } from "./jscrash_report"
import { SwitchCwdTool } from "./switch-cwd"
import { OhKnowledgeTool } from "./oh_knowledge"
import { PlanWriteTool, PlanEnterTool } from "./plan"
import { Auth } from "@/auth"

// Layer 类型添加 Auth.Service
export const layer: Layer.Layer<Service, never, ... | Auth.Service> = ...

// defaultLayer 链添加 Auth.defaultLayer
export const defaultLayer = layer.pipe(
  ...,
  Layer.provide(Auth.defaultLayer),
  ...
)

// Effect.all + builtin 数组添加新工具
const tool = yield* Effect.all({
  hdcLog: Tool.init(yield* HdcLogTool),
  jscrashReport: Tool.init(yield* JscrashReportTool),
  switchCwd: Tool.init(yield* SwitchCwdTool),
  ohKnowledge: Tool.init(yield* OhKnowledgeTool),
  // ...
})
```

### 4.4 测试文件修改

两个测试文件需提供 `Auth.defaultLayer`：

```typescript
// test/session/prompt-effect.test.ts
// test/session/snapshot-tool-race.test.ts
import { Auth } from "../../src/auth"

// 在 Layer 组装链中添加
Layer.provide(Auth.defaultLayer)
```

---

## 5. 验证

1. **类型检查**: `npx tsc --noEmit --project packages/opencode/tsconfig.json` 无新增错误
2. **工具注册**: 启动 opencode，确认 tool 列表中包含 7 个新工具
3. **功能验证**: 各工具 action 正常工作（hdc collect/clear/list_devices、crash 分析、知识检索、目录切换、plan 流程）
