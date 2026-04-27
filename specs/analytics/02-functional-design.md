# 功能设计说明书: 用户行为打点 (Analytics)

**功能分支**: `005-analytics`  
**创建日期**: 2026-04-27  
**状态**: 已实现  
**关联需求文档**: [01-requirements-analysis.md](./01-requirements-analysis.md)

---

## 1. 功能概述

### 1.1 功能简介

用户行为打点系统通过 OpenCode 插件 Hook 机制，采集用户与 AI 的交互数据，经持久化和批量处理后上报至华为云端 Trace 接口。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 完整采集用户每次请求的交互数据 | AnalyticsEvent 所有字段有值 |
| 性能目标 | 打点不影响主流程 | 异步上报，不阻塞 |
| 质量目标 | 数据不丢失 | 事件持久化 + 重试 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| 最小侵入 | 通过 Hook 机制集成，不修改核心代码 | Plugin 注册 |
| 异步上报 | 打点操作不阻塞主流程 | upload/flush 异步执行 |
| 持久化优先 | 事件先写磁盘再上报 | appendPendingEvent |

---

## 1.4 打点字段清单

### AnalyticsEvent（客户端采集 → detail 字段）

| 字段 | 类型 | 含义 | 数据来源 |
|------|------|------|----------|
| sourceType | `"CodeGenie-Cli"` | 来源类型，固定值 | 硬编码 |
| sourceVersion | string | CLI 版本号 | package.json |
| modelId | string | 使用的模型 ID | chat.message hook → input.model.modelID |
| uid | string | 设备匿名标识（UUID） | 首次生成，持久化到 analytics/uid |
| userid | string | 华为账号真实用户 ID | JWT 解析，持久化到 analytics/userid |
| sessionid | string | 对话会话 ID | chat.message hook → input.sessionID |
| messageID | string | 用户单次请求唯一标识 | chat.message hook → input.messageID |
| agentName | string | 当前使用的 Agent | chat.message hook → input.agent（build/plan/debug 等） |
| query | string | 用户输入的问题 | chat.message hook → output.message/parts |
| answer | string | 模型的完整回答 | event hook → message.part.delta 累加 |
| inputTokenCount | number | 输入 Token 数 | event hook → message.updated tokens.input（无则估算） |
| outputTokenCount | number | 输出 Token 数 | event hook → message.updated tokens.output（无则估算） |
| projectName | string | 项目名称 | 插件初始化时 directory 参数 |
| modifiedFileList | ModifiedFile[] | 修改的文件列表 | tool.execute.after hook → filediff |
| operations | Operations | 工具使用统计 | tool.execute.after hook → 按 builtin/mcp/skill 分类统计 |
| toolExecutions | ToolExecution[] | 每次工具执行详情 | tool.execute.after hook → 名称/耗时/成功否/时间戳 |
| isSuccess | boolean | 本次请求是否成功 | session.error → false，工具失败 → false |
| totalElapsed | number | 总耗时（ms） | startSession → buildEvent 的时间差 |
| firstResultElapsed | number | 首次响应耗时（ms） | startSession → 第一个 message.part.delta 的时间差 |
| os_name | string | 操作系统名 | process.platform |
| os_version | string | 操作系统版本 | os.release() |

### ModifiedFile（modifiedFileList 子项）

| 字段 | 类型 | 含义 |
|------|------|------|
| fileName | string | 修改的文件路径 |
| additions | number | 新增行数 |
| deletions | number | 删除行数 |

### ToolExecution（toolExecutions 子项）

| 字段 | 类型 | 含义 |
|------|------|------|
| toolName | string | 工具名称 |
| duration | number | 执行耗时（ms） |
| isSuccess | boolean | 是否成功 |
| timestamp | number | 执行时间戳 |

### Operations（operations 字段）

| 字段 | 类型 | 含义 |
|------|------|------|
| builtinTools | ToolSummary[] | 内置工具统计（bash/read/write/edit/glob/grep 等） |
| mcpTools | ToolSummary[] | MCP 工具统计 |
| skillTools | ToolSummary[] | Skill 工具统计 |

### ToolSummary（operations 子项）

| 字段 | 类型 | 含义 |
|------|------|------|
| name | string | 工具名称 |
| count | number | 调用次数 |

### HuaweiTracePayload（上报到华为云端的格式）

| 字段 | 类型 | 含义 | 对应 AnalyticsEvent 字段 |
|------|------|------|--------------------------|
| action | string | 动作类型 | = sourceType |
| countryCode | string | 国家代码 | 固定 "CN" |
| detail | string | 事件详情 | = JSON.stringify(AnalyticsEvent) |
| osArch | string | 系统架构 | = os_name |
| sid | number | 服务 ID | 固定 10200 |
| timestamp | number | 上报时间戳 | Date.now()（上报时刻） |
| uid | string | 用户标识 | = uid |
| version | string | 版本号 | = sourceVersion |

---

## 2. 实现思路

### 2.1 整体方案

基于 OpenCode 插件系统，注册 `event`、`chat.message`、`tool.execute.before`、`tool.execute.after` 四个 Hook，在用户交互过程中采集数据，session idle 时打包上报。

### 2.2 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   AnalyticsPlugin                     │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ event Hook  │  │chat.message  │  │tool.execute │ │
│  │ (delta/     │  │ Hook         │  │ Hook        │ │
│  │  updated/   │  │(startSession)│  │(recordTool) │ │
│  │  idle/      │  │              │  │             │ │
│  │  error)     │  │              │  │             │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │        │
│         ▼                ▼                  ▼        │
│  ┌──────────────────────────────────────────────┐   │
│  │           SessionCollector                    │   │
│  │  (SessionContext: tokens/tools/answer/...)    │   │
│  └──────────────────┬───────────────────────────┘   │
│                      │ buildEvent()                  │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │           AnalyticsUploader                   │   │
│  │  (queue → persist → batch → flush → retry)   │   │
│  └──────────────────┬───────────────────────────┘   │
│                      │ transformEvent()              │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │           Storage                             │   │
│  │  (uid / userid / pendingEvents / analytics.log)│  │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.3 核心流程

```
1. chat.message → startSession(sessionID, modelId, query, agentName, messageID)
2. event:message.part.delta → appendAnswer(delta) + recordFirstResponse()
3. event:message.updated → addTokenCounts(input, output)
4. event:file.edited → recordFileEdit(file)
5. tool.execute.before → 记录 startTime
6. tool.execute.after → recordToolExecution(name, duration, success)
7. event:session.idle → buildEvent() → upload() → flush()
8. event:session.error → markFailure()
```

### 2.4 关键技术点

| 技术点 | 描述 | 解决方案 |
|--------|------|----------|
| userid 跨进程持久化 | 进程重启后内存 userInfo 丢失 | getSession() 增加 JWT 磁盘 fallback；登录时 saveUserid() 写入磁盘 |
| 事件不丢失 | 进程异常退出导致内存队列丢失 | appendPendingEvent() 先写磁盘；shutdown 时 flush |
| Token 过期上报 | 上报时 Token 已过期 | flush() 中检测过期并自动 refreshToken |

### 2.5 技术选型

| 技术领域 | 选型方案 | 选型理由 | 备选方案 |
|----------|----------|----------|----------|
| 插件集成 | OpenCode Plugin Hooks | 零侵入，官方扩展机制 | 直接修改核心代码 |
| 持久化 | JSON 文件 (analytics.json) | 简单可靠，无需数据库 | SQLite |
| 上报协议 | HuaweiTracePayload | 华为云端接口规范 | 自定义格式 |
| Token 管理 | 复用 codegenieAuth | 已有完整的登录/刷新机制 | 独立实现 |

---

## 3. 实现设计

### 3.1 模块设计

#### 3.1.1 模块划分

| 模块名称 | 职责描述 | 关键类/组件 | 依赖模块 |
|----------|----------|-------------|----------|
| analytics-plugin.ts | 插件入口，注册 Hook | AnalyticsPlugin | collector, uploader, storage |
| collector.ts | 会话数据收集器 | SessionCollector | storage, codegenie |
| uploader.ts | 事件上传器 | AnalyticsUploader | storage, codegenie |
| storage.ts | 持久化存储 | 函数式 | global |
| types.ts | 类型定义 | 接口/类型 | 无 |

### 3.2 类设计

#### SessionCollector

| 属性名 | 类型 | 访问权限 | 描述 |
|--------|------|----------|------|
| context | SessionContext \| null | private | 当前会话上下文 |
| version | string | private | CLI 版本 |
| loggedIn | boolean | private | 登录状态 |

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| startSession | sessionID, modelId, query, agentName, messageID | void | 创建新会话上下文 |
| appendAnswer | delta: string | void | 追加回答增量 |
| addTokenCounts | input, output | void | 累加 Token 计数 |
| recordToolExecution | toolName, duration, isSuccess, args | void | 记录工具执行 |
| recordFileDiff | filePath, additions, deletions | void | 记录文件差异 |
| markFailure | - | void | 标记失败 |
| buildEvent | projectName | Promise\<AnalyticsEvent \| null\> | 构建打点事件 |
| clear | - | void | 清空上下文 |

#### AnalyticsUploader

| 属性名 | 类型 | 访问权限 | 描述 |
|--------|------|----------|------|
| eventQueue | AnalyticsEvent[] | private | 待上报事件队列 |
| isUploading | boolean | private | 是否正在上报 |
| retryCount | number | private | 重试计数 |

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| upload | event | Promise\<boolean\> | 入队事件 |
| flush | - | Promise\<UploadResult\> | 批量上报 |
| restorePending | - | Promise\<void\> | 恢复磁盘 pending 事件 |
| shutdown | - | Promise\<void\> | 关闭时最终 flush |

### 3.3 流程设计

#### 3.3.1 主流程

```
chat.message Hook:
  1. checkLoginStatus() → 未登录则 return
  2. getSession() → saveUserid(userId) 持久化
  3. providerID !== "codegenie" → return
  4. startSession(sessionID, modelId, query, agentName, messageID)

event Hook (message.updated):
  1. 解析 tokens (input/output)
  2. addTokenCounts(input, output)

tool.execute.after Hook:
  1. 计算 duration
  2. recordToolExecution(name, duration, isSuccess)
  3. 如有 filediff → recordFileDiff()

event Hook (session.idle):
  1. buildEvent(projectName) → 构建 AnalyticsEvent
  2. uploadAnalyticsEvent(event) → 入队
  3. clear() → 清空上下文

flush():
  1. 检查 auth token → 无则跳过
  2. 检查 token 过期 → 刷新
  3. transformEvent() → HuaweiTracePayload
  4. POST 上报
  5. 成功 → clearPendingEvents / 失败 → retryCount++
```

#### 3.3.2 异常流程

| 异常场景 | 处理流程 | 错误信息 |
|----------|----------|----------|
| 未登录 | 跳过采集，不创建 context | - |
| Token 过期 | 自动刷新，刷新失败则跳过上报 | "Token refresh failed" |
| 上报 HTTP 错误 | retryCount++，超过 maxRetries 丢弃 | "Upload failed: HTTP {status}" |
| 上报网络异常 | retryCount++，超过 maxRetries 丢弃 | "Upload error: {message}" |

---

## 4. 接口设计

### 4.1 调用接口

#### 4.1.1 外部依赖接口

| 接口名称 | 提供方 | 接口描述 | 调用场景 |
|----------|--------|----------|----------|
| codegenieAuth.isLoggedIn() | codegenie 插件 | 检查登录状态 | chat.message Hook |
| codegenieAuth.getSession() | codegenie 插件 | 获取用户会话信息 | chat.message Hook |
| codegenieAuth.refreshToken() | codegenie 插件 | 刷新 Token | flush() Token 过期时 |
| saveAuthToDisk() | codegenie 插件 | 保存认证信息到磁盘 | flush() Token 刷新后 |

### 4.2 提供接口

无对外提供接口。打点系统为内部模块，通过 Plugin Hook 被动触发。

---

## 5. 周边依赖关系

### 5.1 网络依赖

| 依赖项 | 依赖类型 | 网络要求 | 异常处理 |
|--------|----------|----------|----------|
| 华为云端 Trace API | 强依赖 | HTTPS POST | 重试 5 次后丢弃，持久化 pending |

---

## 6. 安全隐私设计

### 6.1 安全机制设计

| 安全类型 | 需求描述 | 实现方式 |
|----------|----------|----------|
| 身份认证 | 上报请求携带华为账号 Token | Authorization header |
| 数据传输 | HTTPS 加密 | fetch() 默认 HTTPS |
| Token 保护 | 日志中不打印完整 Token | authToken.substring(0, 20) + "..." |

### 6.2 隐私保护设计

| 数据类型 | 隐私等级 | 保护措施 |
|----------|----------|----------|
| query/answer | 中 | 日志中截取前 200 字符 |
| userid | 中 | 持久化到用户本地磁盘 |
| authToken | 高 | 日志中脱敏显示 |

---

## 7. 本地数据库设计

### 7.1 数据库概述

| 项目 | 描述 |
|------|------|
| 存储类型 | JSON 文件 |
| 存储位置 | `{Global.Path.data}/analytics/` |

### 7.2 文件结构

| 文件名 | 描述 | 格式 |
|--------|------|------|
| analytics.json | pending 事件和 uid | JSON |
| uid | 设备匿名标识 | 纯文本 UUID |
| userid | 华为账号用户 ID | 纯文本 |
| log/analytics.log | 调试日志 | 时间戳 + 消息 |

---

## 8. DFX 分析

### 8.1 可靠性

| 故障模式 | 影响范围 | 恢复策略 |
|----------|----------|----------|
| 上报端点不可用 | 数据延迟上报 | 持久化 + 重试 |
| 进程异常退出 | 内存队列丢失 | pending 事件已写磁盘 |
| Token 过期 | 上报失败 | 自动刷新 |

### 8.2 可配置性

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| enabled | true | 是否启用打点 |
| endpoint | https://cn.devecostudio.huawei.com/codeGenie/cli/trace/upload | 上报端点 |
| batchSize | 10 | 批量上报大小 |
| flushInterval | 30000ms | 定时刷新间隔 |
| maxRetries | 5 | 最大重试次数 |
| maxQueueSize | 1000 | 最大队列长度 |

---

## 附录

### A. 设计决策记录

| 决策ID | 决策内容 | 决策原因 | 决策日期 |
|--------|----------|----------|----------|
| D-001 | userid 从 JWT 解析并持久化到磁盘 | 进程重启后内存 userInfo 丢失，需从磁盘读取 | 2026-04-27 |
| D-002 | getSession() 增加 JWT fallback | 确保进程重启后仍可获取 userId | 2026-04-27 |
| D-003 | 日志精简，仅保留关键信息 | 减少 DEBUG 日志干扰 | 2026-04-27 |

### B. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-27 | CodeGenie | 初始版本 |
