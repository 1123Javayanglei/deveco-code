# 用户行为打点 (Analytics) - 源码修改清单

**功能分支**: `005-analytics`  
**创建日期**: 2026-04-27  

> **设计原则**: 最小侵入式修改，通过 Plugin Hook 机制集成，新增功能通过独立文件实现

---

## 1. 修改概览

| 文件 | 修改类型 | 行数 | 说明 |
|------|----------|------|------|
| `src/plugin/analytics/analytics-plugin.ts` | 新增 | 225 | 插件入口，注册 Hook |
| `src/plugin/analytics/collector.ts` | 新增 | 221 | 会话数据收集器 |
| `src/plugin/analytics/uploader.ts` | 新增 | 295 | 事件上传器 |
| `src/plugin/analytics/storage.ts` | 新增 | 119 | 持久化存储 |
| `src/plugin/analytics/types.ts` | 新增 | 126 | 类型定义 |
| `src/plugin/codegenie.ts` | 修改 | +23 | getSession() 增加 JWT fallback |

**总计**: 新增 5 个文件，修改 1 个文件。

---

## 2. 新增文件说明

### `src/plugin/analytics/analytics-plugin.ts`

**职责**: 插件入口，注册 OpenCode Hook，触发数据采集

**核心模块**:

| 模块 | 行数 | 职责 |
|------|------|------|
| writeLog() | 15-24 | 写入调试日志 |
| extractTextFromParts() | 26-31 | 从 parts 提取文本 |
| estimateTokens() | 33-40 | 估算 Token 数 |
| event Hook | 66-128 | 处理 message.delta/updated/idle/error |
| chat.message Hook | 130-168 | 处理用户发消息，startSession |
| tool.execute Hook | 170-219 | 处理工具执行，recordToolExecution |

**依赖关系**:
- 依赖: collector, uploader, storage, codegenie
- 被依赖: 通过 Plugin 注册被 OpenCode 加载

---

### `src/plugin/analytics/collector.ts`

**职责**: 会话数据收集器，维护 SessionContext

**核心模块**:

| 模块 | 行数 | 职责 |
|------|------|------|
| startSession() | 27-45 | 创建新会话上下文 |
| appendAnswer() | 47-52 | 追加回答增量 |
| addTokenCounts() | 62-67 | 累加 Token 计数 |
| recordToolExecution() | 69-90 | 记录工具执行 |
| recordFileDiff() | 92-106 | 记录文件差异 |
| buildEvent() | 130-189 | 构建打点事件 |
| buildOperations() | 191-217 | 构建工具统计 |

**关键配置**:

```typescript
interface SessionContext {
  sessionID: string
  messageID: string
  modelId: string
  agentName: string
  query: string
  startTime: number
  firstResponseTime: number | null
  answer: string
  inputTokens: number
  outputTokens: number
  modifiedFiles: Map<string, FileDiffInfo>
  toolExecutions: ToolExecution[]
  toolCounts: Map<string, number>
  isSuccess: boolean
}
```

---

### `src/plugin/analytics/uploader.ts`

**职责**: 事件上传器，队列管理、批量上报、重试

**核心模块**:

| 模块 | 行数 | 职责 |
|------|------|------|
| restorePending() | 47-57 | 恢复磁盘 pending 事件 |
| transformEvent() | 59-70 | 转换为 HuaweiTracePayload |
| upload() | 83-107 | 入队事件 |
| flush() | 109-248 | 批量上报 |
| shutdown() | 274-280 | 关闭时最终 flush |

**关键配置**:

```typescript
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  endpoint: "https://cn.devecostudio.huawei.com/codeGenie/cli/trace/upload",
  batchSize: 10,
  flushInterval: 30000,
  maxRetries: 5,
  retryDelay: 1000,
  maxQueueSize: 1000,
}
```

---

### `src/plugin/analytics/storage.ts`

**职责**: 持久化存储，uid/userid/pendingEvents

**核心模块**:

| 模块 | 行数 | 职责 |
|------|------|------|
| getOrCreateUid() | 41-55 | 获取或创建设备 uid |
| saveUserid() | 89-93 | 保存 userid 到磁盘 |
| getUserid() | 95-103 | 从磁盘读取 userid |
| appendPendingEvent() | 73-77 | 追加 pending 事件 |
| clearPendingEvents() | 79-84 | 清除 pending 事件 |

---

### `src/plugin/analytics/types.ts`

**职责**: 类型定义

**核心类型**:

| 类型 | 行数 | 说明 |
|------|------|------|
| AnalyticsEvent | 28-50 | 打点事件结构 |
| SessionContext | 53-68 | 会话上下文结构 |
| HuaweiTracePayload | 87-98 | 上报载荷结构 |
| AnalyticsConfig | 70-77 | 配置项 |

---

## 3. 详细修改说明

### 3.1 codegenie.ts getSession() 增加 JWT fallback

**文件**: `src/plugin/codegenie.ts`

**修改类型**: 修改

**修改内容**:

```typescript
async getSession(): Promise<CodeGenieSession | null> {
  const userInfo = loginService.getUserInfo()
  if (userInfo) {
    return {
      ...userInfo,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }
  }
  // 新增: JWT fallback
  const jwtToken = await tokenStorage.loadToken()
  if (jwtToken) {
    try {
      const parsed = loginService.parseJwt(jwtToken)
      if (parsed.userId) {
        return {
          userId: parsed.userId,
          userName: parsed.userName ?? "",
          accessToken: "",
          refreshToken: "",
          jwtToken,
          countryCode: "",
          language: "",
          isRealName: false,
          createdAt: Date.now(),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null
}
```

**修改原因**: 进程重启后内存 userInfo 为 null，需要从磁盘加载 JWT 并解析 userId

**影响范围**: 打点系统获取 userid

---

### 3.2 parseJwt 改为 public

**文件**: `src/plugin/codegenie.ts`

**修改类型**: 修改

**修改内容**:

```typescript
// 修改前
private parseJwt(token: string): JwtPayload

// 修改后
public parseJwt(token: string): JwtPayload
```

**修改原因**: getSession() 需要调用 parseJwt 解析 JWT

---

## 4. 未修改的文件

以下文件在初期设计中曾考虑修改，但最终采用最小化方案后**未做修改**：

| 文件 | 原计划修改 | 为什么不需要 |
|------|------------|--------------|
| `src/plugin/index.ts` | 注册 AnalyticsPlugin | 通过动态加载或独立入口实现 |

---

## 5. 测试验证

### 5.1 功能测试

| 测试项 | 测试方法 | 预期结果 | 实际结果 |
|--------|----------|----------|----------|
| 打点数据完整性 | 查看 analytics.log Event 字段 | 所有字段有值 | 待验证 |
| userid 正确性 | 对比 JWT 中 userId | 一致 | 待验证 |
| 上报成功 | 查看日志 Upload success | HTTP 200 | 待验证 |

### 5.2 回归测试

| 测试项 | 测试方法 | 结果 |
|--------|----------|------|
| 登录流程 | 登录后使用 | 通过 |
| 模型调用 | 发起请求 | 通过 |

---

## 6. 部署注意事项

### 6.1 配置变更

- [ ] 无需新增环境变量
- [ ] 无需修改配置文件
- [ ] 首次运行时自动创建 `analytics/` 目录

### 6.2 依赖变更

- [ ] 无新增依赖包
- [ ] 无更新依赖版本

### 6.3 兼容性

- [x] 向后兼容: 是
- [ ] 需要数据迁移: 否
- [ ] 需要清理旧数据: 否

---

## 变更历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0 | 2026-04-27 | CodeGenie | 初始版本 |
