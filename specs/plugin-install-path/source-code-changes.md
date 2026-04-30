# 插件安装路径品牌迁移源代码变更记录 (Plugin Install Path Source Code Changes)

> **策略**: 本次修改采用**最小化修改策略**，仅修改直接影响插件安装路径的 4 个文件。全局应用名称（`global.ts`）的改动已由上游 `upstream-tracking-develop` 分支完成（文件已从 `packages/shared/src/global.ts` 迁移至 `packages/core/src/global.ts`，且 `app` 值已改为 `"codegenie"`），本次 MR 不包含该文件。

---

## 一、变更范围确认

### 已修改（必要变更）

| 文件路径 | 变更说明 | 状态 |
|---------|---------|------|
| `packages/opencode/src/plugin/install.ts` | 安装目录 + 类型签名 + patchName | ✅ 完成 |
| `packages/opencode/src/cli/cmd/plug.ts` | PlugDeps.files 类型签名 | ✅ 完成 |
| `packages/opencode/src/config/paths.ts` | fileInDirectory 查找顺序 | ✅ 完成 |
| `packages/opencode/src/config/config.ts` | 注释更新 | ✅ 完成 |

### 上游已完成（本次 MR 不包含）

| 文件路径 | 变更说明 | 说明 |
|---------|---------|------|
| `packages/core/src/global.ts`（原 `packages/shared/src/global.ts`） | 应用名 `opencode` → `codegenie` | 上游 `upstream-tracking-develop` 已完成，文件位置已迁移至 `packages/core/` |

### 已回退（不必要变更）

| 文件路径 | 原变更内容 | 回退原因 |
|---------|-----------|---------|
| `packages/opencode/src/config/agent.ts` | 移除 `.opencode/agent(s)/` 模式 | config-migration 已处理，保留向后兼容 |
| `packages/opencode/src/config/command.ts` | 移除 `.opencode/command(s)/` 模式 | config-migration 已处理，保留向后兼容 |
| `packages/opencode/src/file/ripgrep.ts` | `.opencode` → `.codegenie` 过滤 | 已有项目可能使用 `.opencode` 目录 |
| `packages/opencode/src/cli/cmd/agent.ts` | `.opencode` → `.codegenie` 路径 | config-migration 已处理 |
| `packages/opencode/src/session/session.ts` | `.opencode/plans` → `.codegenie/plans` | config-migration 已处理 |
| `packages/opencode/src/cli/cmd/tui/plugin/runtime.ts` | `.opencode` → `.codegenie` theme 路径（2 处） | config-migration 已处理 |
| `packages/opencode/script/build.ts` | `rm -rf dist` Windows 回退处理 | 与插件路径无关 |
| `bun.lock` | bin 名称 + overrides 变更 | 与本次修改无关 |

---

## 二、关键代码变更

### 2.1 install.ts — 插件安装逻辑

**文件**: `packages/opencode/src/plugin/install.ts`

**变更 1 — PatchDeps 类型**:
```typescript
// 原来
files: (dir: string, name: "opencode" | "tui") => string[]

// 改为
files: (dir: string, name: "codegenie" | "tui") => string[]
```

**变更 2 — patchDir 函数**:
```typescript
// 原来
return path.join(root, ".opencode")

// 改为
return path.join(root, ".codegenie")
```

**变更 3 — patchName 函数**:
```typescript
// 原来
function patchName(kind: Kind): "opencode" | "tui" {
  if (kind === "server") return "opencode"
  return "tui"
}

// 改为
function patchName(kind: Kind): "codegenie" | "tui" {
  if (kind === "server") return "codegenie"
  return "tui"
}
```

---

### 2.2 plug.ts — PlugDeps 类型签名

**文件**: `packages/opencode/src/cli/cmd/plug.ts`

**变更**: 类型签名与 install.ts 保持一致

```typescript
// 原来
files: (dir: string, name: "opencode" | "tui") => string[]

// 改为
files: (dir: string, name: "codegenie" | "tui") => string[]
```

---

### 2.3 paths.ts — 配置文件查找顺序

**文件**: `packages/opencode/src/config/paths.ts`

**变更**: `fileInDirectory` 优先返回 `.jsonc`

```typescript
// 原来（.json 优先）
return [path.join(dir, `${name}.json`), path.join(dir, `${name}.jsonc`)]

// 改为（.jsonc 优先）
return [path.join(dir, `${name}.jsonc`), path.join(dir, `${name}.json`)]
```

---

### 2.4 config.ts — 注释更新

**文件**: `packages/opencode/src/config/config.ts`

**变更**: 仅更新注释文本，无功能影响

```typescript
// 原来
// Auto-discovered plugins under `.opencode/plugin(s)` are already local files, so ConfigPlugin.load

// 改为
// Auto-discovered plugins under `.codegenie/plugin(s)` are already local files, so ConfigPlugin.load
```

---

## 三、变更原因

### 3.1 原始代码问题

`codegenie plugin <module>` 命令执行时，安装路径仍使用 `opencode` 品牌：

1. **本地安装目录错误**: `patchDir()` 返回 `.opencode` 而非 `.codegenie`
2. **配置文件名类型不匹配**: `patchName()` 返回 `"opencode"` 作为 server 类型插件的配置文件名前缀
3. **配置文件查找顺序**: `fileInDirectory` 优先查找 `.json`，但 `codegenie plugin install` 写入的是 `.jsonc`

> **注**: 全局路径 `Global.Path` 的 `app` 值已由上游改为 `"codegenie"`（`packages/core/src/global.ts`），不在本次修改范围内。

### 3.2 潜在风险

- 插件安装到 `.opencode/` 目录后，config-migration 已将配置发现逻辑指向 `.codegenie/`，导致已安装插件无法被加载
- `.json` 优先于 `.jsonc` 查找，安装后立即加载时可能找不到刚写入的 `.jsonc` 配置文件

### 3.3 修复后行为

- `codegenie plugin <module>` → 写入 `<project>/.codegenie/codegenie.jsonc`，scope 显示 `local (<project>/.codegenie)`
- `codegenie plugin <module> --global` → 写入 `~/.config/codegenie/codegenie.jsonc`，scope 显示 `global (~/.config/codegenie)`
- 配置文件查找优先匹配 `.jsonc`，与安装写入格式一致

---

## 四、变更文件统计

| 统计项 | 数量 |
|-------|------|
| 修改文件（核心） | 3 |
| 修改文件（注释） | 1 |
| 上游已完成（不含在本次 MR） | 1 |
| 回退文件 | 8 |

---

## 四、影响范围

### 4.1 直接影响

- `codegenie plugin install` 写入路径从 `.opencode` 变为 `.codegenie`
- 全局配置目录使用上游已迁移的 `~/.config/codegenie`（`packages/core/src/global.ts`）
- 配置文件查找优先匹配 `.jsonc`

### 4.2 无影响

- agent/command 发现逻辑不变（仍保留 `.opencode` 向后兼容模式）
- session plans 路径不变
- ripgrep 文件树过滤不变
- TUI theme 安装路径不变
- 构建脚本不变

---

## 五、验证结果

### 5.1 功能验证

```bash
# 本地安装测试
codegenie plugin oh-my-opencode
# 预期：写入 .codegenie/codegenie.jsonc，显示 Scope: local (<project>/.codegenie)

# 全局安装测试
codegenie plugin oh-my-opencode --global
# 预期：写入 ~/.config/codegenie/codegenie.jsonc，显示 Scope: global (~/.config/codegenie)
```

### 5.2 源代码验证

```bash
# 确认 plugin 相关文件类型签名已更新
grep -rn '"opencode" | "tui"' packages/opencode/src/plugin/
# 预期：0 处（已改为 "codegenie" | "tui"）

# 确认 .opencode 向后兼容模式保留
grep -rn '.opencode' packages/opencode/src/config/agent.ts
# 预期：仍有 .opencode/agent/ 模式（向后兼容）
```

---

## 六、版本历史

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| 1.1 | 2026-04-28 | 移除 global.ts 相关内容（上游 `upstream-tracking-develop` 已完成该改动，文件已迁移至 `packages/core/`） |
| 1.0 | 2026-04-28 | 初始版本 |
