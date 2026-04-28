# 需求分析说明书: HarmonyOS 工具迁移

**功能分支**: `002-harmonyos-tools`
**创建日期**: 2026-04-22
**状态**: 已实现
**输入**: 将 codegenie-old 中的 HarmonyOS 开发工具和 Plan 工具迁移到 codegenie-cli，适配 Effect 框架

---

## 1. 简介

### 1.1 目的

本文档描述将 codegenie-old 仓库中 HarmonyOS 开发辅助工具和 Plan 工具迁移到 codegenie-cli 的需求。迁移核心挑战在于框架适配：codegenie-old 使用 async/await 模式，codegenie-cli 使用 Effect-TS 函数式框架。2026-04-28 起，原全局 `jscrash_report` 不再作为内置工具保留，其能力下沉到 `arkts-runtime-fix` Skill 私有脚本。

### 1.2 范围

**包含**:
- 当前保留 3 个 HarmonyOS 全局工具：`hdc_log`、`oh_knowledge`、`switch_cwd`
- 2 个 Plan 工具：`plan_enter`、`plan_write`（`plan_exit` 已存在，统一管理在 plan.ts）
- lib 工具库：`env.ts`、`harmony_napi.ts`、`session-cwd.ts`、`mcp-bridge.d.ts`、`emulator_tools.json`
- 工具描述文件（*.txt）
- registry.ts 注册与 Layer 依赖

**不包含**:
- Skills 迁移（已在 001-skills-migration 完成）
- MCP-bridge 原生模块编译
- DevEco Studio 集成测试
- `check_env_variable` 工具迁移
- `jscrash_report` 全局工具保留或重新引入（已下沉到 `arkts-runtime-fix/scripts/jscrash-report.mjs`）

### 1.3 假设和约束

| 类型 | 描述 |
|------|------|
| 假设 | codegenie-cli 的 Effect 框架、Tool.define 接口保持稳定 |
| 假设 | Auth.Service 可通过 Layer 依赖注入提供 |
| 假设 | `@deveco-codegenie/mcp-bridge` 原生模块在目标平台可用 |
| 约束 | 工具 execute 必须返回 `Effect.Effect<ExecuteResult<M>, never, never>` |
| 约束 | 工具导入使用 `import * as Tool from "./tool"` 命名空间模式 |
| 约束 | execute 中使用 `throw` 而非 `Effect.fail`，外层 `.pipe(Effect.orDie)` 确保 never 错误通道 |

### 1.4 术语与缩写

| 术语/缩写 | 全称 | 说明 |
|-----------|------|------|
| Effect | Effect-TS | codegenie-cli 采用的函数式编程框架 |
| hdc | HarmonyOS Device Connector | HarmonyOS 设备调试命令行工具 |
| DevEco | DevEco Studio | HarmonyOS 应用开发 IDE |
| NAPI | Node-API | Node.js 原生模块接口 |
| Plan 模式 | Plan Mode | 规划-构建双模式开发流程 |

---

## 2. 系统上下文

### 2.1 系统定位

HarmonyOS 工具集是 codegenie-cli 面向 HarmonyOS 开发者的核心功能，提供设备日志采集、知识检索、项目切换等通用能力。崩溃分析属于 `arkts-runtime-fix` Skill 私有 workflow。Plan 工具支持规划-构建双模式开发流程。

### 2.2 系统边界

```
codegenie-cli
├── Tool Registry (注册中心)
│   ├── 内置工具 (bash, read, edit, write, ...)
│   ├── HarmonyOS 工具
│   │   ├── hdc_log         (设备日志采集)
│   │   ├── oh_knowledge    (知识库检索) → Auth.Service
│   │   └── switch_cwd      (项目目录切换)
│   ├── Plan 工具
│   │   ├── plan_enter  (进入规划模式)
│   │   ├── plan_exit   (退出规划模式)
│   │   └── plan_write  (写入计划文件)
│   └── 自定义工具 (插件/MCP)
├── lib/ (工具共享库)
│   ├── env.ts              (DevEco 路径查找)
│   ├── harmony_napi.ts     (NAPI 原生桥接)
│   ├── session-cwd.ts      (会话 CWD 管理)
│   ├── mcp-bridge.d.ts     (原生模块类型声明)
│   └── emulator_tools.json (模拟器工具 Schema)
└── 外部依赖
    ├── DevEco Studio        (hdc 命令行工具)
    ├── HarmonyOS 知识库 API  (oh_knowledge)
    └── @deveco-codegenie/mcp-bridge (原生模块)
```

### 2.3 系统架构图

```
codegenie-old (async/await)               codegenie-cli (Effect-TS)
┌─────────────────────────┐               ┌─────────────────────────┐
│ import { Tool }         │   框架适配     │ import * as Tool        │
│ Tool.define("id", {     │ ───────────── │ Tool.define("id",       │
│   async execute() {}    │               │   Effect.gen(function*  │
│ })                      │               │   { return {            │
│                         │               │     execute: () =>      │
│ await Auth.get()        │               │       Effect.gen(...)   │
│ await ctx.ask()         │               │         .pipe(orDie)    │
│ throw new Error()       │               │   yield* auth.get()     │
│                         │               │   yield* ctx.ask()      │
│                         │               │   throw new Error()     │
└─────────────────────────┘               └─────────────────────────┘
```

---

## 3. 需求分析概述

### 3.1 需求来源

codegenie-old 已有成熟的 HarmonyOS 开发工具集，codegenie-cli 作为新仓库缺少这些功能。

### 3.2 需求目标

将 HarmonyOS 工具和 Plan 工具完整迁移到 codegenie-cli，适配 Effect 框架，保持功能对等。

### 3.3 关键利益相关者

| 角色 | 职责 | 关注点 |
|------|------|--------|
| HarmonyOS 开发者 | 使用工具进行应用开发和调试 | 功能完整、运行稳定 |
| 平台工程师 | 维护 codegenie-cli 架构 | 代码风格一致、类型安全、无侵入 |

---

## 4. 需求场景分析

### 4.1 业务场景

#### 4.1.1 业务流程图

```
开发者 → AI 助手 → 调用工具 → 结果返回
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     设备交互      Skill 私有分析      知识检索
     (hdc_log,     (arkts-runtime     (oh_knowledge
      switch_cwd)   -fix script)       → OAuth 认证)
```

#### 4.1.2 业务规则

| 规则编号 | 规则名称 | 规则描述 | 优先级 |
|----------|----------|----------|--------|
| BR-001 | DevEco 路径检测 | hdc_log 执行前需定位 DevEco 安装路径；runtime-fix 私有脚本自行定位 hdc | 高 |
| BR-002 | OAuth 认证 | oh_knowledge 需有效 OAuth token 才能调用知识库 API | 高 |
| BR-003 | Harmony 项目识别 | switch_cwd 校验目标目录包含 AppScope/app.json5 或 build-profile.json5 + oh-package.json5 | 中 |
| BR-004 | Plan 模式切换 | plan_enter/plan_exit 需用户确认后才切换 agent | 中 |
| BR-005 | Effect 错误通道 | 工具 execute 错误通道必须为 never，使用 .pipe(Effect.orDie) | 高 |

### 4.2 用户操作场景与关键路径

#### 4.2.1 用户角色定义

| 角色ID | 角色名称 | 角色描述 | 权限范围 |
|--------|----------|----------|----------|
| UR-001 | HarmonyOS 开发者 | 使用 AI 助手进行 HarmonyOS 应用开发和调试 | 工具调用、项目切换 |

#### 4.2.2 用户操作场景

**场景 US-001: 采集设备日志** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者通过 hdc_log 工具采集 HarmonyOS 设备日志 |
| 前置条件 | 设备已通过 USB/Wi-Fi 连接，DevEco Studio 已安装 |
| 操作步骤 | 1. AI 调用 hdc_log(action="collect")<br>2. 工具查找 DevEco 路径<br>3. 通过 hdc shell hilog -x 采集日志<br>4. 按 log_prefix 过滤，取最后 N 行返回 |
| 预期结果 | 返回匹配前缀的日志内容和元数据（行数） |
| 异常处理 | DevEco 未安装 → 提示设置 DEVECO_HOME；hdc 命令失败 → 返回错误信息 |

**场景 US-002: 分析崩溃日志** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 应用运行时崩溃，开发者通过 `arkts-runtime-fix` Skill 私有脚本分析原因 |
| 前置条件 | 崩溃日志可用（crash_log 参数直接提供，或从设备自动采集） |
| 操作步骤 | 1. AI 加载 `arkts-runtime-fix` Skill<br>2. 调用 `scripts/jscrash-report.mjs` 或 `parse-jscrash-log.mjs` 解析日志<br>3. 脚本分析错误类型、定位 crash anchor<br>4. 提取 top stack、suspected file 并生成结构化报告（含 next_action） |
| 预期结果 | 返回崩溃分析报告：错误类型、堆栈、疑似文件、下一步建议 |
| 异常处理 | 无 crash signature → 建议用 hdc_log 获取更完整日志 |

**场景 US-003: 检索鸿蒙知识** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者询问 HarmonyOS 开发问题，AI 优先使用知识库检索 |
| 前置条件 | 用户已通过 OAuth 授权（Auth.Service 提供 token） |
| 操作步骤 | 1. AI 调用 arkts_knowledge_search(question="...")<br>2. 工具通过 Auth.Service 获取 OAuth token<br>3. POST 请求知识库 API<br>4. 解析响应，提取检索结果 |
| 预期结果 | 返回知识库答案（截断到 5KB） |
| 异常处理 | 未授权 → 提示授权；4016 错误 → 提示重新授权 |

**场景 US-004: 切换项目目录** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者将 AI 助手的工作目录切换到另一个 HarmonyOS 项目 |
| 前置条件 | 目标目录存在且为有效目录 |
| 操作步骤 | 1. AI 调用 switch_cwd(project_path="...")<br>2. 解析路径（相对路径基于 Instance.directory）<br>3. 验证目录存在性和外部目录权限<br>4. 调用 setSessionCwd 更新会话 CWD<br>5. 校验是否为 Harmony 应用根目录 |
| 预期结果 | 会话目录已更新；若不是 Harmony 项目根，提示可创建新项目 |

**场景 US-005: Plan 模式工作流** (优先级: P2)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者使用 Plan-Build 双模式进行复杂任务开发 |
| 前置条件 | 无 |
| 操作步骤 | 1. AI 调用 plan_enter → 用户确认切换到 plan agent<br>2. AI 调用 plan_write(content="...") 写入计划文件<br>3. AI 调用 plan_exit → 用户确认切换到 build agent 开始实施 |
| 预期结果 | 计划文件保存到 `.opencode/plans/` 目录，agent 切换完成 |

#### 4.2.3 关键路径分析

| 路径编号 | 路径描述 | 关键节点 | 风险点 |
|----------|----------|----------|--------|
| KP-001 | 设备日志 → 崩溃分析 | hdc_log 或 runtime-fix 私有脚本采集 → arkts-runtime-fix 解析 | DevEco/hdc 路径未找到 |
| KP-002 | 知识检索 → 问题解决 | oh_knowledge → OAuth → API | OAuth token 过期 |
| KP-003 | 项目创建 → 切换 → 构建 | create-project skill → switch_cwd → NAPI 工具 | 项目结构不合规 |

### 4.3 研发与维护阶段场景

#### 4.3.1 开发阶段场景

| 场景 | 描述 | 注意事项 |
|------|------|----------|
| Effect 适配 | async → Effect.gen + Effect.orDie | execute 错误通道必须为 never |
| Auth 集成 | oh_knowledge 需要 Auth.Service | 在 init 阶段 yield* 捕获，execute 闭包使用 |
| 新增工具 | 按现有模式定义 Tool.define | 必须 import * as Tool 命名空间 |

#### 4.3.2 测试阶段场景

| 场景 | 描述 | 测试要点 |
|------|------|----------|
| 单元测试 | 工具参数校验 | zod schema 验证 |
| 集成测试 | Layer 依赖完整 | Auth.Service、Truncate.Service 等提供正确 |
| 端到端测试 | 实际设备连接测试 | hdc 命令可用性 |

### 4.4 兼容性分析

#### 4.4.1 版本兼容性

| 兼容类型 | 兼容要求 | 影响范围 |
|----------|----------|----------|
| API 兼容 | Tool.define 接口不变 | 所有工具 |
| Layer 兼容 | 新增 Auth.Service 依赖 | registry.ts、测试文件 |

#### 4.4.2 平台兼容性

| 平台 | 兼容性要求 | 备注 |
|------|------------|------|
| macOS | DevEco Studio 默认路径 /Applications/DevEco-Studio.app/Contents | 完全支持 |
| Linux | 需设置 DEVECO_HOME | 支持 |
| Windows | 需设置 DEVECO_HOME | 支持 |

---

## 5. 功能性需求分析

### 5.1 功能需求列表

| 需求编号 | 需求名称 | 需求描述 | 优先级 | 来源 |
|----------|----------|----------|--------|------|
| FR-001 | hdc_log 工具迁移 | Effect 适配，支持 collect/clear/list_devices 三种操作 | P1 | codegenie-old |
| FR-002 | jscrash_report 能力下沉 | 不保留全局工具；崩溃日志分析由 `arkts-runtime-fix` 私有 Node 脚本提供 | P1 | 默认 Skill 重构 |
| FR-003 | oh_knowledge 工具迁移 | Effect + Auth.Service 适配，支持鸿蒙知识库检索 | P1 | codegenie-old |
| FR-004 | switch_cwd 工具迁移 | Effect + external-directory 适配，支持项目目录切换 | P1 | codegenie-old |
| FR-005 | plan_write 工具迁移 | Effect 适配，支持写入计划文件到 .opencode/plans/ | P2 | codegenie-old |
| FR-006 | plan_enter 工具迁移 | Effect + Question/Session 适配，支持进入规划模式 | P2 | codegenie-old |
| FR-007 | lib 工具库迁移 | env.ts、session-cwd.ts 等纯工具函数直接复制 | P1 | codegenie-old |
| FR-008 | harmony_napi 迁移 | NAPI 原生桥接层迁移 | P2 | codegenie-old |
| FR-009 | 工具注册 | registry.ts 注册所有新工具，添加 Auth.Service Layer 依赖 | P1 | 依赖 FR-001~006 |
| FR-010 | 测试适配 | 更新测试文件 Layer 依赖链 | P1 | 依赖 FR-009 |

### 5.2 功能需求详细说明

#### FR-001: hdc_log 工具迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 将 hdc_log 工具从 async/await 适配为 Effect 框架，保持功能完全对等 |
| 验收标准 | 1. 支持 collect/clear/list_devices 三种 action<br>2. Effect.tryPromise 包装所有异步操作<br>3. 错误通过 throw 抛出，外层 .pipe(Effect.orDie)<br>4. 返回 HdcLogMetadata 元数据 |
| 关联场景 | US-001 |
| 依赖需求 | FR-007 (lib/env.ts) |

#### FR-003: oh_knowledge 工具迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 适配 Effect + Auth.Service，通过闭包捕获 Auth 服务实现 OAuth 认证 |
| 验收标准 | 1. init 阶段 yield* Auth.Service 捕获到闭包<br>2. execute 中通过 auth.get("codegenie") 获取 token<br>3. token 无效时 throw Error<br>4. 知识库 API 调用通过 Effect.tryPromise 包装 |
| 关联场景 | US-003 |
| 依赖需求 | FR-009 (Auth.Service Layer 依赖) |

#### FR-005: plan_write 工具迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 适配 Effect 框架，支持将计划内容写入 .opencode/plans/ 目录 |
| 验收标准 | 1. 通过 Session.Service 获取 session info<br>2. 使用 Session.plan(info) 获取路径<br>3. Effect.tryPromise 包装 mkdir + writeFile<br>4. 返回相对于 worktree 的显示路径 |
| 关联场景 | US-005 |
| 依赖需求 | FR-006 |

#### FR-006: plan_enter 工具迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 适配 Effect + Question/Session/Provider，支持进入规划模式 |
| 验收标准 | 1. 通过 Question.Service 弹窗确认<br>2. 用户拒绝时 yield* new Question.RejectedError()<br>3. 通过 Provider.Service 获取默认 model<br>4. 通过 Session.Service 创建 plan agent 消息 |
| 关联场景 | US-005 |
| 依赖需求 | 无 |

### 5.3 功能依赖关系

```
FR-007 (lib 工具库)
  ├── FR-001 (hdc_log) ──┐
  └── FR-008 (napi)     ──┤
                          ├── FR-009 (注册)
FR-003 (oh_knowledge) ───┤
FR-004 (switch_cwd)  ────┤
FR-005 (plan_write)  ────┤   ├── FR-010 (测试适配)
FR-006 (plan_enter)  ────┘
```

---

## 6. 非功能性需求分析

### 6.1 系统定位

面向 HarmonyOS 应用开发者，通过 AI 助手提供设备调试、知识检索、项目切换等通用工具能力；崩溃分析由默认 Skill 私有脚本承接。

### 6.2 系统可靠性

| 指标 | 要求 | 说明 |
|------|------|------|
| 容错 | DevEco 未安装时优雅降级 | hdc_log 和 runtime-fix 私有脚本给出明确错误提示 |
| 认证 | OAuth token 失效时明确提示 | oh_knowledge 返回授权失败信息 |

### 6.3 安全隐私

| 安全类型 | 需求描述 | 安全等级 |
|----------|----------|----------|
| 认证 | oh_knowledge 使用 OAuth token 访问知识库 | 高 |
| 权限 | switch_cwd 需通过 external_directory 权限检查 | 中 |
| token 存储 | OAuth token 由 Auth.Service 安全管理 | 高 |

### 6.4 可测试性

| 测试类型 | 测试要求 | 覆盖率目标 |
|----------|----------|------------|
| 类型检查 | tsc --noEmit 通过，无新增 error | 100% |
| Layer 依赖 | 测试文件提供完整的 Layer 链 | 关键路径 100% |

---

## 7. 系统影响分析

### 7.1 功能影响列表

| 影响模块 | 影响类型 | 影响程度 | 影响描述 |
|----------|----------|----------|----------|
| `src/tool/hdc_log.ts` | 新增 | 高 | HarmonyOS 设备日志工具 |
| `src/tool/oh_knowledge.ts` | 新增 | 高 | 知识库检索工具 |
| `src/tool/switch-cwd.ts` | 新增 | 中 | 项目目录切换工具 |
| `src/tool/plan.ts` | 修改 | 中 | 新增 PlanWriteTool、PlanEnterTool |
| `src/tool/plan-write.txt` | 新增 | 低 | plan_write 描述文件 |
| `src/tool/lib/` | 新增 | 中 | 5 个工具库文件 |
| `src/tool/registry.ts` | 修改 | 高 | 注册新工具 + Auth.Service 依赖 |
| `test/session/prompt-effect.test.ts` | 修改 | 低 | 添加 Auth.defaultLayer |
| `test/session/snapshot-tool-race.test.ts` | 修改 | 低 | 添加 Auth.defaultLayer |
| `src/tool/*.txt` | 新增 | 低 | 3 个工具描述文件 |

### 7.2 功能影响分析

#### 7.2.1 对现有功能的影响

| 现有功能 | 影响描述 | 兼容性处理 | 风险评估 |
|----------|----------|------------|----------|
| ToolRegistry Layer | 新增 Auth.Service 依赖 | 在 defaultLayer 中提供 Auth.defaultLayer | 低 |
| 测试 Layer 链 | 需要 Auth.Service | 两个测试文件添加 Layer.provide(Auth.defaultLayer) | 低 |
| plan.ts | 从仅 PlanExitTool 扩展为 3 个工具 | 保持 PlanExitTool 不变，新增 PlanWriteTool/PlanEnterTool | 低 |

#### 7.2.2 风险评估与缓解措施

| 风险项 | 风险等级 | 影响范围 | 缓解措施 |
|--------|----------|----------|----------|
| Effect 适配类型错误 | 中 | 工具文件 | 使用 .pipe(Effect.orDie) 确保 never 错误通道 |
| Auth.Service 未提供 | 高 | oh_knowledge 运行时 | registry defaultLayer 显式提供 |
| mcp-bridge 原生模块不可用 | 低 | harmony_napi.ts | 不影响其他工具，仅 NAPI 相关功能降级 |

---

## 附录

### A. 参考文档

| 文档名称 | 版本 | 来源 |
|----------|------|------|
| specs/harmonyos/tools-migration.md | 1.0 | codegenie-cli |
| codegenie-old specs/harmonyos/tools-migration.md | 1.0 | codegenie-old |
| .specs/features/002-harmonyos-tools/functional-design.md | 1.0 | codegenie-cli |

### B. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-22 | zhangyuchen | 初始版本 |
| 1.1 | 2026-04-23 | zhangyuchen | 完善用户场景、功能依赖、系统影响分析 |
| 1.2 | 2026-04-28 | Codex | 同步 `jscrash_report` 从全局工具下沉到 `arkts-runtime-fix` 私有脚本 |
