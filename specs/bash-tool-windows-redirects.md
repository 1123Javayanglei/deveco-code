# Bash 工具：Windows 重定向规范化

本文档与实现保持同步，描述在 Windows 上执行 Bash 工具时如何按**实际 shell** 把丢弃输出的重定向写法规范化，避免误用 `> null` / `>nul` 在工作目录生成名为 `null` 的文件或触碰保留设备名。

## 源码位置

| 职责 | 文件 |
|------|------|
| Shell 类型判定、命令行改写 | `packages/opencode/src/shell/shell.ts`（`Shell.redirectKind`、`Shell.adaptWindowsRedirects`） |
| 执行前应用改写 | `packages/opencode/src/tool/bash.ts`（`spawn` 使用 `run`，非 `params.command`） |
| 单元测试 | `packages/opencode/test/util/shell-redirect.test.ts` |

## 行为摘要

- 仅在 **`process.platform === "win32"`** 时对即将执行的命令字符串做改写；非 Windows 不修改。
- **`Shell.acceptable()`** 给出的 shell 路径决定 **`Shell.redirectKind(shellPath)`**：
  - **`powershell`**：`pwsh`、`powershell`（basename 去 `.exe` 后匹配）。
  - **`cmd`**：`cmd`。
  - **`posix_win`**：其余 Windows 下 shell（典型为 **Git Bash**、MSYS 等）。
- **`spawn` 的 `shell` 选项**仍为上述路径；仅 **`spawn` 的第一个参数（命令字符串）**被替换为改写后的 `run`。

权限与 tree-sitter 解析仍基于用户/模型提交的 **`params.command` 原文**，不因改写而与已批准的 pattern 不一致。

## 各 `redirectKind` 的替换规则

下列均为对整段命令字符串的正则替换（先处理 `>>` 再处理 `>`；字面量 `null` 使用 `(?!\$)`，避免误改已是 `>$null` 的 PowerShell 写法）。

### PowerShell（`powershell`）

| 意图 | 典型误写 | 替换为 |
|------|----------|--------|
| CMD 风格 NUL | `>nul`、`2>nul`、`>>nul`、`2>>nul`（大小写/空格宽松） | 对应 `>$null`、`2>$null`、`>>$null`、`2>>$null` |
| 误把 `null` 当黑洞 | `> null`、`>null`、`2> null`、`>> null` 等 | 同上，统一为 `$null` |

### Git Bash / MSYS 等（`posix_win`）

| 意图 | 典型误写 | 替换为 |
|------|----------|--------|
| CMD NUL | `>nul`、`2>nul`、`>>nul` 等 | `>/dev/null`、`2>/dev/null` 等 |
| PowerShell 风格 | `>$null`、`2>$null` 等 | 同上 → `/dev/null` |
| 误写 `null` 文件名 | `> null`、`>null` 等 | 同上 → `/dev/null` |

说明：在类 Bash 环境中应使用 **`/dev/null`**；`nul` 与字面量 **`null`** 在 Windows 上易导致保留名或普通文件 `null`。

### CMD（`cmd`）

| 意图 | 典型误写 | 替换为 |
|------|----------|--------|
| PowerShell 黑洞 | `>$null`、`2>$null` 等 | `>nul`、`2>nul` 等 |
| 误写 `null` 文件名 | `> null`、`>null` 等 | `>nul`、`2>nul` 等 |

## 未覆盖情形

复杂合并重定向（如部分 `2>&1` 组合）未逐一特殊处理；若需扩展，应在 `adaptWindowsRedirects` 中增补并与 `shell-redirect.test.ts` 同步。

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-04-23 | 初始文档：与 `Shell.redirectKind` / `adaptWindowsRedirects` 及 `bash.ts` 中 `run` 逻辑对齐 |
