# HarmonyOS Tools Migration Document

This document describes the structure and location of HarmonyOS development tools migrated from codegenie-old to codegenie-cli.

## Tools Directory Structure

```
packages/opencode/src/tool/
├── hdc_log.ts                 # Device log collection via hdc
├── jscrash_report.ts          # ArkTS/JS crash log analysis
├── oh_knowledge.ts            # HarmonyOS knowledge base search
├── plan.ts                    # Plan tools (plan_enter, plan_exit, plan_write)
├── switch-cwd.ts              # Session Harmony project root + NAPI bridge path
├── hdc-log.txt                # Tool description for hdc_log
├── jscrash-report.txt         # Tool description for jscrash_report
├── plan-enter.txt             # Tool description for plan_enter
├── plan-exit.txt              # Tool description for plan_exit
├── plan-write.txt             # Tool description for plan_write
├── switch-cwd.txt             # Tool description for switch_cwd
└── lib/
    ├── env.ts                 # DevEco environment utilities
    ├── emulator_tools.json    # Emulator tool configurations
    ├── session-cwd.ts         # Per-session project directory (switch_cwd / NAPI worktree)
    ├── harmony_napi.ts        # NAPI bindings entry
    └── mcp-bridge.d.ts        # Type declarations for @deveco-codegenie/mcp-bridge
```

## Tool Descriptions

### Built-in Tools (Tool.define format, Effect framework)

| File                    | Tool ID                | Description                                                                 | Description File |
|-------------------------|------------------------|-----------------------------------------------------------------------------|---------------|
| `hdc_log.ts`            | `hdc_log`              | Collects, clears, and lists device logs via hdc shell hilog                | `hdc-log.txt` |
| `jscrash_report.ts`     | `jscrash_report`       | Analyzes ArkTS/JavaScript crash logs and provides actionable insights      | `jscrash-report.txt` |
| `plan.ts`               | `plan_enter`           | Enters plan mode for complex development tasks                              | `plan-enter.txt` |
| `plan.ts`               | `plan_exit`            | Exits plan mode and switches to build agent                                 | `plan-exit.txt` |
| `plan.ts`               | `plan_write`           | Writes plan content to plan file                                            | `plan-write.txt` |
| `switch-cwd.ts`         | `switch_cwd`           | Sets per-session Harmony application root; validates layout                 | `switch-cwd.txt` |
| `oh_knowledge.ts`       | `arkts_knowledge_search`| Search and obtain answers from the official HarmonyOS knowledge base      | (inline) |

### Supporting Libraries

| Directory | Purpose |
|-----------|---------|
| `lib/env.ts` | DevEco path resolution, build environment setup |
| `lib/session-cwd.ts` | In-memory map `sessionID → directory` for the active Harmony project root after `switch_cwd` |
| `lib/harmony_napi.ts` | Native addon bindings for HarmonyOS device interaction |
| `lib/emulator_tools.json` | Emulator tool schema definitions (check_ets_files, build_project, start_app, verify_ui, etc.) |
| `lib/mcp-bridge.d.ts` | Type declarations for `@deveco-codegenie/mcp-bridge` native module |

## Effect Framework Adaptation

All tools use the Effect-based `Tool.define()` format:

```typescript
import * as Tool from "./tool"

export const ToolName = Tool.define("tool_id", Effect.gen(function* () {
  // Optional: capture services in closure
  const auth = yield* Auth.Service

  return {
    description: DESCRIPTION,
    parameters: z.object({ ... }),
    execute: (args: z.infer<typeof Parameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        // Effect-based execution
        const result = yield* Effect.tryPromise(() => someAsyncOp())
        return { title, output, metadata }
      }).pipe(Effect.orDie),  // Convert typed errors to defects for never error channel
  }
}))
```

### Key Differences from codegenie-old (async/await)

| Aspect | codegenie-old | codegenie-cli |
|--------|---------------|---------------|
| Import | `import { Tool } from "./tool"` | `import * as Tool from "./tool"` |
| Init | `async () => ({ ... })` | `Effect.gen(function* () { return { ... } })` |
| Execute | `async execute(args, ctx)` | `execute: (args, ctx) => Effect.gen(...).pipe(Effect.orDie)` |
| Ask | `await ctx.ask(...)` | `yield* ctx.ask(...)` |
| Auth | `await Auth.get("codegenie")` | `yield* Auth.Service` (captured in init closure) |
| Errors | `throw new Error(...)` | `throw new Error(...)` (works in Effect.gen) |
| Error channel | `Error` | `never` (use `Effect.orDie` to convert) |

## `switch_cwd` and NAPI project path

- **Validation (application root, relaxed):** the target directory must either contain `AppScope/app.json5`, or contain both `build-profile.json5` and `oh-package.json5` / `oh-package.json`.
- **`setSessionCwd`:** stores the chosen directory for `ctx.sessionID` so plugin tools resolve `worktree` consistently.
- **`ensureInitialized`:** exported from `lib/harmony_napi.ts`. Calling it after a successful switch re-runs `bridge.init` when the worktree path changes.

## Dependencies

- `zod` - Schema validation for tool parameters
- `effect` - Effect-TS framework
- `@/auth` - Auth.Service for `oh_knowledge` OAuth token

## Registration

Tools are registered in `packages/opencode/src/tool/registry.ts`:

```typescript
import { PlanExitTool, PlanWriteTool, PlanEnterTool } from "./plan"
import { HdcLogTool } from "./hdc_log"
import { JscrashReportTool } from "./jscrash_report"
import { SwitchCwdTool } from "./switch-cwd"
import { OhKnowledgeTool } from "./oh_knowledge"
import { Auth } from "@/auth"
```

The registry layer requires `Auth.Service` for `oh_knowledge`:

```typescript
export const layer: Layer.Layer<Service, never, ... | Auth.Service> = ...
export const defaultLayer = layer.pipe(
  ...,
  Layer.provide(Auth.defaultLayer),
  ...
)
```

## Migration History

- **2026-03-30**: Initial migration from codegenie-old to codegenie-cli `packages/opencode/src/tool/`
- **2026-04-22**: HarmonyOS tools (hdc_log, jscrash_report, oh_knowledge, switch_cwd) migrated with Effect adaptation
- **2026-04-22**: Plan tools (plan_enter, plan_write, plan_exit) migrated with Effect adaptation
- **2026-04-22**: lib/ utilities (env.ts, session-cwd.ts, harmony_napi.ts) copied
