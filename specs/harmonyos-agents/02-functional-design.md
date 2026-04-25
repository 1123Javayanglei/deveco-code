# 功能设计说明书: HarmonyOS Agents 迁移

**功能分支**: `harmonyos-agents-migration`
**创建日期**: 2026-04-23
**状态**: 草稿
**关联需求文档**: [agents-01-requirements-analysis.md](agents-01-requirements-analysis.md)

---

## 1. 功能概述

### 1.1 功能简介

将 codegenie-old 中的 4 个 HarmonyOS 专用 Agent（build、plan、Ask、debug）及其配套 prompt 迁移到 codegenie-cli。迁移的核心工作是 prompt 文件直接复制 + Agent 定义 Effect-TS 适配。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 4 个 Agent + 4 个 prompt 完整迁移 | Agent 列表包含所有新 Agent |
| 质量目标 | 类型检查和构建通过 | typecheck + build 无错误 |
| 兼容目标 | 不破坏现有 Agent（general、explore 等） | 现有功能不受影响 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| Prompt 直接复制 | prompt 文件不修改，直接复制 | build.txt、plan.txt、ask.txt、debug.txt、explore.txt |
| 权限对齐 | Agent 权限配置与 codegenie-old 保持一致 | 所有 Agent 的 Permission.fromConfig |
| Effect 适配 | Agent 定义遵循 cli 的 Effect.gen + InstanceState 模式 | agent.ts 修改 |

---

## 2. 实现思路

### 2.1 整体方案

```
codegenie-old                         codegenie-cli
┌──────────────────┐                 ┌──────────────────┐
│ src/agent/        │   复制          │ src/agent/        │
│  prompt/          │───────────→     │  prompt/          │
│   build.txt       │   直接复制      │   build.txt  [NEW]│
│   plan.txt        │───────────→     │   plan.txt  [NEW]│
│   ask.txt         │───────────→     │   ask.txt   [NEW]│
│   debug.txt       │───────────→     │   debug.txt [NEW]│
│   explore.txt     │───────────→     │   explore.txt[MOD]│
│                   │                 │                   │
│ src/agent/agent.ts│   适配          │ src/agent/agent.ts│
│  build Agent def  │───────────→     │  build Agent def  │
│  plan Agent def   │───────────→     │  plan Agent def   │
│  Ask Agent def    │───────────→     │  Ask Agent def    │
│  debug Agent def  │───────────→     │  debug Agent def  │
└──────────────────┘                 └──────────────────┘
```

### 2.2 关键技术点

| 技术点 | 描述 | 解决方案 |
|--------|------|----------|
| Prompt 文件加载 | cli 使用 `import` 加载 .txt 文件 | 直接复制 .txt 文件，无需修改 |
| Agent 定义模式 | cli 使用 Effect.gen + InstanceState | Agent 定义在 `agents` 对象中，与 old 结构相同 |
| Permission 配置 | 两仓库 Permission API 一致 | 直接复制 Permission.fromConfig 调用 |
| import 路径 | 两仓库 import 路径可能不同 | 保持 cli 现有 import 不变，只修改 agents 对象内容 |

### 2.3 Effect-TS 适配要点

codegenie-cli 的 agent.ts 已使用 Effect-TS 框架。Agent 定义在 `InstanceState.make` 回调内的 `agents` 对象中，结构与 codegenie-old 的 `result` 对象完全对应：

```typescript
// codegenie-old (async/await)
const result: Record<string, Info> = {
  build: { name: "build", prompt: PROMPT_BUILD, ... },
  ...
}

// codegenie-cli (Effect-TS) - 相同结构
const agents: Record<string, Info> = {
  build: { name: "build", prompt: PROMPT_BUILD, ... },
  ...
}
```

Agent 定义的 `Info` 类型两仓库一致（zod schema 相同），因此 Agent 配置对象可以直接复制，只需确保 prompt 变量名有对应的 import。

---

## 3. 实现设计

### 3.1 模块划分

#### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/agent/prompt/build.txt` | 新增 | ArkTS 编译构建 workflow prompt |
| `src/agent/prompt/plan.txt` | 新增 | ArkTS 规划 mode prompt |
| `src/agent/prompt/ask.txt` | 新增 | HarmonyOS 工程问答 prompt |
| `src/agent/prompt/debug.txt` | 新增 | 假设驱动调试 prompt |
| `src/agent/prompt/explore.txt` | 替换 | 通用搜索 → HarmonyOS/ArkTS 专业搜索 |
| `src/agent/agent.ts` | 修改 | 新增 import + 修改/新增 Agent 定义 |

### 3.2 Agent 详细设计

#### 3.2.1 build Agent（修改现有）

```typescript
// 修改前 (codegenie-cli 当前)
build: {
  name: "build",
  description: "The default agent. Executes tools based on configured permissions.",
  options: {},
  permission: Permission.merge(defaults, Permission.fromConfig({
    question: "allow",
    plan_enter: "allow",
  }), user),
  mode: "primary",
  native: true,
}

// 修改后 (对齐 codegenie-old)
build: {
  name: "build",
  description: "ArkTS build-focused primary agent.",
  options: {},
  permission: Permission.merge(defaults, Permission.fromConfig({
    question: "allow",
    plan_enter: "ask",
    plan_write: "deny",
  }), user),
  mode: "primary",
  native: true,
  prompt: PROMPT_BUILD,
}
```

**关键变更**:
- 添加 `prompt: PROMPT_BUILD`
- `plan_enter: "allow"` → `"ask"`
- 新增 `plan_write: "deny"`
- description 更新

#### 3.2.2 plan Agent（修改现有）

```typescript
// 修改后 (对齐 codegenie-old)
plan: {
  name: "plan",
  description: "ArkTS planning agent with external plan-file workflow.",
  options: {},
  permission: Permission.merge(defaults, Permission.fromConfig({
    question: "allow",
    plan_exit: "ask",
    plan_write: "allow",
    bash: "deny",
    build_project: "deny",
    check_ets_files: "deny",
    perform_ui_action: "deny",
    get_app_ui_tree: "deny",
    start_app: "deny",
    hdc_log: "deny",
    edit: "deny",
  }), user),
  mode: "primary",
  native: true,
  prompt: PROMPT_PLAN,
}
```

**关键变更**:
- 添加 `prompt: PROMPT_PLAN`
- 大幅修改权限：deny bash/build_project/start_app 等执行类工具
- plan_write: "allow"、plan_exit: "ask"
- description 更新

#### 3.2.3 Ask Agent（新增）

```typescript
Ask: {
  name: "Ask",
  description: "Help developers analyze local project code and support engineering Q&A.",
  options: {},
  permission: Permission.merge(defaults, Permission.fromConfig({
    question: "deny",
    read: "allow",
    glob: "allow",
    grep: "allow",
    lsp: "allow",
    ls: "allow",
    codesearch: "allow",
    arkts_knowledge_search: "allow",
    todoread: "allow",
    bash: "deny",
    build_project: "deny",
    check_ets_files: "deny",
    perform_ui_action: "deny",
    get_app_ui_tree: "deny",
    start_app: "deny",
    hdc_log: "deny",
    edit: "deny",
    write: "deny",
    multiedit: "deny",
    apply_patch: "deny",
    skill: "deny",
    todowrite: "deny",
    plan_write: "deny",
  }), user),
  mode: "primary",
  prompt: PROMPT_ASK,
}
```

**特点**: 纯只读 Agent，只允许搜索和读取工具，拒绝所有修改操作。

#### 3.2.4 debug Agent（新增）

```typescript
debug: {
  name: "debug",
  description: "ArkTS runtime-evidence debug agent (without phone automation)",
  options: {},
  permission: Permission.merge(defaults, Permission.fromConfig({
    plan_enter: "deny",
    plan_exit: "deny",
  }), user),
  mode: "primary",
  prompt: PROMPT_DEBUG,
}
```

**特点**: 可使用大部分工具（build_project、start_app、hdc_log 等），但禁止进入/退出 plan 模式。

#### 3.2.5 explore prompt 更新

将 cli 的通用搜索 prompt 替换为 codegenie-old 的 HarmonyOS/ArkTS 专业版，包含：
- HarmonyOS 项目结构先验知识（AppScope、HAP 模块、oh-package.json5 等）
- ArkTS 特有的 `grep` 锚点（@State、@Component、UIAbility 等）
- 跳过目录规则（build/、.hvigor/、oh_modules/ 等）

### 3.3 import 变更

```typescript
// 新增 import
import PROMPT_BUILD from "./prompt/build.txt"
import PROMPT_PLAN from "./prompt/plan.txt"
import PROMPT_ASK from "./prompt/ask.txt"
import PROMPT_DEBUG from "./prompt/debug.txt"
```

---

## 4. 权限矩阵

| 权限 | build | plan | Ask | debug | explore |
|------|-------|------|-----|-------|---------|
| question | allow | allow | deny | allow | - |
| plan_enter | ask | - | - | deny | - |
| plan_exit | - | ask | - | deny | - |
| plan_write | deny | allow | deny | - | - |
| bash | allow | deny | deny | allow | allow |
| edit | allow | deny | deny | allow | - |
| read | allow | allow | allow | allow | allow |
| glob/grep | allow | allow | allow | allow | allow |
| build_project | allow | deny | deny | allow | - |
| start_app | allow | deny | deny | allow | - |
| hdc_log | allow | deny | deny | allow | - |
| arkts_knowledge_search | - | - | allow | - | - |
| skill | allow | - | deny | - | - |

---

## 5. Prompt 概要

### 5.1 build.txt（~142 行）

核心功能：ArkTS 编译构建 workflow Agent。
- 工具路由规则：build_project 编译、start_app 启动、hdc_log 日志采集
- ArkTS 编码规则：禁止 any/unknown/as/结构化类型
- 构建失败诊断流程：聚焦 ERROR 行、分类处理（类型错误、导入错误、资源错误等）
- 构建成功后自动 start_app
- 设备选择规则：优先真机、多设备时询问用户

### 5.2 plan.txt（~113 行）

核心功能：ArkTS 规划模式 Agent。
- 4 阶段 workflow：理解 → 设计 → 写计划 → 确认退出
- 严格约束：plan_write 和 plan_exit 不能在同一 turn 调用
- ArkTS 规划维度：生命周期、状态管理、导航、权限、资源、性能
- 计划输出格式：YAML frontmatter + markdown body

### 5.3 ask.txt（~170 行）

核心功能：HarmonyOS 工程问答 Agent。
- 必须使用中文回答
- 搜索优先：glob 查文件、grep 查符号
- 3-5 次搜索无结果后停止，引导用户补充信息
- 引用代码时必须带文件链接和行号
- 包含 HarmonyOS 经典工程目录结构参考

### 5.4 debug.txt（~120 行）

核心功能：假设驱动运行时调试 Agent。
- 10 步调试 workflow：生成假设 → 插桩 → 编译 → 部署 → 收集日志 → 确认/拒绝假设 → 修复 → 后验证
- 禁止行为：无证据声称修复、setTimeout/sleep 伪修复、验证前删除插桩
- 日志插桩规则：安全插入点（aboutToAppear 等生命周期）、禁止在 @Builder 函数中插桩
- 日志格式模板：`[DEBUG][H<id>] location=... | message=... | data=... | ts=... | runId=...`

### 5.5 explore.txt（~26 行，替换版）

核心功能：HarmonyOS/ArkTS 专业的文件搜索 Agent。
- HarmonyOS 项目结构先验知识
- 优先读取 manifest 文件（build-profile.json5、oh-package.json5、module.json5）
- ArkTS 高信号 grep 锚点
- 跳过目录规则

---

## 6. 验证方案

### 6.1 构建验证

```bash
# 类型检查
bun run typecheck

# 构建
bun run build --single
```

### 6.2 运行时验证

启动 opencode 后验证：
1. `/agent list` 显示 build、plan、Ask、debug
2. 切换到各 Agent，检查 system prompt 是否正确加载
3. 各 Agent 权限是否正确（如 Ask 不能执行 bash）

---

## 附录

### A. 设计决策记录

| 决策ID | 决策内容 | 决策原因 |
|--------|----------|----------|
| D-001 | 保留 `general` subagent | 与 `Ask` primary agent 职责不同，不可互相替代 |
| D-002 | prompt 文件直接复制不做修改 | prompt 内容与工具行为紧密绑定，迁移阶段保持一致 |
| D-003 | explore prompt 替换而非新增 | HarmonyOS 版是通用版的专业化超集 |

### B. 参考文档

| 文档名称 | 来源 |
|----------|------|
| agents-01-requirements-analysis.md | specs/harmonyos/ |
| agents-migration.md | specs/harmonyos/ |
| source-code-changes.md (tools) | specs/harmonyos/ |

### C. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-23 | zhangyuchen | 初始版本 |
