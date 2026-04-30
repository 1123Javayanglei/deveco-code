# 功能设计说明书: /feedback 与 /privacy 斜杠命令

**功能分支**: `feedback-privacy-commands`
**创建日期**: 2026-04-21
**状态**: 草稿
**关联需求文档**: [01-requirements-analysis.md](./01-requirements-analysis.md)

---

## 1. 功能概述

### 1.1 功能简介

在 codegenie-cli TUI 的命令注册体系中添加 `/feedback` 和 `/privacy` 两个系统级斜杠命令。用户可通过命令面板或斜杠输入触发，命令调用 `open()` 在浏览器中打开华为对应的页面。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 提供反馈和隐私政策的快捷入口 | 命令可正常触发并打开浏览器 |
| 功能目标 | Privacy 命令仅对 CodeGenie 用户可见 | 非 CodeGenie 用户看不到 Privacy 命令 |
| 质量目标 | 最小化代码改动 | 仅修改 1 个文件，新增约 30 行 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| 最小侵入 | 仅在必要位置添加代码，不修改现有逻辑 | 在命令列表末尾追加命令项 |
| 与原项目一致 | 实现与 codegenie-old 保持一致 | URL、命令名称、条件判断逻辑完全对齐 |
| 复用现有机制 | 利用已有的 command.register + slash + open() 体系 | 无需引入新依赖或新架构 |

---

## 2. 实现思路

### 2.1 整体方案

在 `app.tsx` 的 `command.register()` 调用中，于现有命令列表末尾追加两个命令项。利用现有的 TUI 命令注册机制，无需修改框架层代码。

### 2.2 核心流程

```
用户输入 /feedback 或 /privacy
         │
         ▼
 TUI prompt 检测 "/" 前缀
         │
         ▼
 autocomplete 匹配已注册的 slash 命令
         │
         ▼
 用户确认执行 ──▶ command.trigger()
         │
         ▼
 onSelect 回调执行
   ┌─────┴─────┐
   │           │
   ▼           ▼
open(url)   dialog.clear()
   │
   ▼
.catch(() => {})  ← 静默处理失败
```

### 2.3 关键技术点

| 技术点 | 描述 | 解决方案 |
|--------|------|----------|
| 条件渲染 | Privacy 命令需根据 provider 状态动态显示 | 使用展开运算符 + 三元表达式 `...(condition ? [item] : [])` |
| 浏览器打开 | 跨平台打开 URL | 使用已有的 `open` 包（import open from "open"） |
| 错误处理 | open() 可能失败 | `.catch(() => {})` 静默处理 |

---

## 3. 实现设计

### 3.1 模块设计

#### 3.1.1 模块划分

本次修改仅涉及一个文件，无新增模块。

#### 3.1.2 模块职责

| 模块名称 | 职责描述 | 修改内容 | 依赖模块 |
|----------|----------|----------|----------|
| `app.tsx` | TUI 主组件，包含命令注册 | 在 command.register() 中追加命令项 | useCommandDialog, useDialog, useSync, open |

### 3.2 详细设计

#### 3.2.1 修改位置

**文件**: `packages/opencode/src/cli/cmd/tui/app.tsx`
**修改位置**: `command.register(() => [...])` 调用中，diff_wrap 命令之后、闭合 `])` 之前

#### 3.2.2 新增代码

```typescript
// ─── Feedback 命令 ───
{
  title: "Feedback",
  description: "Submit complaints, suggestions or feedback",
  value: "feedback.open",
  slash: {
    name: "feedback",
  },
  onSelect: () => {
    open("https://developer.huawei.com/consumer/cn/support/feedback/#/").catch(() => {})
    dialog.clear()
  },
  category: "System",
},
// ─── Privacy 命令（仅 CodeGenie 用户可见） ───
...(sync.data.provider_next.connected.includes("codegenie")
  ? [
      {
        title: "Privacy",
        description: "Show privacy policy",
        value: "privacy.open",
        slash: {
          name: "privacy",
        },
        onSelect: () => {
          open("https://consumer.huawei.com/cn/privacy/privacy-statement-huawei/#/").catch(() => {})
          dialog.clear()
        },
        category: "System",
      },
    ]
  : []),
```

### 3.3 命令数据结构

| 字段 | /feedback 值 | /privacy 值 | 说明 |
|------|-------------|-------------|------|
| title | "Feedback" | "Privacy" | 命令面板显示名 |
| description | "Submit complaints, suggestions or feedback" | "Show privacy policy" | 命令面板描述 |
| value | "feedback.open" | "privacy.open" | 命令唯一标识 |
| slash.name | "feedback" | "privacy" | 斜杠命令名（/feedback、/privacy） |
| category | "System" | "System" | 命令面板分类 |
| 条件渲染 | 无（始终显示） | `sync.data.provider_next.connected.includes("codegenie")` | 隐私命令需要条件判断 |

---

## 4. 接口设计

### 4.1 依赖的现有接口

| 接口名称 | 提供方 | 接口描述 | 调用场景 |
|----------|--------|----------|----------|
| `command.register()` | useCommandDialog | 注册 TUI 命令到命令面板和斜杠命令体系 | app.tsx 初始化时 |
| `open(url)` | open 包 | 在默认浏览器中打开 URL | 用户触发命令时 |
| `dialog.clear()` | useDialog | 关闭当前打开的命令面板 | 命令执行后 |
| `sync.data.provider_next.connected` | useSync | 获取当前已连接的 provider 列表 | 判断是否显示 Privacy 命令 |

### 4.2 提供接口

本次修改不新增对外接口，仅注册 TUI 命令。

---

## 5. 依赖分析

### 5.1 已有依赖（无需新增）

| 依赖项 | 用途 | 引入方式 |
|--------|------|----------|
| `open` (npm包) | 打开浏览器 | `import open from "open"` — 文件中已存在 |
| `useCommandDialog` | 命令注册 | 文件中已存在 |
| `useDialog` | 关闭面板 | 文件中已存在 |
| `useSync` | 获取 provider 状态 | 文件中已存在 |

### 5.2 自动补全

斜杠命令自动补全由 `command.slashes()` 自动处理 — 注册的命令若包含 `slash` 字段，会自动出现在自动补全列表中，无需额外修改 autocomplete 逻辑。

---

## 6. 源码修改清单

| 文件 | 修改类型 | 行数 | 说明 |
|------|----------|------|------|
| `packages/opencode/src/cli/cmd/tui/app.tsx` | 修改 | +31 | 在 command.register() 末尾追加 Feedback 和 Privacy 命令项 |

**总计**: 修改 1 个文件，新增约 31 行。

---

## 附录

### A. 设计决策记录

| 决策ID | 决策内容 | 决策原因 | 决策日期 |
|--------|----------|----------|----------|
| D-001 | 使用展开运算符实现条件渲染 | 与现有代码风格一致，codegenie-old 同样采用此模式 | 2026-04-21 |
| D-002 | 不新建文件或模块 | 改动量极小（~30行），内联在命令列表中最简洁 | 2026-04-21 |

### B. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-21 | zhangyuchen | 初始版本 |
