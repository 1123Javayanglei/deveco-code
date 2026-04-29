# HarmonyOS Agents 迁移 - 源码修改清单

> **设计原则**: 将 codegenie-old 的 4 个 HarmonyOS Agent（build、plan、Ask、debug）+ explore prompt 更新迁移到 codegenie-cli，核心工作是 prompt 文件直接复制 + Agent 定义 Effect-TS 适配。

**后续变更（2026-04-29）**: 内置 **`debug` Agent 已下线**——`agent.ts` 的 `agents` 对象中不再注册 `debug`，`/agent list` 与默认 primary 候选中均不包含该 Agent。仓库内的 `prompt/debug.txt` 仍可保留，供日后恢复或通过用户配置自定义 Agent 引用；`PROMPT_DEBUG` import 若长期未使用可择机删除以避免未使用符号。

---

## 1. 修改概览

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `packages/opencode/src/agent/prompt/build.txt` | 新增 | ArkTS 编译构建 workflow prompt（直接复制） |
| `packages/opencode/src/agent/prompt/plan.txt` | 新增 | ArkTS 规划模式 prompt（直接复制） |
| `packages/opencode/src/agent/prompt/ask.txt` | 新增 | HarmonyOS 工程问答 prompt（直接复制） |
| `packages/opencode/src/agent/prompt/debug.txt` | 新增 | 假设驱动调试 prompt（直接复制；Agent 本体见下方「下线」说明） |
| `packages/opencode/src/agent/prompt/explore.txt` | 替换 | 通用搜索 → HarmonyOS/ArkTS 专业搜索（直接覆盖） |
| `packages/opencode/src/agent/agent.ts` | 修改 | 新增 4 个 prompt import + 修改/新增 Agent 定义；**2026-04-29 起移除内置 `debug` Agent 注册** |
| `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx` | 修改 | `/agents` 列表优先展示 `description`，不再对 `native` Agent 固定显示 `"native"` |

**总计**: 新增 4 个文件 + 替换 1 个文件 + 修改 2 个文件（含后续 TUI 修正）；内置 `debug` Agent 已按上节说明下线。

---

## 2. 新增文件说明

### 2.1 prompt 文件（直接复制）

以下 5 个 prompt 文件直接从 `codegenie-old/packages/opencode/src/agent/prompt/` 复制：

| 文件 | 行数 | 用途 |
|------|------|------|
| `build.txt` | ~142 | ArkTS 编译构建 Agent 的 system prompt，包含工具路由规则、ArkTS 编码规则、构建失败诊断流程 |
| `plan.txt` | ~113 | ArkTS 规划 Agent 的 system prompt，4 阶段 workflow、ArkTS 规划维度、计划输出格式 |
| `ask.txt` | ~170 | HarmonyOS 工程问答 Agent 的 system prompt，中文回答、搜索优先策略、代码链接规范 |
| `debug.txt` | ~120 | 假设驱动调试用 system prompt（10 步流程、插桩规则等）；**内置 `debug` Agent 已下线**，文件仍可作为自定义 Agent 的 `prompt` 来源保留 |
| `explore.txt` | ~26 | 替换通用版，HarmonyOS 项目结构先验、manifest 优先读取、ArkTS grep 锚点 |

---

## 3. 详细修改说明

### 3.1 `src/agent/agent.ts` 修改

#### 3.1.1 新增 import（文件顶部，现有 import 区域）

```typescript
// 在现有 import 之后添加
import PROMPT_BUILD from "./prompt/build.txt"
import PROMPT_PLAN from "./prompt/plan.txt"
import PROMPT_ASK from "./prompt/ask.txt"
import PROMPT_DEBUG from "./prompt/debug.txt"
```

#### 3.1.2 修改 `build` Agent 定义

位置：`agents` 对象中的 `build` 键

```typescript
// 修改前
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

// 修改后
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

**变更点**:
1. `description`: 更新为 ArkTS 专用描述
2. `plan_enter`: `"allow"` → `"ask"`
3. 新增 `plan_write: "deny"`
4. 新增 `prompt: PROMPT_BUILD`

#### 3.1.3 修改 `plan` Agent 定义

位置：`agents` 对象中的 `plan` 键

```typescript
// 修改前
plan: {
  name: "plan",
  description: "Plan mode. Disallows all edit tools.",
  options: {},
  permission: Permission.merge(defaults, Permission.fromConfig({
    question: "allow",
    plan_exit: "allow",
    external_directory: {
      [path.join(Global.Path.data, "plans", "*")]: "allow",
    },
    edit: {
      "*": "deny",
      [path.join(".opencode", "plans", "*.md")]: "allow",
      [path.relative(Instance.worktree, path.join(Global.Path.data, path.join("plans", "*.md")))]: "allow",
    },
  }), user),
  mode: "primary",
  native: true,
}

// 修改后
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

**变更点**:
1. `description`: 更新为 ArkTS 规划描述
2. `plan_exit`: `"allow"` → `"ask"`
3. 新增 `plan_write: "allow"`
4. 新增多个执行类工具 deny（bash、build_project 等）
5. `edit`: 从复杂的 glob 规则简化为 `"deny"`（plan prompt 本身会约束只写 plan 文件）
6. 移除 `external_directory` 和 glob-based edit 规则
7. 新增 `prompt: PROMPT_PLAN`

#### 3.1.4 新增 `Ask` Agent 定义

位置：`agents` 对象中，在 `plan` 之后、`general` 之前

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

#### 3.1.5 `debug` Agent（曾新增，**已下线**）

**历史**: 迁移阶段曾在 `agents` 中注册如下内置 `debug` primary Agent（位于 `plan` 与 `general` 之间）：

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

**当前（2026-04-29）**: 上述块已从 `packages/opencode/src/agent/agent.ts` 删除，产品侧不再提供内置 debug Agent。若需同等能力，可通过配置 `agent` 覆盖或后续重新注册。

---

## 4. 未修改的文件

| 文件 | 原因 |
|------|------|
| `src/agent/prompt/compaction.txt` | 两仓库一致 |
| `src/agent/prompt/title.txt` | 两仓库一致 |
| `src/agent/prompt/summary.txt` | cli 版本更优（保留） |
| `src/agent/generate.txt` | 两仓库一致 |
| `src/agent/agent.ts` 中的 `general` Agent | 保留，与 Ask 职责不同 |
| `src/agent/agent.ts` 中的 `explore` Agent | 仅 prompt 文件替换，定义中的 description 保持不变 |

---

## 5. 验证

1. **类型检查**: `bun run typecheck` 无新增错误
2. **构建验证**: `bun run build --single` 成功
3. **运行时验证**: 启动 opencode，`/agent list` 包含 build、plan 等当前内置 primary Agent；**不应**再出现内置 `debug`（已下线）。

---

## 6. TUI：`/agents` 与内置 Agent 说明文案（后续修正）

### 6.1 背景

TUI 中通过斜杠命令 **`/agents`**（或等价入口 **Switch agent**）打开 `DialogAgent`，列出可选 primary Agent。  
原先实现为：若 `Agent.Info.native === true`，则选项的副标题**固定为字符串** `"native"`，**忽略** `description` 字段。

HarmonyOS 迁移后在 `agent.ts` 中为 `build`、`plan` 等填写了 ArkTS 相关 `description`，但对话框仍只显示 `"native"`，用户无法从列表中区分用途。

### 6.2 行为变更

| 项目 | 修改前 | 修改后 |
|------|--------|--------|
| 副标题（`DialogSelect` 的 `description`） | `native ? "native" : description` | `description` 非空则展示 `description`；**仅当**无描述且为内置时回退 `"native"` |

实现逻辑（要点）：`item.description?.trim() || (item.native ? "native" : undefined)`。

### 6.3 涉及文件

- `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx` — `DialogAgent` 内 `options` 的 `description` 映射。

### 6.4 验证建议（手动）

1. 启动 CLI/TUI，输入 `/agents`。
2. 确认 `build`、`plan` 等行的副标题为 `agent.ts` 中配置的英文描述（例如 *ArkTS build-focused primary agent.*），而非固定 `"native"`。
