# 任务分解: AI模型排队轮询机制

**功能分支**: `queue-polling`
**创建日期**: 2026-04-29
**状态**: 草稿
**关联设计文档**: [02-functional-design.md](02-functional-design.md)

---

## 1. 任务概览

| 阶段 | 任务编号 | 任务名称 | 优先级 | 预估工时 | 依赖 |
|------|----------|----------|--------|----------|------|
| Phase 1 | T-001 | QueueError Schema定义 | P1 | 0.5h | - |
| Phase 1 | T-002 | parseAPICallError扩展 | P1 | 0.5h | T-001 |
| Phase 1 | T-003 | queueDelay函数实现 | P1 | 0.5h | - |
| Phase 1 | T-004 | queueable检测函数 | P1 | 0.5h | T-001 |
| Phase 1 | T-005 | queuePolicy实现 | P1 | 1h | T-003,T-004 |
| Phase 1 | T-006 | ExitQueue Service | P1 | 1h | - |
| Phase 1 | T-007 | Status类型扩展 | P1 | 0.5h | - |
| Phase 2 | T-008 | processor.ts集成 | P1 | 2h | T-005,T-006,T-007 |
| Phase 2 | T-009 | 中断处理集成 | P1 | 1h | T-006,T-008 |
| Phase 2 | T-010 | 排队结束清理 | P1 | 0.5h | T-008,T-009 |
| Phase 3 | T-011 | QueuePart显示组件 | P2 | 1h | T-008 |
| Phase 3 | T-012 | TUI聊天区域渲染 | P2 | 1h | T-011 |
| Verify | T-013 | 类型检查验证 | P1 | 0.5h | T-001~T-012 |
| Verify | T-014 | 集成测试 | P2 | 1h | T-001~T-012 |

---

## 2. 详细任务说明

### Phase 1: Foundation（基础层）

#### T-001: QueueError Schema定义

**目标**: 在message-v2.ts中新增QueueError named schema

**文件**: `packages/opencode/src/session/message-v2.ts`

**实现内容**:
```typescript
export const QueueError = namedSchemaError("QueueError", {
  position: Schema.Number,
  message: Schema.String,
  responseBody: Schema.optional(Schema.String),
})
export type QueueError = z.infer<typeof QueueError.Schema>
```

**验证标准**:
- [ ] typecheck无错误
- [ ] QueueError.Schema可正常实例化
- [ ] QueueError.isInstance可正确识别实例

---

#### T-002: parseAPICallError扩展

**目标**: 在provider/error.ts中扩展406排队错误识别

**文件**: `packages/opencode/src/provider/error.ts`

**实现内容**:
1. 扩展ParsedAPICallError类型，新增queue类型
2. 在parseAPICallError函数中添加406检测逻辑
3. 新增extractQueuePosition辅助函数

**验证标准**:
- [ ] statusCode=406 + body.error.type="WaitingInLine" 返回queue类型
- [ ] position正确解析"第123位"格式
- [ ] 非排队错误仍返回原有类型

---

#### T-003: queueDelay函数实现

**目标**: 在retry.ts中实现固定步长延迟函数

**文件**: `packages/opencode/src/session/retry.ts`

**实现内容**:
```typescript
export const QUEUE_DELAY_BASE = 2000
export const QUEUE_DELAY_STEP = 2000
export const QUEUE_DELAY_MAX = 10000

export function queueDelay(attempt: number): number {
  return Math.min(QUEUE_DELAY_BASE + QUEUE_DELAY_STEP * (attempt - 1), QUEUE_DELAY_MAX)
}
```

**验证标准**:
- [ ] queueDelay(1) = 2000
- [ ] queueDelay(2) = 4000
- [ ] queueDelay(3) = 6000
- [ ] queueDelay(4) = 8000
- [ ] queueDelay(5) = 10000
- [ ] queueDelay(6) = 10000（已达到上限）

---

#### T-004: queueable检测函数

**目标**: 在retry.ts中实现排队错误检测函数

**文件**: `packages/opencode/src/session/retry.ts`

**实现内容**:
```typescript
export function queueable(error: Err): { position: number; message: string } | undefined {
  if (MessageV2.QueueError.isInstance(error)) {
    return {
      position: error.data.position,
      message: error.data.message,
    }
  }
  return undefined
}
```

**验证标准**:
- [ ] QueueError实例返回{position, message}
- [ ] 非QueueError返回undefined

---

#### T-005: queuePolicy实现

**目标**: 在retry.ts中实现排队专用retry policy

**文件**: `packages/opencode/src/session/retry.ts`

**实现内容**:
```typescript
export function queuePolicy(opts: {
  parse: (error: unknown) => Err
  set: (input: { attempt: number; position: number; message: string; next: number }) => Effect.Effect<void>
  onQueueUpdate?: (position: number) => Effect.Effect<void>
}) {
  return Schedule.fromStepWithMetadata(
    Effect.succeed((meta: Schedule.InputMetadata<unknown>) => {
      const error = opts.parse(meta.input)
      const queueInfo = queueable(error)
      if (!queueInfo) return Cause.done(meta.attempt)
      
      return Effect.gen(function* () {
        const wait = queueDelay(meta.attempt)
        const now = yield* Clock.currentTimeMillis
        yield* opts.set({
          attempt: meta.attempt,
          position: queueInfo.position,
          message: queueInfo.message,
          next: now + wait,
        })
        if (opts.onQueueUpdate) {
          yield* opts.onQueueUpdate(queueInfo.position)
        }
        return [meta.attempt, Duration.millis(wait)]
      })
    }),
  )
}
```

**验证标准**:
- [ ] 非排队错误返回Cause.done，终止retry
- [ ] 排队错误返回正确的delay和set调用
- [ ] onQueueUpdate可选回调正确触发

---

#### T-006: ExitQueue Service

**目标**: 新增退出排队服务

**文件**: `packages/opencode/src/session/exit-queue.ts`（新建）

**实现内容**:
```typescript
import { Context, Layer, Effect } from "effect"
import { Config } from "@/config"

export interface Interface {
  readonly exit: (sessionID: string, modelId: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/ExitQueue") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const config = yield* Config.Service
    
    const exit: Interface["exit"] = Effect.fn("ExitQueue.exit")(function* (
      sessionID: string,
      modelId: string,
    ) {
      const cfg = yield* config.get()
      const baseURL = cfg.provider?.["opencode"]?.options?.baseURL ?? "https://opencode.ai"
      const url = `${baseURL}/sse/codeGenie/exitSessionQueue`
      
      yield* Effect.tryPromise({
        try: () => fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "sessionId": sessionID,
          },
          body: JSON.stringify({ modelId }),
        }),
        catch: () => undefined,
      }).pipe(
        Effect.timeout("5 seconds"),
        Effect.ignore,
      )
    })
    
    return Service.of({ exit })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(Config.defaultLayer))
export * as ExitQueue from "./exit-queue"
```

**验证标准**:
- [ ] 正确构造请求URL和headers
- [ ] 非阻塞执行，失败静默
- [ ] 5秒超时保护

---

#### T-007: Status类型扩展

**目标**: 扩展session status类型，新增queue状态

**文件**: `packages/opencode/src/session/status.ts`

**实现内容**:
```typescript
// 扩展Info union
Schema.Struct({
  type: Schema.Literal("queue"),
  position: Schema.Number,
  message: Schema.String,
  attempt: Schema.Number,
  next: Schema.Number,
})
```

**验证标准**:
- [ ] status.set可接受queue类型
- [ ] queue状态可被正确序列化

---

### Phase 2: Integration（集成层）

#### T-008: processor.ts集成

**目标**: 在processor中集成排队retry流程

**文件**: `packages/opencode/src/session/processor.ts`

**实现内容**:
1. 在process函数中新增queuePolicy retry
2. 处理queue状态更新和Part创建
3. 正确处理双重retry（queue → standard）

**验证标准**:
- [ ] 排队错误触发queuePolicy
- [ ] 非排队错误走标准policy
- [ ] 排队成功后继续响应

---

#### T-009: 中断处理集成

**目标**: 在processor.ts现有Effect.onInterrupt中添加排队退出逻辑和QueuePart移除

**文件**: `packages/opencode/src/session/processor.ts`

**关键设计**: 复用现有Ctrl+C中断入口，不新增用户入口；取消后移除排队提示

**实现内容**:
```typescript
// 在现有onInterrupt回调中扩展排队退出逻辑
Effect.onInterrupt(() =>
  Effect.gen(function* () {
    aborted = true
    
    // NEW: 如果处于排队状态，调用退出API并移除排队提示
    if (ctx.queueActive && ctx.model?.id) {
      // 1. 调用退出排队API
      yield* ExitQueue.exit(ctx.sessionID, ctx.model.id)
        .pipe(Effect.forkIn(scope), Effect.ignore)
      
      // 2. 移除QueuePart（排队提示消失）
      if (ctx.queuePartID) {
        yield* session.removePart({
          sessionID: ctx.sessionID,
          messageID: ctx.assistantMessage.id,
          partID: ctx.queuePartID,
        })
        ctx.queuePartID = undefined
      }
      
      ctx.queueActive = false
    }
    
    // ... 现有halt逻辑继续执行
    if (!ctx.assistantMessage.error) {
      yield* halt(new DOMException("Aborted", "AbortError"))
    }
  }),
)
```

**验证标准**:
- [ ] Ctrl+C触发现有中断流程，排队退出逻辑正确执行
- [ ] 退出API非阻塞执行
- [ ] 失败不影响取消体验
- [ ] 不新增任何用户交互入口
- [ ] 取消后QueuePart被移除，聊天区域不再显示排队提示

---

#### T-010: 排队结束清理

**目标**: 在processor.ts中实现排队成功后移除QueuePart

**文件**: `packages/opencode/src/session/processor.ts`

**关键设计**: 排队成功后移除排队提示，聊天区域正常响应

**实现内容**:
```typescript
// 在process函数返回前，清理排队状态
// 排队成功后移除QueuePart
if (ctx.queuePartID) {
  yield* session.removePart({
    sessionID: ctx.sessionID,
    messageID: ctx.assistantMessage.id,
    partID: ctx.queuePartID,
  })
  ctx.queueActive = false
  ctx.queuePartID = undefined
}
```

---

### Phase 3: UI（显示层）

#### T-011: QueuePart显示组件

**目标**: 在message-v2.ts中新增QueuePart类型

**文件**: `packages/opencode/src/session/message-v2.ts`

**实现内容**:
```typescript
export const QueuePart = Schema.Struct({
  ...partBase,
  type: Schema.Literal("queue"),
  position: Schema.Number,
  message: Schema.String,
  time: Schema.Struct({
    start: Schema.Number,
    end: Schema.optional(Schema.Number),
  }),
})
```

**验证标准**:
- [ ] QueuePart可被正确创建
- [ ] Part union包含queue类型

---

#### T-012: TUI聊天区域渲染

**目标**: 在TUI聊天组件中渲染排队状态

**文件**: `packages/opencode/src/cli/cmd/tui/routes/session/chat.tsx`（推测路径）

**实现内容**:
```tsx
// 新增QueuePart渲染
{part.type === "queue" && (
  <box flexDirection="row" gap={1}>
    <text fg={theme.info}>ℹ</text>
    <text fg={theme.text}>
      当前模型访问量较高，您目前排在第{part.position}位，
      请耐心等待或处理其他任务
    </text>
  </box>
)}
```

**验证标准**:
- [ ] ℹ图标显示正确（info颜色）
- [ ] 排队位置动态更新
- [ ] 中文提示文案完整显示

---

### Verify: Verification（验证层）

#### T-013: 类型检查验证

**命令**: `cd packages/opencode && bun run typecheck`

**验证标准**:
- [ ] 无新增类型错误
- [ ] 无unused import警告

---

#### T-014: 集成测试

**目标**: 验证完整排队流程（含排队提示移除）

**测试场景**:
1. Mock后端返回406排队错误
2. 验证CLI显示排队提示
3. 模拟轮询成功 → 验证排队提示消失
4. 模拟用户取消 → 验证排队提示消失

**验证标准**:
- [ ] 排队检测正确
- [ ] 轮询延迟正确（2→4→6→8→10→10）
- [ ] 显示更新正确
- [ ] 排队成功后QueuePart移除
- [ ] 取消后QueuePart移除

---

## 3. 任务依赖图

```
T-001 QueueError Schema
  ├── T-002 parseAPICallError扩展
  ├── T-004 queueable检测函数
  │     └── T-005 queuePolicy实现
  │           └── T-008 processor集成
  │                 ├── T-009 中断处理
  │                 ├── T-010 QueuePart组件
  │                 │     └── T-011 TUI渲染
  │                 └── T-012 类型检查
  │                 └── T-013 集成测试

T-003 queueDelay函数
  └── T-005 queuePolicy实现

T-006 ExitQueue Service
  └── T-009 中断处理

T-007 Status类型扩展
  └── T-008 processor集成
```

---

## 4. 并行执行策略

### Wave 1（可并行）:
- T-001 QueueError Schema
- T-003 queueDelay函数
- T-006 ExitQueue Service
- T-007 Status类型扩展

### Wave 2（依赖Wave 1）:
- T-002 parseAPICallError扩展（依赖T-001）
- T-004 queueable检测函数（依赖T-001）
- T-005 queuePolicy实现（依赖T-003、T-004）

### Wave 3（依赖Wave 2）:
- T-008 processor集成（依赖T-005、T-006、T-007）
- T-010 QueuePart组件（依赖T-008）

### Wave 4（依赖Wave 3）:
- T-009 中断处理（依赖T-006、T-008）
- T-011 TUI渲染（依赖T-010）

### Wave 5（依赖Wave 4）:
- T-012 类型检查
- T-013 集成测试

---

## 5. 技能配置

| 任务编号 | 建议Category | 建议Skills |
|----------|--------------|------------|
| T-001~T-007 | quick | [effect] |
| T-008~T-009 | unspecified-high | [effect] |
| T-010~T-011 | visual-engineering | [frontend-ui-ux] |
| T-012 | quick | [] |
| T-013 | unspecified-low | [] |

---

## 附录

### A. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.1 | 2026-04-29 | - | 更正T-009：复用现有Ctrl+C中断入口，不新增用户入口 |
| 1.0 | 2026-04-29 | - | 初始版本 |