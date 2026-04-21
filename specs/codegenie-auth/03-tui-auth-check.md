# TUI 启动认证检测与引导 - 需求与功能设计

> **文档版本**: 2.0
> **创建日期**: 2026-04-21
> **关联文档**: [01-requirements-analysis.md](./01-requirements-analysis.md), [02-functional-design.md](./02-functional-design.md)
> **需求来源**: 为首次使用 CodeGenie CLI 的用户提供友好的引导体验

---

## 1. 功能概述

### 1.1 需求背景

当用户首次启动 CodeGenie CLI 的 TUI 时，如果用户：
1. 未登录 CodeGenie（华为账号）
2. 未配置任何 AI Provider

则显示一个引导界面，帮助用户完成首次配置。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 为首次用户提供友好的引导体验 | 用户在 30 秒内完成首次配置 |
| 性能目标 | 不影响已有用户的启动速度 | 已认证用户无额外延迟 |
| 质量目标 | 最大化复用现有机制 | 核心修改点 < 5 处 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| **Plugin/Hook 优先** | 使用 OpenCode 现有的 plugin/hook 机制 | 复用 `CodegenieAuthPlugin` 的 auth hook |
| **最小化修改** | 只修改必要的代码 | 仅修改 home.tsx 和 app.tsx |
| **避免循环依赖** | 插件文件不导入 `AppRuntime`/`Effect` | 使用 `saveAuthToDisk` 直接写 auth.json |

---

## 2. 技术架构

### 2.1 整体方案

**核心思路**：在 `home.tsx` 中检测用户认证状态，未认证时显示独立的 `CodeGenieOnboarding` 引导组件。

1. **检测逻辑**：在 `home.tsx` 中通过 `sync.data.provider` 检测是否有已配置的凭证
2. **引导组件**：独立的 `CodeGenieOnboarding` 组件，提供三步引导（entry → auth → providers）
3. **Auth 写入**：通过 `saveAuthToDisk()` 直接写 auth.json，避免导入 `AppRuntime`/`Effect`

### 2.2 关键约束：避免循环依赖

在 Effect 框架下，插件文件（`plugin/codegenie.ts`）和 TUI 组件（`codegenie-onboarding.tsx`）**不能**导入 `AppRuntime` 或 `Effect`，否则会导致循环依赖，应用启动时黑屏。

**解决方案**：在 `codegenie.ts` 中导出 `saveAuthToDisk()` 函数，直接读写 auth.json 文件：

```typescript
// plugin/codegenie.ts
const authFilePath = path.join(homedir(), ".local", "share", "opencode", "auth.json")
export async function saveAuthToDisk(key: string, info: Record<string, unknown>) {
  try {
    let data: Record<string, unknown> = {}
    if (fs.existsSync(authFilePath)) {
      data = JSON.parse(fs.readFileSync(authFilePath, "utf8"))
    }
    data[key] = info
    fs.writeFileSync(authFilePath, JSON.stringify(data, null, 2), { mode: 0o600 })
  } catch {}
}
```

### 2.3 认证检测流程

```
TUI 启动
    │
    ▼
sync.bootstrap() 完成 (sync.status === "complete")
    │
    ▼
┌─────────────────────────────────────────────────┐
│  检测: sync.data.provider 是否有非 opencode 的   │
│  provider（或有付费模型的 opencode）             │
└───────────────────────┬─────────────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
          有凭证              无凭证
              │                   │
              ▼                   ▼
        显示主界面      显示 CodeGenieOnboarding
        (Logo + Prompt)  (三步引导：entry → auth → providers)
                                │
                                ▼
                      引导完成 → setShowOnboarding(false)
                                → 显示主界面
```

---

## 3. 代码修改设计

### 3.1 修改清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `cli/cmd/tui/routes/home.tsx` | 修改 | 添加认证检测 + 条件渲染 CodeGenieOnboarding |
| `cli/cmd/tui/app.tsx` | 修改 | 移除自动弹出 DialogProviderList 的 createEffect |
| `cli/cmd/tui/component/codegenie-onboarding.tsx` | 新增 | CodeGenie 首次使用引导组件 |
| `cli/cmd/tui/component/logo.tsx` | 修改 | 添加 column 属性支持左右分列渲染 |
| `cli/logo.ts` | 修改 | 替换为 CodeGenie Logo 数据 |

### 3.2 home.tsx 认证检测

```tsx
const [showOnboarding, setShowOnboarding] = createSignal(false)
let authChecked = false

createEffect(
  on(
    () => sync.status,
    (status) => {
      if (status !== "complete") return
      if (authChecked) return
      authChecked = true
      const hasCredentials = sync.data.provider.some(
        (x) => x.id !== "opencode" || Object.values(x.models).some((y) => y.cost?.input !== 0),
      )
      if (!hasCredentials) {
        setShowOnboarding(true)
      }
    },
  ),
)
```

**说明**：
- 使用 `sync.data.provider` 而非 `Auth.all()`，避免导入 Auth/AppRuntime/Effect
- 复用 `useConnected()` 的逻辑判断是否有凭证
- `showOnboarding` 默认为 `false`，确保已登录用户先看到主界面

### 3.3 无需修改的模块

| 模块 | 原因 |
|------|------|
| `plugin/codegenie.ts` | 已通过 `saveAuthToDisk()` 解决 Auth 写入问题 |
| `context/sync.tsx` | 已提供 `provider` 和 `status` 检测能力 |
| `dialog-provider.tsx` | Onboarding 组件自行处理 Provider 列表 |

---

## 4. CodeGenieOnboarding 组件

### 4.1 三步引导流程

| 步骤 | 说明 |
|------|------|
| `entry` | 显示两个选项：CodeGenie OAuth、Other providers |
| `auth` | CodeGenie 浏览器 OAuth 登录等待界面 |
| `providers` | 其他 Provider 列表（排除 codegenie，按优先级排序） |

### 4.2 关键设计

- **键盘事件**：通过 `useKeyboard` 处理各步骤的导航，dialog 打开时自动禁用
- **Auth 写入**：使用 `saveAuthToDisk()` 写入 auth.json
- **引导完成**：调用 `props.onComplete()` 通知父组件切换回主界面
- **水平布局**：左 Logo + 右内容

---

## 5. 风险评估

### 5.1 风险列表

| 风险项 | 风险等级 | 影响范围 | 缓解措施 |
|--------|----------|----------|----------|
| 循环依赖导致黑屏 | 高 | 所有用户 | 插件文件不导入 AppRuntime/Effect |
| OAuth 服务不可用 | 中 | 首次用户无法登录 | 提供 Other providers 选项 |
| auth.json 并发写入 | 低 | 理论上可能 | saveAuthToDisk 有 try/catch 保护 |
| sync.data.provider 检测不准确 | 低 | 首次检测 | 使用与 useConnected() 相同的逻辑 |

---

## 6. 变更历史

| 版本 | 日期 | 变更描述 |
|------|------|----------|
| 1.0 | 2026-03-31 | 初始版本（copy 项目，使用 codegenieAuth.isLoggedIn() + DialogProviderList） |
| 2.0 | 2026-04-21 | 重写为新工程版本：使用 sync.data.provider 检测 + CodeGenieOnboarding 组件 + saveAuthToDisk |
