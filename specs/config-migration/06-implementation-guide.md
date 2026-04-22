# 配置迁移实施指南 (Config Migration Implementation Guide)

> **重要提示**: 本次迁移采用**直接替换策略**，无向后兼容，实现最小化修改。

## 一、实施流程概述

### 1.1 阶段划分

```
Phase 1: Flag 逻辑修改
├── 修改 CODEGENIE_DISABLE_CLAUDE_CODE 默认值

Phase 2: 批量替换
├── 环境变量: OPENCODE_ → CODEGENIE_
├── 配置文件: opencode.json → codegenie.json
└── 配置目录: .opencode → .codegenie

Phase 3: 验证
├── 类型检查: bun typecheck
├── 安装验证: bun install
└── 源代码验证: grep 检查无遗漏
```

### 1.2 实施原则

1. **直接替换**: 无回退机制，无废弃警告
2. **排除外部**: 不修改 SDK 包名、外部插件、Effect ID
3. **批量执行**: 使用脚本批量替换
4. **立即验证**: 每批替换后立即验证

---

## 二、Phase 1: Flag 逻辑修改

### 2.1 Claude Code 继承禁用

**修改文件**: `packages/opencode/src/flag/flag.ts`

**修改内容**:
```typescript
// 原来
const OPENCODE_DISABLE_CLAUDE_CODE = truthy("OPENCODE_DISABLE_CLAUDE_CODE")

// 改为
export const CODEGENIE_DISABLE_CLAUDE_CODE = !falsy("CODEGENIE_DISABLE_CLAUDE_CODE")
```

**语义说明**:
- `truthy`: 值为非空非零字符串时返回 true（默认 false）
- `falsy`: 值为 `false` 或 `0` 时返回 true（默认 false）
- `!falsy`: 未设置时返回 true（默认禁用）

---

## 三、Phase 2: 批量替换

### 3.1 替换模式清单

| 原值 | 新值 | 位置 | 排除 |
|-----|------|------|------|
| `OPENCODE_` | `CODEGENIE_` | src, test | `@opencode-ai`, `OpencodeClient` |
| `opencode.json` | `codegenie.json` | src, test | - |
| `.opencode` | `.codegenie` | src, test | URL中的 |

### 3.2 批量替换脚本

```powershell
# PowerShell 批量替换脚本
$root = "packages/opencode/src"
Get-ChildItem -Path $root -Recurse -Include "*.ts" | ForEach-Object {
  $content = Get-Content -Raw -Path $_.FullName -Encoding utf8
  $orig = $content
  
  # 环境变量替换（排除外部引用）
  # 注意：不要替换 @opencode-ai 或 OpencodeClient
  
  $content = $content -replace "OPENCODE_", "CODEGENIE_"
  $content = $content -replace "Flag\.OPENCODE_", "Flag.CODEGENIE_"
  
  # 配置名替换
  $content = $content -replace 'opencode\.json', "codegenie.json"
  $content = $content -replace '\.opencode', ".codegenie"
  
  if ($content -ne $orig) {
    [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::utf8)
    Write-Host "Updated: $($_.FullName)"
  }
}
```

### 3.3 测试文件替换

```powershell
# 测试目录替换
$root = "packages/opencode/test"
Get-ChildItem -Path $root -Recurse -Include "*.ts" | ForEach-Object {
  $content = Get-Content -Raw -Path $_.FullName -Encoding utf8
  $orig = $content
  
  $content = $content -replace "OPENCODE_", "CODEGENIE_"
  $content = $content -replace "opencode\.json", "codegenie.json"
  $content = $content -replace "\.opencode", ".codegenie"
  $content = $content -replace "opencodeDir", "codegenieDir"
  
  if ($content -ne $orig) {
    [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::utf8)
  }
}
```

---

## 四、Phase 3: 验证

### 4.1 验证命令

```bash
# 类型检查
bun typecheck

# 安装验证
bun install

# 源代码验证 - 无 OPENCODE 引用（排除外部）
grep -r "OPENCODE_" packages/opencode/src | grep -v "@opencode-ai" | grep -v "OpencodeClient"

# 源代码验证 - 无误改
grep -r "@codegenie-ai" packages/opencode/src  # 应为空
grep -r "codegenie-gitlab-auth" packages/opencode/src  # 应为空
grep -r "@codegenie/" packages/opencode/src  # 应为空（Effect ID）
```

### 4.2 验证清单

- [ ] 类型检查通过: `bun typecheck` 无错误
- [ ] 安装通过: `bun install` 无错误
- [ ] 无 OPENCODE 引用（排除外部）
- [ ] 无 @codegenie-ai 误改
- [ ] 无外部插件误改
- [ ] 无 Effect ID 误改

---

## 五、不修改的内容（重要）

以下内容**不应修改**:

| 类别 | 内容 | 验证命令 |
|-----|------|---------|
| SDK 包名 | `@opencode-ai/*` | `grep @codegenie-ai src` 应为空 |
| 外部插件 | `opencode-gitlab-auth` | `grep codegenie-gitlab-auth src` 应为空 |
| SDK 类型 | `OpencodeClient` | 保持原样 |
| Effect ID | `@opencode/*` | `grep @codegenie/ src` 应为空 |
| 仓库 URL | GitHub 仓库地址 | 保持原样 |

---

## 五、常见问题处理

### 5.1 批量替换导致文件损坏

**问题**: PowerShell 正则替换可能破坏 UTF-8 编码或文件结构

**解决**: 使用 `[System.IO.File]::WriteAllText()` 替代 `Set-Content`

```powershell
# 安全写入方式
[System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::utf8)
```

### 5.2 Flag 变量引用不匹配

**问题**: Flag 定义已改，但引用文件未同步

**解决**: 全局搜索并替换 `Flag.OPENCODE_*` → `Flag.CODEGENIE_*`

---

## 六、实施检查清单

### 6.1 Phase 1 检查清单

- [ ] Flag 逻辑修改完成
- [ ] Claude Code 默认禁用生效

### 6.2 Phase 2 检查清单

- [ ] 环境变量替换完成
- [ ] 配置文件名替换完成
- [ ] 配置目录名替换完成

### 6.3 Phase 3 检查清单

- [ ] 类型检查通过
- [ ] 安装验证通过
- [ ] 源代码验证通过
- [ ] 无误改外部引用