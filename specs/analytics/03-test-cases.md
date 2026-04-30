# 测试用例清单: 用户行为打点 (Analytics)

**功能分支**: `005-analytics`  
**创建日期**: 2026-04-27  
**状态**: 待验证  
**关联需求文档**: [01-requirements-analysis.md](./01-requirements-analysis.md)

---

## 验证说明

通过 `analytics.log` 日志和上报请求验证打点功能。

---

## 需求 FR-001: 打点数据采集

**需求描述**: 采集用户每次请求的完整交互数据

### 正向场景（必选）

- [ ] **TC-FR001-001**: 已登录用户使用 build agent 发起请求，验证打点数据完整
  - **前置条件**: 用户已登录华为账号，使用 codegenie provider
  - **测试步骤**:
    1. 启动 CodeGenie CLI 并登录
    2. 使用 build agent 发起一次请求
    3. 等待 session idle
    4. 查看 analytics.log 中 Event 字段
  - **预期结果**: Event 包含 sourceType、sourceVersion、modelId、uid、userid、sessionid、messageID、agentName、query、answer、inputTokenCount、outputTokenCount、projectName、modifiedFileList、operations、toolExecutions、isSuccess、totalElapsed、firstResultElapsed、os_name、os_version
  - **验证状态**: ⏳ 待验证

- [ ] **TC-FR001-002**: 使用 plan agent 发起请求，验证 agentName 正确
  - **前置条件**: 用户已登录，切换到 plan agent
  - **测试步骤**:
    1. 切换到 plan agent
    2. 发起一次请求
    3. 查看 analytics.log
  - **预期结果**: Event 中 agentName 为 "plan"
  - **验证状态**: ⏳ 待验证

### 边界场景（可选）

- [ ] **TC-FR001-EDGE-001**: 模型多轮工具调用后，验证 toolExecutions 包含所有工具
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 发起需要多轮工具调用的请求
    2. 查看 analytics.log
  - **预期结果**: toolExecutions 数组包含所有工具执行记录
  - **验证状态**: ⏳ 待验证

---

## 需求 FR-002: 打点条件校验

**需求描述**: 仅登录且使用 codegenie provider 时采集

### 正向场景（必选）

- [ ] **TC-FR002-001**: 未登录用户使用，验证不采集打点
  - **前置条件**: 用户未登录
  - **测试步骤**:
    1. 未登录状态下发起请求
    2. 查看 analytics.log
  - **预期结果**: 日志中无 Session started 记录
  - **验证状态**: ⏳ 待验证

- [ ] **TC-FR002-002**: 使用非 codegenie provider，验证不采集
  - **前置条件**: 用户已登录，使用其他 provider（如 openai）
  - **测试步骤**:
    1. 切换到非 codegenie provider
    2. 发起请求
    3. 查看 analytics.log
  - **预期结果**: 日志中无对应 Session started 记录
  - **验证状态**: ⏳ 待验证

---

## 需求 FR-003: 打点数据上报

**需求描述**: 批量上报至华为云端，支持重试

### 正向场景（必选）

- [ ] **TC-FR003-001**: 验证上报请求格式为 HuaweiTracePayload
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 发起请求触发打点
    2. 查看 analytics.log 中 Upload success 日志
  - **预期结果**: 上报成功，日志显示 HTTP 200
  - **验证状态**: ⏳ 待验证

### 异常场景（可选）

- [ ] **TC-FR003-ERR-001**: 网络不可用时验证事件持久化
  - **前置条件**: 用户已登录，断开网络
  - **测试步骤**:
    1. 断网后发起请求
    2. 查看 analytics.json 中是否有 pending 事件
    3. 恢复网络后重启 CLI
  - **预期结果**: pending 事件在重启后被恢复并上报
  - **验证状态**: ⏳ 待验证

---

## 需求 FR-004: 用户标识

**需求描述**: uid 设备标识 + userid 华为账号标识

### 正向场景（必选）

- [ ] **TC-FR004-001**: 验证 uid 持久化且重启后复用
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 首次使用，查看 analytics/uid 文件
    2. 重启 CLI，再次查看
  - **预期结果**: uid 文件存在且值不变
  - **验证状态**: ⏳ 待验证

- [ ] **TC-FR004-002**: 验证 userid 为华为账号真实用户 ID
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 登录后查看 analytics/userid 文件
    2. 查看 Event 中 userid 字段
  - **预期结果**: userid 为 JWT 中解析的 userId，非 "unknown"
  - **验证状态**: ⏳ 待验证

### 异常场景（可选）

- [ ] **TC-FR004-ERR-001**: 进程重启后验证 userid 仍可读取
  - **前置条件**: 用户已登录后重启 CLI
  - **测试步骤**:
    1. 重启 CLI
    2. 发起请求
    3. 查看 Event 中 userid
  - **预期结果**: userid 不为 "unknown"，为之前持久化的值
  - **验证状态**: ⏳ 待验证

---

## 需求 FR-005: 请求标识

**需求描述**: sessionID + messageID + chatId 标识

### 正向场景（必选）

- [ ] **TC-FR005-001**: 验证 messageID 非空且每次请求不同
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 发起两次请求
    2. 查看两次 Event 的 messageID
  - **预期结果**: messageID 非空，两次请求的 messageID 不同
  - **验证状态**: ⏳ 待验证

- [ ] **TC-FR005-002**: 验证同一 session 内 chatId 保持不变
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 在同一 session 内发起多次请求
    2. 查看 LLM 日志中 chatId 字段
  - **预期结果**: 同一 session 内所有请求的 chatId 相同
  - **验证状态**: ⏳ 待验证

### 边界场景（可选）

- [ ] **TC-FR005-EDGE-001**: 验证不同 session 使用不同 chatId
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 创建新 session 并发起请求
    2. 记录 chatId
    3. 再创建新 session 并发起请求
    4. 比较两个 chatId
  - **预期结果**: 两个 session 的 chatId 不同
  - **验证状态**: ⏳ 待验证

---

## 需求 FR-006: Agent 标识

**需求描述**: 记录当前使用的 Agent 类型

### 正向场景（必选）

- [ ] **TC-FR006-001**: 验证不同 Agent 的 agentName 正确
  - **前置条件**: 用户已登录
  - **测试步骤**:
    1. 使用 build agent 发起请求 → agentName="build"
    2. 使用 plan agent 发起请求 → agentName="plan"
  - **预期结果**: agentName 与实际使用的 Agent 匹配
  - **验证状态**: ⏳ 待验证

---

## 需求 FR-007: 进程生命周期

**需求描述**: 启动恢复 pending 事件，退出执行最终 flush

### 正向场景（必选）

- [ ] **TC-FR007-001**: 验证启动时恢复 pending 事件
  - **前置条件**: 有未上报的 pending 事件
  - **测试步骤**:
    1. 产生 pending 事件后关闭 CLI
    2. 重新启动 CLI
    3. 查看 analytics.log
  - **预期结果**: 日志显示 "Restored N pending events from disk"
  - **验证状态**: ⏳ 待验证

---

## 需求 FR-008: Token 自动刷新

**需求描述**: 上报时 Token 过期自动刷新

### 正向场景（必选）

- [ ] **TC-FR008-001**: 验证 Token 过期时自动刷新并上报
  - **前置条件**: 用户已登录，Token 已过期
  - **测试步骤**:
    1. 等待 Token 过期
    2. 发起请求触发打点
    3. 查看 analytics.log
  - **预期结果**: 上报成功，日志无 "Token refresh failed"
  - **验证状态**: ⏳ 待验证

---

## 验证统计

### 总体统计

| 统计项 | 数量 | 已验证 | 通过 | 失败 | 跳过 |
|--------|------|--------|------|------|------|
| 正向场景（必选） | 10 | 0 | 0 | 0 | 0 |
| 可选场景 | 0 | 0 | 0 | 0 | 0 |
| 逆向场景 | 0 | 0 | 0 | 0 | 0 |
| 边界场景 | 2 | 0 | 0 | 0 | 0 |
| 异常场景 | 2 | 0 | 0 | 0 | 0 |
| **总计** | **14** | **0** | **0** | **0** | **0** |

### 需求覆盖统计

| 需求ID | 正向场景 | 边界场景 | 异常场景 | 状态 |
|--------|----------|----------|----------|------|
| FR-001 | 0/2 | 0/1 | 0/0 | ⏳ 待验证 |
| FR-002 | 0/2 | 0/0 | 0/0 | ⏳ 待验证 |
| FR-003 | 0/1 | 0/0 | 0/1 | ⏳ 待验证 |
| FR-004 | 0/2 | 0/0 | 0/1 | ⏳ 待验证 |
| FR-005 | 0/2 | 0/1 | 0/0 | ⏳ 待验证 |
| FR-006 | 0/1 | 0/0 | 0/0 | ⏳ 待验证 |
| FR-007 | 0/1 | 0/0 | 0/0 | ⏳ 待验证 |
| FR-008 | 0/1 | 0/0 | 0/0 | ⏳ 待验证 |

---

## 变更历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0 | 2026-04-27 | CodeGenie | 初始版本 |
| 1.1 | 2026-04-28 | CodeGenie | 新增 chatId 稳定性测试用例 (TC-FR005-002, TC-FR005-EDGE-001) |
