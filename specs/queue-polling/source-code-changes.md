# AI模型排队轮询机制 - 源码修改清单

**功能分支**: `queue-polling`
**创建日期**: 2026-04-29
**状态**: 已实现 ✅

---

## 1. 修改概览

| 文件 | 修改类型 | 行数估计 | 说明 |
|------|----------|----------|------|
| `packages/opencode/src/provider/error.ts` | 修改 | +35 | 扩展parseAPICallError，新增queue类型和位置解析 |
| `packages/opencode/src/session/message-v2.ts` | 修改 | +30 | 新增QueueError Schema和QueuePart类型，扩展Part和AssistantErrorZod |
| `packages/opencode/src/session/retry.ts` | 修改 | +50 | 新增QUEUE_DELAY常量、queueDelay、queueable、queuePolicy |
| `packages/opencode/src/session/status.ts` | 修改 | +10 | 扩展Info union，新增queue状态 |
| `packages/opencode/src/session/exit-queue.ts` | 新增 | +100 | ExitQueue Service实现 |
| `packages/opencode/src/session/processor.ts` | 修改 | +70 | 集成排队retry、中断处理、QueuePart管理 |
| `packages/sdk/openapi.json` | 修改 | +80 | 新增QueueError、QueuePart、扩展SessionStatus和AssistantMessage |
| TUI聊天渲染组件 | 修改 | +30 | QueuePart渲染、PART_MAPPING更新 |

**总计**: 新增1个文件 + 修改8个文件 + ~400行代码

---

## 2. 新增文件说明

### 2.1 `src/session/exit-queue.ts`

**用途**: 退出排队API服务

**关键实现**:
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
            "sessionId": sessionID,  // 精确使用sessionId header
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

**设计要点**:
- Header使用精确的`sessionId`（而非`x-codegenie-session`）
- 非阻塞调用，失败静默
- 5秒超时保护
- baseURL从config获取

---

## 3. 详细修改说明

### 3.1 `src/provider/error.ts`

#### 3.1.1 扩展ParsedAPICallError类型（约第164行）

```typescript
// 修改前
export type ParsedAPICallError =
  | { type: "context_overflow"; message: string; responseBody?: string }
  | { type: "api_error"; message: string; statusCode?: number; isRetryable: boolean; ... }

// 修改后
export type ParsedAPICallError =
  | { type: "context_overflow"; message: string; responseBody?: string }
  | { type: "api_error"; message: string; statusCode?: number; isRetryable: boolean; ... }
  | { type: "queue"; position: number; message: string; responseBody?: string }  // NEW
```

#### 3.1.2 新增extractQueuePosition函数（文件末尾）

```typescript
/**
 * 从排队消息中提取位置数字
 * @param message - 如 "排在第123位" 或 "第123位"
 * @returns 排队位置数字，无法解析时返回0
 */
function extractQueuePosition(message: string): number {
  const match = message.match(/第(\d+)位/)
  if (match) return parseInt(match[1], 10)
  return 0
}
```

#### 3.1.3 扩展parseAPICallError函数（约第180行）

```typescript
// 在现有overflow检测后，新增排队检测
export function parseAPICallError(input: { providerID: ProviderID; error: APICallError }): ParsedAPICallError {
  const m = message(input.providerID, input.error)
  const body = json(input.error.responseBody)
  
  // 新增排队检测（在overflow检测后）
  if (input.error.statusCode === 406) {
    if (body?.error?.type === "WaitingInLine") {
      const position = extractQueuePosition(body.error.message || "")
      return {
        type: "queue",
        position,
        message: body.error.message || m,
        responseBody: input.error.responseBody,
      }
    }
  }
  
  // ... 现有逻辑
}
```

---

### 3.2 `src/session/message-v2.ts`

#### 3.2.1 新增QueueError Schema（约第50行，在APIError后）

```typescript
// 在APIError定义后添加
export const QueueError = namedSchemaError("QueueError", {
  position: Schema.Number,
  message: Schema.String,
  responseBody: Schema.optional(Schema.String),
})
export type QueueError = z.infer<typeof QueueError.Schema>
```

#### 3.2.2 扩展fromError函数（约第XX行）

```typescript
// 在fromError函数中添加QueueError处理分支
export function fromError(e: unknown, opts: { providerID: ProviderID; aborted: boolean }): Err {
  // ... 现有处理
  
  // 新增：QueueError处理
  if (e instanceof APICallError && e.statusCode === 406) {
    const parsed = ProviderError.parseAPICallError({ providerID: opts.providerID, error: e })
    if (parsed.type === "queue") {
      return new QueueError({
        position: parsed.position,
        message: parsed.message,
        responseBody: parsed.responseBody,
      })
    }
  }
  
  // ... 现有返回
}
```

#### 3.2.3 新增QueuePart类型（约第80行，在Part定义区域）

```typescript
// 在现有Part类型后添加
export const QueuePart = Schema.Struct({
  ...partBase,  // id, sessionID, messageID
  type: Schema.Literal("queue"),
  position: Schema.Number,
  message: Schema.String,
  time: Schema.Struct({
    start: Schema.Number,
    end: Schema.optional(Schema.Number),
  }),
})
  .annotate({ identifier: "QueuePart" })
  .pipe(withStatics((s) => ({ zod: zod(s) })))
export type QueuePart = Types.DeepMutable<Schema.Schema.Type<typeof QueuePart>>
```

#### 3.2.4 扩展Part Union（约第XXX行）

```typescript
// 找到Part union定义，添加QueuePart
export const Part = Schema.Union([
  TextPart,
  ReasoningPart,
  FilePart,
  AgentPart,
  ToolPart,
  SnapshotPart,
  PatchPart,
  QueuePart,  // NEW
]).pipe(Schema.toTaggedUnion("type"))
```

---

### 3.3 `src/session/retry.ts`

#### 3.3.1 新增常量（文件开头，现有常量后）

```typescript
// 在现有RETRY_*常量后添加
export const QUEUE_DELAY_BASE = 2000    // 2秒
export const QUEUE_DELAY_STEP = 2000    // 每次+2秒
export const QUEUE_DELAY_MAX = 10000    // 最大10秒
```

#### 3.3.2 新增queueDelay函数（约第52行，delay函数后）

```typescript
/**
 * 排队轮询延迟计算（固定步长）
 * 延迟序列：2→4→6→8→10→10→10...
 */
export function queueDelay(attempt: number): number {
  return Math.min(QUEUE_DELAY_BASE + QUEUE_DELAY_STEP * (attempt - 1), QUEUE_DELAY_MAX)
}
```

#### 3.3.3 新增queueable函数（约第104行，retryable函数后）

```typescript
/**
 * 检测是否为排队错误
 * @returns 排队信息（position, message）或undefined（非排队错误）
 */
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

#### 3.3.4 扩展retryable函数（约第54行）

```typescript
export function retryable(error: Err) {
  // 新增：排队错误不走标准retry
  if (MessageV2.QueueError.isInstance(error)) return undefined
  
  // ... 现有逻辑
}
```

#### 3.3.5 新增queuePolicy函数（文件末尾）

```typescript
/**
 * 排队专用retry policy
 * 与标准policy的区别：
 * - 固定步长延迟而非指数退避
 * - 每次重试更新排队位置
 * - 只有QueueError才触发retry
 */
export function queuePolicy(opts: {
  parse: (error: unknown) => Err
  set: (input: { attempt: number; position: number; message: string; next: number }) => Effect.Effect<void>
  onQueueUpdate?: (position: number) => Effect.Effect<void>
}) {
  return Schedule.fromStepWithMetadata(
    Effect.succeed((meta: Schedule.InputMetadata<unknown>) => {
      const error = opts.parse(meta.input)
      const queueInfo = queueable(error)
      if (!queueInfo) return Cause.done(meta.attempt)  // 非排队错误，终止
      
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
        
        return [meta.attempt, Duration.millis(wait)] as [number, Duration.Duration]
      })
    }),
  )
}
```

---

### 3.4 `src/session/status.ts`

#### 3.4.1 扩展Info Schema（约第XX行）

```typescript
// 找到Info union定义，添加queue状态
const Info = Schema.Union([
  Schema.Struct({ type: Schema.Literal("idle") }),
  Schema.Struct({ type: Schema.Literal("busy") }),
  Schema.Struct({
    type: Schema.Literal("retry"),
    attempt: Schema.Number,
    message: Schema.String,
    next: Schema.Number,
  }),
  Schema.Struct({
    type: Schema.Literal("queue"),
    position: Schema.Number,
    message: Schema.String,
    attempt: Schema.Number,
    next: Schema.Number,
  }),  // NEW
])
```

---

### 3.5 `src/session/processor.ts`

#### 3.5.1 新增import（文件开头）

```typescript
import { ExitQueue } from "./exit-queue"
```

#### 3.5.2 新增ExitQueue layer依赖（约第80行，Layer定义）

```typescript
// 在现有Layer依赖列表中添加
export const layer: Layer.Layer<
  Service,
  never,
  | Session.Service
  | Config.Service
  // ... 现有依赖
  | ExitQueue.Service  // NEW
> = Layer.effect(...)
```

#### 3.5.3 新增ExitQueue Service获取（约第95行，Effect.gen内）

```typescript
// 在现有service获取后添加
const exitQueue = yield* ExitQueue.Service
```

#### 3.5.4 新增queuePartID context字段（约第66行，ProcessorContext）

```typescript
interface ProcessorContext extends Input {
  // ... 现有字段
  queuePartID: PartID | undefined  // NEW: 排队状态Part ID
  queueActive: boolean             // NEW: 是否处于排队状态
}
```

#### 3.5.5 扩展process函数（约第539行）

**关键设计**: 排队退出逻辑集成到现有Effect.onInterrupt中，复用Ctrl+C中断入口，不新增用户入口

```typescript
const process = Effect.fn("SessionProcessor.process")(function* (streamInput: LLM.StreamInput) {
  // ... 现有逻辑
  
  // 新增：初始化排队状态
  ctx.queuePartID = undefined
  ctx.queueActive = false
  
  return yield* Effect.gen(function* () {
    yield* Effect.gen(function* () {
      // ... 现有stream处理
    }).pipe(
      // 现有onInterrupt，扩展退出排队逻辑（复用现有中断入口）
      Effect.onInterrupt(() =>
        Effect.gen(function* () {
          aborted = true
          
          // NEW: 如果处于排队状态，调用退出API并移除排队提示
          // 设计要点：复用现有Ctrl+C中断入口，不新增用户交互
          if (ctx.queueActive && ctx.model?.id) {
            // 1. 调用退出排队API
            yield* exitQueue.exit(ctx.sessionID, ctx.model.id)
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
          
          // 现有halt逻辑继续执行
          if (!ctx.assistantMessage.error) {
            yield* halt(new DOMException("Aborted", "AbortError"))
          }
        }),
      ),
      
      // ... 现有catchCauseIf
      
      // NEW: 新增queuePolicy retry（在标准retry前）
      Effect.retry(
        SessionRetry.queuePolicy({
          parse,
          set: (info) =>
            Effect.gen(function* () {
              ctx.queueActive = true
              
              // 创建或更新排队Part
              if (!ctx.queuePartID) {
                ctx.queuePartID = PartID.ascending()
              }
              
              yield* session.updatePart({
                id: ctx.queuePartID,
                messageID: ctx.assistantMessage.id,
                sessionID: ctx.sessionID,
                type: "queue",
                position: info.position,
                message: `当前模型访问量较高，您目前排在第${info.position}位，请耐心等待或处理其他任务`,
                time: { start: Date.now() },
              })
              
              yield* status.set(ctx.sessionID, {
                type: "queue",
                position: info.position,
                message: info.message,
                attempt: info.attempt,
                next: info.next,
              })
            }),
          onQueueUpdate: (position) =>
            Effect.gen(function* () {
              // 更新Part显示
              if (ctx.queuePartID) {
                yield* session.updatePart({
                  id: ctx.queuePartID,
                  messageID: ctx.assistantMessage.id,
                  sessionID: ctx.sessionID,
                  type: "queue",
                  position,
                  message: `当前模型访问量较高，您目前排在第${position}位，请耐心等待或处理其他任务`,
                  time: { start: Date.now() },
                })
              }
            }),
        }),
      ),
      
      // 现有标准retry（排队policy终止后fallback）
      Effect.retry(
        SessionRetry.policy({
          parse,
          set: (info) =>
            status.set(ctx.sessionID, {
              type: "retry",
              attempt: info.attempt,
              message: info.message,
              next: info.next,
            }),
        }),
      ),
      
      // ... 现有catch和ensuring
    )
    
    // NEW: 排队成功后清理（移除排队提示，恢复正常聊天）
    if (ctx.queuePartID) {
      // 移除QueuePart，聊天区域不再显示排队提示
      yield* session.removePart({
        sessionID: ctx.sessionID,
        messageID: ctx.assistantMessage.id,
        partID: ctx.queuePartID,
      })
      ctx.queueActive = false
      ctx.queuePartID = undefined
    }
    
    // ... 现有返回
  })
})
```

**关键设计**：
- 排队成功后移除QueuePart，聊天区域正常响应
- 取消时也在onInterrupt中移除QueuePart

#### 3.5.6 扩展defaultLayer（文件末尾）

```typescript
export const defaultLayer = Layer.suspend(() =>
  layer.pipe(
    // ... 现有provide
    Layer.provide(ExitQueue.defaultLayer),  // NEW
    Layer.provide(SessionStatus.defaultLayer),
    Layer.provide(Bus.layer),
    Layer.provide(Config.defaultLayer),
  ),
)
```

---

### 3.6 TUI聊天渲染组件

**文件路径**: 需探索确认，可能在 `src/cli/cmd/tui/routes/session/` 下

#### 3.6.1 新增QueuePart渲染

```tsx
// 在消息Part渲染循环中添加
{part.type === "queue" && (
  <box flexDirection="row" gap={1} paddingLeft={1}>
    <text fg={theme.info}>ℹ</text>
    <text fg={theme.text}>
      当前模型访问量较高，您目前排在第{part.position}位，
      请耐心等待或处理其他任务
    </text>
    {part.position > 0 && (
      <text fg={theme.textMuted}>[等待中...]</text>
    )}
  </box>
)}
```

---

## 4. 未修改的文件

| 文件 | 原因 |
|------|------|
| `src/session/schema.ts` | SessionID/PartID类型已有，无需修改 |
| `src/config/provider.ts` | baseURL从现有config获取 |
| `src/session/session.ts` | 不需要新增Session方法 |
| `src/session/prompt.ts` | 排队不涉及prompt |

---

## 5. 验证

### 5.1 类型检查

```bash
cd packages/opencode && bun run typecheck
```

**预期**: 无新增错误

### 5.2 构建验证

```bash
cd packages/opencode && bun run build
```

**预期**: 成功构建

### 5.3 功能验证（手动）

1. 模拟406排队错误响应
2. 验证CLI显示排队提示（ℹ图标 + 排队位置）
3. 验证延迟序列正确（2→4→6→8→10→10秒）
4. 验证Ctrl+C取消触发退出API
5. 验证排队成功后继续响应

---

## 附录

### A. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.1 | 2026-04-29 | - | 更正中断处理：复用现有Ctrl+C中断入口（Effect.onInterrupt），不新增用户入口 |
| 1.0 | 2026-04-29 | - | 初始版本 |