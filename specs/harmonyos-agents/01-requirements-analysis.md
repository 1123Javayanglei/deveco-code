# 需求分析说明书: HarmonyOS Agents 迁移

**功能分支**: `harmonyos-agents-migration`
**创建日期**: 2026-04-23
**状态**: 草稿
**输入**: 将 codegenie-old 的 HarmonyOS 专用 Agent（build、plan、Ask、debug）及其 prompt 迁移到 codegenie-cli

---

## 1. 简介

### 1.1 目的

本文档描述将 codegenie-old 中的 4 个 HarmonyOS 专用 Agent 及其配套 prompt 文件迁移到 codegenie-cli 的需求分析。这些 Agent 是 HarmonyOS/ArkTS 开发场景的核心交互入口，迁移后 codegenie-cli 将具备完整的 HarmonyOS 开发辅助能力。

### 1.2 范围

**包含**:
- 4 个 HarmonyOS 专用 Agent 定义（build、plan、Ask、debug）迁移到 Effect-TS 框架
- 4 个新 prompt 文件（build.txt、plan.txt、ask.txt、debug.txt）
- 1 个已有 prompt 文件更新（explore.txt: 通用搜索 → HarmonyOS/ArkTS 专业搜索）
- Agent 权限配置适配（引用已迁移的 HarmonyOS 工具名）

**不包含**:
- ACP agent（两仓库已一致）
- compaction/title/summary agent（两仓库已一致）
- generate.txt（两仓库已一致）
- HarmonyOS 工具本身的迁移（已在上一轮完成）
- Skill 迁移（已有独立文档）

### 1.3 假设和约束

| 类型 | 描述 |
|------|------|
| 假设 | HarmonyOS 工具（hdc_log、jscrash_report、oh_knowledge、switch_cwd、plan_enter/exit/write）已在 codegenie-cli 注册 |
| 假设 | MCP-bridge 工具（build_project、start_app、check_ets_files、perform_ui_action、get_app_ui_tree）通过 mcp-bridge 动态加载，无需静态注册 |
| 假设 | `general` subagent 在 cli 中保留，与 `Ask` primary agent 共存 |
| 约束 | codegenie-cli 使用 Effect-TS 框架，Agent 定义需适配 `Effect.gen` + `InstanceState` 模式 |
| 约束 | Agent prompt 文件以 `.txt` 格式通过 `import` 语句加载 |

### 1.4 术语与缩写

| 术语/缩写 | 全称 | 说明 |
|-----------|------|------|
| Agent | 智能代理 | 具有特定 system prompt、权限和工具集的 AI 交互角色 |
| Primary Agent | 主代理 | 直接与用户交互的 Agent |
| Subagent | 子代理 | 由其他 Agent 调用的专业化 Agent |
| Permission Ruleset | 权限规则集 | 定义 Agent 可用的工具和文件操作权限 |
| Effect-TS | Effect-TypeScript | codegenie-cli 使用的函数式编程框架 |
| InstanceState | 实例状态 | Effect-TS 中的有状态服务管理模式 |
| MCP-bridge | MCP 桥接 | HarmonyOS 设备/模拟器工具的桥接层 |

---

## 2. 系统上下文

### 2.1 系统定位

Agent 层位于 codegenie-cli 工具调用架构的顶层，是用户交互的直接入口。不同 Agent 通过差异化的 system prompt 和权限配置，为不同开发场景（编译构建、调试、规划、问答）提供专业化的 AI 辅助。

### 2.2 系统边界

```
┌─────────────────────────────────────────────────────┐
│                    codegenie-cli                      │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  build   │ │   plan   │ │   Ask    │ │  debug  │ │
│  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       │            │            │             │       │
│  ┌────┴────────────┴────────────┴─────────────┴────┐ │
│  │              Permission System                    │ │
│  └────┬────────────┬────────────┬─────────────┬────┘ │
│       │            │            │             │       │
│  ┌────┴───┐  ┌─────┴──┐  ┌─────┴───┐  ┌──────┴───┐ │
│  │HarmonyOS│  │ Code   │  │ Search  │  │  Plan    │ │
│  │  Tools  │  │ Tools  │  │ Tools   │  │  Tools   │ │
│  └─────────┘  └────────┘  └─────────┘  └──────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              MCP-Bridge (动态工具)               │ │
│  │  build_project / start_app / check_ets_files    │ │
│  │  perform_ui_action / get_app_ui_tree            │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2.3 外部依赖

| 依赖 | 方向 | 说明 |
|------|------|------|
| HarmonyOS 工具层 | Agent → Tool | hdc_log、jscrash_report、oh_knowledge 等 |
| MCP-Bridge | Agent → MCP | build_project、start_app 等动态加载工具 |
| Permission 系统 | Agent → Permission | 权限规则集定义和评估 |
| Config 系统 | Agent → Config | 用户自定义 Agent 配置 |

---

## 3. 需求分析概述

### 3.1 需求来源

- codegenie-old 已成熟的 4 个 HarmonyOS Agent 需要迁移到 codegenie-cli
- codegenie-cli 当前 Agent 体系是通用的，缺少 HarmonyOS/ArkTS 场景的专业化支持

### 3.2 需求目标

将 HarmonyOS Agent 的 prompt、权限配置和 Agent 定义迁移到 codegenie-cli 的 Effect-TS 架构中，使 codegenie-cli 具备与 codegenie-old 等同的 HarmonyOS 开发辅助能力。

### 3.3 关键利益相关者

| 角色 | 职责 | 关注点 |
|------|------|--------|
| HarmonyOS 开发者 | 使用 Agent 辅助 ArkTS 开发 | Agent 是否能正确引导编译、调试、规划流程 |
| 迁移工程师 | 执行迁移工作 | Effect-TS 适配的复杂度和正确性 |

---

## 4. 需求场景分析

### 4.1 用户操作场景

**场景 US-001: ArkTS 编译构建** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者使用 build Agent 进行 ArkTS 代码编译、错误修复和应用启动 |
| 前置条件 | 已打开 HarmonyOS 项目，DevEco 环境已配置 |
| 操作步骤 | 1. 选择 build Agent<br>2. 输入开发需求<br>3. Agent 自动编译 → 修复 → 部署 |
| 预期结果 | 代码编译成功并部署到设备/模拟器 |
| 关键规则 | build_project 成功是 start_app 的前置条件 |

**场景 US-002: 假设驱动调试** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者使用 debug Agent 进行运行时问题调试 |
| 前置条件 | 应用可编译但存在运行时问题 |
| 操作步骤 | 1. 选择 debug Agent<br>2. 描述问题现象<br>3. Agent 生成假设 → 插入日志 → 收集证据 → 定位修复 |
| 预期结果 | 基于日志证据确认/拒绝假设并应用修复 |
| 关键规则 | 禁止在无运行时证据的情况下声称修复成功 |

**场景 US-003: 规划模式** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者使用 plan Agent 生成实现计划 |
| 前置条件 | 有明确的开发需求 |
| 操作步骤 | 1. 进入 plan Agent<br>2. Agent 理解需求 → 探索代码 → 生成计划<br>3. 用户审批后切换到 build Agent 执行 |
| 预期结果 | 生成可直接执行的实现计划 |
| 关键规则 | plan Agent 不能执行代码修改，只能写计划文件 |

**场景 US-004: 工程问答** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者使用 Ask Agent 查询项目代码和鸿蒙知识 |
| 前置条件 | 已打开 HarmonyOS 项目 |
| 操作步骤 | 1. 选择 Ask Agent<br>2. 提出关于代码结构、API 用法等问题<br>3. Agent 搜索代码和知识库回答 |
| 预期结果 | 获得基于项目代码和鸿蒙知识的准确回答 |
| 关键规则 | Ask Agent 为只读模式，不能修改任何文件 |

---

## 5. 功能性需求分析

### 5.1 功能需求列表

| 需求编号 | 需求名称 | 需求描述 | 优先级 | 来源 |
|----------|----------|----------|--------|------|
| FR-001 | build Agent 迁移 | 迁移 ArkTS 编译构建 Agent，含 prompt 和权限 | P1 | codegenie-old |
| FR-002 | plan Agent 迁移 | 迁移 ArkTS 规划 Agent，含 prompt 和权限 | P1 | codegenie-old |
| FR-003 | Ask Agent 迁移 | 迁移鸿蒙工程问答 Agent，含 prompt 和只读权限 | P1 | codegenie-old |
| FR-004 | debug Agent 迁移 | 迁移假设驱动调试 Agent，含 prompt 和权限 | P1 | codegenie-old |
| FR-005 | explore prompt 更新 | 将通用搜索 prompt 替换为 HarmonyOS/ArkTS 专业版 | P2 | codegenie-old |
| FR-006 | Agent 注册 | 在 agent.ts 中注册所有新 Agent | P1 | 架构要求 |

### 5.2 功能依赖关系

```
FR-006 Agent 注册
  ├── FR-001 build Agent 迁移
  ├── FR-002 plan Agent 迁移
  ├── FR-003 Ask Agent 迁移
  ├── FR-004 debug Agent 迁移
  └── FR-005 explore prompt 更新
```

每个 Agent 迁移都包含：prompt 文件复制 + Agent 定义适配 + 权限配置。Agent 注册是最终集成步骤。

---

## 6. 非功能性需求分析

### 6.1 兼容性

| 兼容类型 | 要求 | 说明 |
|----------|------|------|
| 工具权限引用 | 允许引用不存在的工具名 | MCP-bridge 工具动态加载，权限规则中的工具名可能不在静态注册列表中 |
| 用户配置兼容 | 保留用户自定义 Agent 配置能力 | 通过 cfg.agent 合并用户配置的逻辑保持不变 |
| 向后兼容 | `general` subagent 保留 | 不删除 codegenie-cli 现有的 general Agent |

### 6.2 可测试性

| 测试类型 | 要求 |
|----------|------|
| 类型检查 | `bun run typecheck` 通过 |
| 构建验证 | `bun run build --single` 成功 |
| 运行时验证 | 启动 opencode 后 Agent 列表包含 build、plan、Ask、debug |

---

## 7. 系统影响分析

### 7.1 影响列表

| 影响模块 | 影响类型 | 影响程度 | 影响描述 |
|----------|----------|----------|----------|
| `src/agent/agent.ts` | 修改 | 高 | 修改 build/plan Agent 定义，新增 Ask/debug Agent |
| `src/agent/prompt/` | 新增/修改 | 中 | 新增 4 个 prompt 文件，修改 1 个 |

### 7.2 风险评估

| 风险项 | 风险等级 | 缓解措施 |
|--------|----------|----------|
| 权限规则引用不存在的工具名 | 低 | Permission 系统设计为 allowlist/denylist 模式，引用不存在的工具名不会报错 |
| prompt 内容与 cli 工具名不一致 | 中 | 逐一比对 prompt 中引用的工具名与 cli 实际注册的工具名 |
| Effect-TS 适配引入新 bug | 低 | Agent 定义逻辑与 cli 现有模式一致，无需特殊 Effect 操作 |

---

## 附录

### A. 参考文档

| 文档名称 | 版本 | 来源 |
|----------|------|------|
| agents-migration.md | 1.0 | specs/harmonyos/ |
| source-code-changes.md (tools) | 1.0 | specs/harmonyos/ |

### B. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-23 | zhangyuchen | 初始版本 |
