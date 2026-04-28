# 功能设计说明书: HarmonyOS 工具迁移

**功能分支**: `002-harmonyos-tools`
**创建日期**: 2026-04-22
**状态**: 已实现
**关联需求文档**: [requirements-analysis.md](requirements-analysis.md)

---

## 1. 功能概述

### 1.1 功能简介

将 codegenie-old 中的 HarmonyOS/Plan 工具迁移到 codegenie-cli，核心工作是 async/await → Effect-TS 框架适配。2026-04-28 后，全局 `jscrash_report` 工具被删除，崩溃分析能力下沉到 `arkts-runtime-fix` 私有脚本。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 保留通用工具能力；专用崩溃分析转入对应 Skill 私有 workflow | 当前保留工具正常工作，tool registry 不再包含 `jscrash_report` |
| 质量目标 | 类型安全，tsc --noEmit 零新增错误 | 类型检查通过 |
| 架构目标 | 遵循 codegenie-cli 现有 Tool 模式 | 代码风格与内置工具一致 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| 框架一致 | 所有工具统一使用 Effect.gen + Effect.orDie 模式 | 工具 execute 函数 |
| 闭包捕获服务 | 在 init 阶段 yield* 捕获 Effect Service，execute 闭包使用 | oh_knowledge 的 Auth.Service |
| 纯工具直接复制 | 无 Effect 依赖的纯函数库直接复制 | lib/env.ts、lib/session-cwd.ts |

---

## 2. 实现思路

### 2.1 整体方案

迁移分为三类处理：

1. **纯工具函数**（直接复制）：`lib/env.ts`、`lib/session-cwd.ts`、`lib/mcp-bridge.d.ts`、`lib/emulator_tools.json`
2. **Effect 适配工具**（重写 execute）：`hdc_log`、`oh_knowledge`、`switch_cwd`、`plan_write`、`plan_enter`
3. **注册与依赖**（修改）：`registry.ts` 添加工具注册 + `Auth.Service` Layer

### 2.2 技术架构

```
Tool.define("id", Effect.gen(function* () {
  // Phase 1: init — 捕获 Effect Services
  const auth = yield* Auth.Service    // oh_knowledge 需要
  const session = yield* Session.Service  // plan 工具需要
  const question = yield* Question.Service
  const provider = yield* Provider.Service

  return {
    description: DESCRIPTION,         // from .txt file
    parameters: Parameters,           // Effect Schema
    execute: (args, ctx) =>
      Effect.gen(function* () {
        // Phase 2: execute — 业务逻辑
        const result = yield* Effect.tryPromise(() => asyncOp())
        return { title, output, metadata }
      }).pipe(Effect.orDie),          // 确保 never 错误通道
  }
}))
```

### 2.3 核心流程

```
codegenie-old 工具
       │
       ▼
  分析依赖关系
  ┌────┼────────────┐
  ▼    ▼            ▼
纯函数  Effect适配   注册
直接   重写execute   +Layer
复制   +orDie        依赖
  │      │            │
  ▼      ▼            ▼
lib/   tool/*.ts   registry.ts
       plan.ts     +Auth.defaultLayer
                   +test fixes
```

---

## 3. 接口设计

### 3.1 工具定义规范

```typescript
// 导入规范
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import DESCRIPTION from "./tool-name.txt"

// 参数定义（独立 const 以支持类型推导）
const Parameters = Schema.Struct({ ... })

// 工具定义
export const ToolName = Tool.define("tool_id", Effect.gen(function* () {
  // 可选：捕获 Service
  return {
    description: DESCRIPTION,
    parameters: Parameters,
    execute: (args: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        // 业务逻辑
        return { title, output, metadata }
      }).pipe(Effect.orDie),
  }
}))
```

### 3.2 工具注册规范

```typescript
// registry.ts
import { ToolName } from "./tool-name"

// 1. yield 工具 Effect
const toolname = yield* ToolName

// 2. Tool.init 初始化
const tool = yield* Effect.all({
  toolname: Tool.init(toolname),
  ...
})

// 3. 添加到 builtin 数组
builtin: [
  ...,
  tool.toolname,
]
```

### 3.3 Layer 依赖规范

当工具 init 需要 Service 时，registry Layer 类型需添加该 Service：

```typescript
export const layer: Layer.Layer<Service, never, ... | Auth.Service> = ...
export const defaultLayer = layer.pipe(
  ...,
  Layer.provide(Auth.defaultLayer),
  ...
)
```

---

## 4. 工具详细设计

### 4.1 hdc_log

| 项目 | 设计 |
|------|------|
| 工具 ID | `hdc_log` |
| 参数 | `action: Schema.Literals(["collect","clear","list_devices"])`, `device_id?: string`, `log_prefix: string`（默认 `"[VCODER_DEBUG]"`）, `lines: number`（1–5000，默认 2000） |
| 依赖 | `lib/env.ts`（findDevEcoHome, hdcPath） |
| Effect 模式 | `Effect.tryPromise(() => findDevEcoHome())` + `Effect.tryPromise(() => Bun.file(hdc).exists())` |
| 错误处理 | DevEco 未找到 → throw Error；hdc 命令失败 → throw Error |

### 4.2 jscrash_report（已下沉）

| 项目 | 设计 |
|------|------|
| 工具 ID | 不再注册全局工具 |
| 入口 | `packages/opencode/resources/skills/arkts-runtime-fix/scripts/jscrash-report.mjs` |
| 参数 | `--log-text`、`--log-file`、`--bundle-name`、`--process-hint`、`--device-id`、`--lines`、`--include-text` |
| 依赖 | Node 标准库；需要设备日志时由私有脚本自行查找 DevEco/hdc |
| 核心逻辑 | 作为 `arkts-runtime-fix` 私有 workflow 解析文本/文件日志，或自动采集 hilog 后解析 |
| 特殊点 | 不再扩大公共工具面；只在 runtime-fix Skill 指令中被调用 |

### 4.3 oh_knowledge

| 项目 | 设计 |
|------|------|
| 工具 ID | `arkts_knowledge_search` |
| 参数 | `question: string` |
| 依赖 | `Auth.Service`（OAuth token） |
| Service 捕获 | init 阶段 `const auth = yield* Auth.Service` |
| API 调用 | `Effect.tryPromise(() => fetch(BASE_URL, ...))` |
| 认证流程 | `auth.get("codegenie")` → 检查 type === "oauth" → 使用 access token |

### 4.4 switch_cwd

| 项目 | 设计 |
|------|------|
| 工具 ID | `switch_cwd` |
| 参数 | `project_path: string` |
| 依赖 | `Instance`（directory）、`external-directory`（assertExternalDirectory） |
| 路径解析 | 相对路径基于 `Instance.directory` |
| Harmony 校验 | 检查 AppScope/app.json5 或 build-profile.json5 + oh-package.json5 |

### 4.5 plan_enter

| 项目 | 设计 |
|------|------|
| 工具 ID | `plan_enter` |
| 参数 | 无 |
| Service 捕获 | `Session.Service`、`Question.Service`、`Provider.Service` |
| 流程 | question.ask 确认 → 创建 plan agent user message → updatePart |

### 4.6 plan_write

| 项目 | 设计 |
|------|------|
| 工具 ID | `plan_write` |
| 参数 | `content: string`（计划文件完整内容） |
| Service 捕获 | `Session.Service` |
| 流程 | session.get → Session.plan → mkdir + writeFile |

---

## 5. 文件清单

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `src/tool/hdc_log.ts` | 新增 | Effect 重写 |
| `src/tool/oh_knowledge.ts` | 新增 | Effect 重写 + Auth |
| `src/tool/switch-cwd.ts` | 新增 | Effect 重写 |
| `src/tool/plan.ts` | 修改 | 添加 PlanWriteTool + PlanEnterTool |
| `src/tool/plan-write.txt` | 新增 | 描述文件 |
| `src/tool/hdc-log.txt` | 新增 | 描述文件 |
| `src/tool/switch-cwd.txt` | 新增 | 描述文件 |
| `src/tool/lib/env.ts` | 新增 | 直接复制 |
| `src/tool/lib/session-cwd.ts` | 新增 | 直接复制 |
| `src/tool/lib/harmony_napi.ts` | 新增 | 直接复制 |
| `src/tool/lib/mcp-bridge.d.ts` | 新增 | 直接复制 |
| `src/tool/lib/emulator_tools.json` | 新增 | 直接复制 |
| `src/tool/registry.ts` | 修改 | 注册 + Auth.Service |
| `test/session/prompt-effect.test.ts` | 修改 | Auth.defaultLayer |
| `test/session/snapshot-tool-race.test.ts` | 修改 | Auth.defaultLayer |
| `specs/harmonyos/tools-migration.md` | 新增 | 迁移文档 |

---

## 附录

### A. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-22 | zhangyuchen | 初始版本 |
| 1.1 | 2026-04-28 | Codex | 同步删除全局 `jscrash_report`，崩溃分析改由 runtime-fix 私有脚本提供 |
