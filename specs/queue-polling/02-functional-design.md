# 功能设计说明书: AI模型排队轮询机制

**功能分支**: `queue-polling`
**创建日期**: 2026-04-29
**状态**: 草稿
**关联需求文档**: [01-requirements-analysis.md](01-requirements-analysis.md)

---

## 1. 功能概述

### 1.1 功能简介

为codegenie-cli的LLM请求流程添加排队轮询机制。当AI后端返回406排队错误时，自动进入排队状态，按固定步长延迟轮询，并在聊天区域显示排队提示，支持用户取消并调用退出排队API。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 排队检测、轮询、显示、取消完整实现 | 所有P1需求通过验收 |
| 质量目标 | 类型检查和构建通过 | typecheck + build 无错误 |
| 兼容目标 | 不破坏现有retry机制 | 标准错误仍走原有流程 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| Effect模式遵循 | 使用Effect.gen/fn/retry/onInterrupt | 所有新增Effect代码 |
| 独立分支设计 | 排队与标准retry是独立分支，不共享policy | retry.ts扩展 |
| 复用现有中断入口 | 使用processor.ts已有的Effect.onInterrupt，不新增用户入口 | 排队退出逻辑集成到现有中断处理 |
| 固定步长延迟 | 使用线性递增而非指数退避 | queueDelay函数 |

---

## 2. 实现思路

### 2.1 整体方案

```
现有流程:
LLM Stream → Error → parseError → retryable() → policy() → Retry → Success

新增排队分支:
LLM Stream → Error → parseError → queueable() → queuePolicy() → Queue Retry → Success
                                                      ↓
                                               onInterrupt → ExitQueue API
```

### 2.2 关键技术点

| 技术点 | 描述 | 解决方案 |
|--------|------|----------|
| 406检测 | 在parseAPICallError中新增排队类型判断 | 检查statusCode=406且body.error.type="WaitingInLine" |
| 位置解析 | 从message中提取"第xxx位" | 正则匹配或indexOf查找 |
| 固定延迟 | 不同于指数退避 | queueDelay函数：min(2000 + 2000*(attempt-1), 10000) |
| 中断处理 | 复用processor.ts现有Effect.onInterrupt | 在现有中断回调中添加排队状态检测和退出API调用 |
| 聊天显示 | 在消息流中显示排队状态 | 新增QueuePart消息类型 |
| 排队结束清理 | 排队成功或取消后移除QueuePart | session.removePart或标记time.end |

### 2.3 Effect-TS适配要点

遵循现有Effect模式：

```typescript
// processor.ts中的retry集成
Effect.retry(
  SessionRetry.policy({
    parse,
    set: (info) => status.set(sessionID, { type: "retry", ... }),
  }),
)

// 新增排队policy（类似结构）
Effect.retry(
  SessionRetry.queuePolicy({
    parse,
    set: (info) => status.set(sessionID, { type: "queue", position, ... }),
    onInterrupt: () => ExitQueue.exit(sessionID, modelId),
  }),
)
```

---

## 3. 实现设计

### 3.1 模块划分

#### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/provider/error.ts` | 修改 | 扩展parseAPICallError返回类型，新增queue类型 |
| `src/session/message-v2.ts` | 修改 | 新增QueueError named schema |
| `src/session/retry.ts` | 修改 | 新增queueable、queueDelay、queuePolicy |
| `src/session/status.ts` | 修改 | 扩展Info union，新增queue状态类型 |
| `src/session/exit-queue.ts` | 新增 | ExitQueue Service实现 |
| `src/session/processor.ts` | 修改 | 集成排队分支逻辑 |
| `src/session/message-v2.sql.ts` | 修改 | 新增QueuePart表定义（可选） |

### 3.2 详细设计

#### 3.2.1 provider/error.ts 扩展

```typescript
// 新增ParsedAPICallError类型
export type ParsedAPICallError =
  | { type: "context_overflow"; message: string; responseBody?: string }
  | { type: "api_error"; message: string; statusCode?: number; isRetryable: boolean; ... }
  | { type: "queue"; position: number; message: string; responseBody?: string }  // NEW

// parseAPICallError扩展
export function parseAPICallError(input: { providerID: ProviderID; error: APICallError }): ParsedAPICallError {
  // ... 现有逻辑
  
  // 新增排队检测
  if (input.error.statusCode === 406) {
    const body = json(input.error.responseBody)
    if (body?.error?.type === "WaitingInLine") {
      const position = extractQueuePosition(body.error.message)
      return {
        type: "queue",
        position,
        message: body.error.message,
        responseBody: input.error.responseBody,
      }
    }
  }
  
  // ... 现有返回
}

// 位置解析辅助函数
function extractQueuePosition(message: string): number {
  // 匹配 "第123位" 或 "排在第123位"
  const match = message.match(/第(\d+)位/)
  if (match) return parseInt(match[1], 10)
  return 0 // 无法解析时返回0
}
```

#### 3.2.2 session/message-v2.ts 扩展

```typescript
// 新增QueueError named schema
export const QueueError = namedSchemaError("QueueError", {
  position: Schema.Number,
  message: Schema.String,
  responseBody: Schema.optional(Schema.String),
})
export type QueueError = z.infer<typeof QueueError.Schema>

// 扩展fromError函数
export function fromError(e: unknown, opts: { providerID, aborted }): Err {
  // ... 现有逻辑
  
  // 新增QueueError处理
  if (e instanceof APICallError && e.statusCode === 406) {
    const parsed = Provider.parseAPICallError({ providerID: opts.providerID, error: e })
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

// 新增QueuePart消息类型（聊天区域显示）
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

#### 3.2.3 session/retry.ts 扩展

```typescript
// 新增常量
export const QUEUE_DELAY_BASE = 2000    // 2秒
export const QUEUE_DELAY_STEP = 2000    // 每次+2秒
export const QUEUE_DELAY_MAX = 10000    // 最大10秒

// 固定步长延迟函数
export function queueDelay(attempt: number): number {
  return Math.min(QUEUE_DELAY_BASE + QUEUE_DELAY_STEP * (attempt - 1), QUEUE_DELAY_MAX)
}

// 排队错误检测函数
export function queueable(error: Err): { position: number; message: string } | undefined {
  if (MessageV2.QueueError.isInstance(error)) {
    return {
      position: error.data.position,
      message: error.data.message,
    }
  }
  return undefined
}

// 排队专用policy
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
        
        // 调用set更新状态（显示排队位置）
        yield* opts.set({
          attempt: meta.attempt,
          position: queueInfo.position,
          message: queueInfo.message,
          next: now + wait,
        })
        
        // 可选：额外更新回调
        if (opts.onQueueUpdate) {
          yield* opts.onQueueUpdate(queueInfo.position)
        }
        
        return [meta.attempt, Duration.millis(wait)] as [number, Duration.Duration]
      })
    }),
  )
}

// 扩展retryable函数（排队不走标准retry）
export function retryable(error: Err) {
  // 排队错误不走标准retry，返回undefined让policy终止
  if (MessageV2.QueueError.isInstance(error)) return undefined
  
  // ... 现有逻辑
}
```

#### 3.2.4 session/status.ts 扩展

```typescript
// 扩展Info union
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

#### 3.2.5 session/exit-queue.ts（新增）

```typescript
import { Context, Layer, Effect, Schema } from "effect"
import { Config } from "@/config"
import { Instance } from "@/project/instance"

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
      // 从config获取baseURL
      const cfg = yield* config.get()
      const baseURL = cfg.provider?.["opencode"]?.options?.baseURL 
        ?? "https://opencode.ai"
      
      const url = `${baseURL}/sse/codeGenie/exitSessionQueue`
      
      // 发送退出请求（非阻塞，失败静默）
      yield* Effect.tryPromise({
        try: () => fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "sessionId": sessionID,  // 精确使用sessionId header
          },
          body: JSON.stringify({ modelId }),
        }),
        catch: () => undefined,  // 静默失败
      }).pipe(
        Effect.timeout("5 seconds"),
        Effect.ignore,  // 忽略所有错误
      )
    })
    
    return Service.of({ exit })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(Config.defaultLayer))

export * as ExitQueue from "./exit-queue"
```

#### 3.2.6 session/processor.ts 集成

```typescript
// 在process函数中新增排队分支
const process = Effect.fn("SessionProcessor.process")(function* (streamInput: LLM.StreamInput) {
  // ... 现有逻辑
  
  return yield* Effect.gen(function* () {
    yield* Effect.gen(function* () {
      // ... 现有stream处理
      
    }).pipe(
      // ... 现有onInterrupt
      Effect.catchCauseIf(
        (cause) => !Cause.hasInterruptsOnly(cause),
        (cause) => Effect.fail(Cause.squash(cause)),
      ),
      
      // 新增：先尝试排队policy，如果不是排队错误则fallback到标准retry
      Effect.retry(
        SessionRetry.queuePolicy({
          parse,
          set: (info) =>
            status.set(ctx.sessionID, {
              type: "queue",
              position: info.position,
              message: info.message,
              attempt: info.attempt,
              next: info.next,
            }),
          onQueueUpdate: (position) =>
            // 更新聊天区域显示
            session.updatePart({
              id: ctx.queuePartID ?? PartID.ascending(),
              messageID: ctx.assistantMessage.id,
              sessionID: ctx.sessionID,
              type: "queue",
              position,
              message: `当前模型访问量较高，您目前排在第${position}位，请耐心等待或处理其他任务`,
              time: { start: Date.now() },
            }),
        }),
      ),
      
      // 如果排队policy终止（不是排队错误），走标准retry
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
      
      Effect.catch(halt),
      Effect.ensuring(cleanup()),
    )
    
    // ... 现有返回
  })
})
```

---

## 4. 数据流设计

### 4.1 排队状态数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                         排队状态流程                              │
└─────────────────────────────────────────────────────────────────┘

1. LLM请求发送
   ↓
2. 收到406响应
   ↓
3. parseAPICallError → { type: "queue", position, message }
   ↓
4. QueueError构造 → QueueError.Schema
   ↓
5. queuePolicy检测 → queueable返回position
   ↓
6. status.set → { type: "queue", position, message, attempt, next }
   ↓
7. session.updatePart → QueuePart { position, message }（显示排队提示）
   ↓
8. TUI渲染 → ℹ + 排队提示
   ↓
9. 等待queueDelay(attempt)毫秒
   ↓
10. 重新发送请求 → 重复2-9或成功退出
   ↓
11. 排队成功 → session.removePart(queuePartID)（移除排队提示）
   ↓
12. 聊天区域正常响应
```

**关键点**：排队成功或取消后，QueuePart必须移除，聊天区域恢复正常。

### 4.2 取消流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         取消流程                                 │
│              （复用现有Ctrl+C中断入口，无新增入口）                │
└─────────────────────────────────────────────────────────────────┘

1. 用户按下Ctrl+C
   ↓
2. processor.ts现有的Effect.onInterrupt触发
   ↓
3. 中断回调中检测queueActive状态
   ↓
4. 如果排队状态为true：
   a. 调用ExitQueue.exit(sessionID, modelId)
   b. POST /sse/codeGenie/exitSessionQueue（非阻塞）
   ↓
5. session.removePart(queuePartID)（移除排队提示）
   ↓
6. 会话终止（继续现有halt流程）
```

**关键设计**：
- 排队取消逻辑集成到processor.ts已有的中断处理中，用户无需新的操作入口
- 取消后QueuePart移除，聊天区域不再显示排队提示

---

## 5. UI设计

### 5.1 聊天区域排队显示

```
┌─────────────────────────────────────────────────────────────────┐
│  [User] 请帮我实现一个登录功能                                    │
├─────────────────────────────────────────────────────────────────┤
│  ℹ 当前模型访问量较高，您目前排在第5位，请耐心等待或处理其他任务    │
│    [等待中...]  下一轮询: 4秒后                                   │
├─────────────────────────────────────────────────────────────────┤
│  [Assistant] 排队成功后继续响应...                                │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 排队Part渲染组件

```tsx
// TUI组件伪代码
function QueuePartView({ part }: { part: QueuePart }) {
  const theme = useTheme()
  
  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.info}>ℹ</text>
      <text fg={theme.text}>
        当前模型访问量较高，您目前排在第{part.position}位，
        请耐心等待或处理其他任务
      </text>
      <Spinner color={theme.textMuted} />
    </box>
  )
}
```

---

## 6. 验证方案

### 6.1 构建验证

```bash
# 类型检查
cd packages/opencode && bun run typecheck

# 构建
bun run build
```

### 6.2 单元测试验证

| 测试场景 | 输入 | 预期输出 |
|----------|------|----------|
| 406检测 | statusCode=406, body.error.type="WaitingInLine" | ParsedError.type="queue" |
| 位置解析 | message="排在第123位" | position=123 |
| 延迟计算 | attempt=1,2,3,4,5,6 | 2000,4000,6000,8000,10000,10000 |
| 非排队错误 | statusCode=500 | queueable返回undefined |

### 6.3 集成测试验证

1. 模拟后端返回406排队错误
2. 验证CLI进入排队状态，显示排队提示
3. 模拟轮询成功，验证继续响应
4. 模拟用户取消，验证退出API调用

---

## 附录

### A. 设计决策记录

| 冨策ID | 冨策内容 | 冨策原因 |
|--------|----------|----------|
| D-001 | 排队独立分支而非扩展标准retry | 延迟策略不同（固定步长vs指数退避），中断处理也不同 |
| D-002 | 复用现有Ctrl+C中断入口 | 不新增用户操作入口，排队退出逻辑集成到processor.ts已有的Effect.onInterrupt中 |
| D-003 | Header使用精确sessionId | 遵循后端API规范要求 |
| D-004 | 每次轮询更新位置 | 用户需要看到实时排队进度 |

### B. 参考文档

| 文档名称 | 来源 |
|----------|------|
| 01-requirements-analysis.md | specs/queue-polling/ |
| session/retry.ts | 现有retry实现 |
| processor.ts | 现有stream处理 |

### C. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.1 | 2026-04-29 | - | 更正取消方式：复用现有Ctrl+C中断入口（Effect.onInterrupt），不新增用户入口 |
| 1.0 | 2026-04-29 | - | 初始版本 |