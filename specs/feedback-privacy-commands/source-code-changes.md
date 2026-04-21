# /feedback 与 /privacy 斜杠命令迁移 - 源码修改清单

> **设计原则**: 最小侵入式修改，在命令列表末尾追加两个命令项，与 codegenie-old 实现完全一致。

---

## 1. 修改概览

| 文件 | 修改类型 | 行数 | 说明 |
|------|----------|------|------|
| `packages/opencode/src/cli/cmd/tui/app.tsx` | 修改 | +31 | 在 command.register() 末尾追加 Feedback 和 Privacy 命令项 |

**总计**: 修改 1 个文件。

---

## 2. 详细修改说明

### `packages/opencode/src/cli/cmd/tui/app.tsx`

**修改内容**: 在 `command.register(() => [...])` 的命令列表末尾（diff_wrap 命令之后、闭合 `])` 之前）追加 Feedback 和 Privacy 两个命令项。

**修改前**: 命令列表末尾为 diff_wrap 命令，无 Feedback 和 Privacy 相关命令。

**修改后**: 在 diff_wrap 命令之后追加两个命令项。

**关键变更**:

1. **Feedback 命令**:
   - 标题为 "Feedback"，描述为 "Submit complaints, suggestions or feedback"
   - 命令值为 `feedback.open`，支持斜杠命令 `/feedback`
   - 点击后通过 `open()` 打开华为开发者反馈页面 `https://developer.huawei.com/consumer/cn/support/feedback/#/`
   - 归类为 "System" 类别，所有用户可见
   - 错误处理：`.catch(() => {})` 静默处理

2. **Privacy 命令**:
   - 标题为 "Privacy"，描述为 "Show privacy policy"
   - 命令值为 `privacy.open`，支持斜杠命令 `/privacy`
   - 点击后通过 `open()` 打开华为隐私政策页面 `https://consumer.huawei.com/cn/privacy/privacy-statement-huawei/#/`
   - 归类为 "System" 类别
   - 使用条件渲染：仅当 `sync.data.provider_next.connected.includes("codegenie")` 时显示
   - 错误处理：`.catch(() => {})` 静默处理

**修改原因**:

1. 将 codegenie-old 中的 `/feedback` 和 `/privacy` 命令迁移到 codegenie-cli
2. Feedback 对所有用户可见，提供统一反馈入口
3. Privacy 仅对 CodeGenie 登录用户显示，因隐私政策指向华为消费者隐私页面

**新增代码**:

```typescript
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

---

## 3. 未修改的文件

| 文件 | 原因 |
|------|------|
| `autocomplete.tsx` | 斜杠命令自动补全由 `command.slashes()` 自动从已注册命令的 `slash` 字段生成，无需额外修改 |
| `prompt/index.tsx` | 斜杠命令检测和发送机制与命令注册表解耦，无需修改 |
| `dialog-command.tsx` | 命令面板 UI 从 `command.register()` 自动读取，无需修改 |
| `src/command/index.ts` | 后端命令体系用于 skill/mcp 命令，TUI 命令是前端注册的，不走后端 |

---

## 4. 依赖说明

所有依赖在目标文件中已存在，无需新增 import：

| 依赖 | 来源 | 用途 |
|------|------|------|
| `open` | `import open from "open"` (第56行) | 打开浏览器 |
| `sync` | `const sync = useSync()` (第214行) | 获取 provider 连接状态 |
| `dialog` | `const dialog = useDialog()` (第204行) | 关闭命令面板 |
| `command` | `const command = useCommandDialog()` (第207行) | 注册命令 |
