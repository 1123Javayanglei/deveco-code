# 配置迁移功能点设计 (Config Migration Feature Design)

> **重要提示**: 本次迁移采用**直接替换策略**，无向后兼容，实现最小化修改。

## 一、功能点总览

### 1.1 功能点清单

| 编号 | 功能点名称 | 修改方式 | 状态 |
|-----|-----------|---------|------|
| F01 | 环境变量替换 | 全局替换 OPENCODE_ → CODEGENIE_ | 待执行 |
| F02 | 配置文件名替换 | 全局替换 opencode.json → codegenie.json | 待执行 |
| F03 | 配置目录名替换 | 全局替换 .opencode → .codegenie | 待执行 |
| F04 | Claude Code 继承禁用 | Flag 逻辑修改 | 待执行 |

---

## 二、功能点详细设计

### 2.1 F01 环境变量替换

#### 修改方式

**直接替换**: 所有 `OPENCODE_*` → `CODEGENIE_*`

#### 核心逻辑

```
环境变量读取流程:
1. 读取 CODEGENIE_* 变量
2. 若存在，返回该值
3. 若不存在，返回默认值
```

#### 替换模式

| 原变量 | 新变量 | 文件范围 |
|--------|--------|---------|
| `OPENCODE_*` | `CODEGENIE_*` | src/**/*.ts, test/**/*.ts |
| `Flag.OPENCODE_*` | `Flag.CODEGENIE_*` | src/**/*.ts |
| `"OPENCODE_"` 字串 | `"CODEGENIE_"` | 字串引用 |

#### 验证方法

```bash
# 确认无遗漏
grep -r "OPENCODE_" packages/opencode/src | grep -v "@opencode-ai|OpencodeClient"
```

---

### 2.2 F02 配置文件名替换

#### 修改方式

**直接替换**: `opencode.json` → `codegenie.json`

#### 核心逻辑

```
配置文件发现流程:
1. 检查环境变量 CODEGENIE_CONFIG_PATH
2. 若指定，加载该配置
3. 否则，查找 ./codegenie.json
4. 再查找 ~/.codegenie/codegenie.json
5. 返回找到的配置文件
```

#### 替换位置

| 文件 | 替换内容 |
|-----|---------|
| src/config/*.ts | 配置文件名硬编码 |
| test/**/*.ts | 测试中的配置文件引用 |

---

### 2.3 F03 配置目录名替换

#### 修改方式

**直接替换**: `.opencode` → `.codegenie`

#### 核心逻辑

```
配置目录发现流程:
1. 检查环境变量 CODEGENIE_CONFIG_DIR
2. 若指定，使用该目录
3. 否则，查找 ./.codegenie
4. 再查找 ~/.codegenie
5. 返回找到的目录
```

#### 替换位置

| 文件 | 替换内容 |
|-----|---------|
| src/**/*.ts | 目录名硬编码 |
| bin/codegenie | 脚本中的目录引用 |

---

### 2.4 F04 Claude Code 继承禁用

#### 修改方式

**Flag 逻辑修改**: 将默认值从"启用"改为"禁用"

#### 核心逻辑

```typescript
// flag.ts
export const CODEGENIE_DISABLE_CLAUDE_CODE = !falsy("CODEGENIE_DISABLE_CLAUDE_CODE")

// falsy 定义
function falsy(key: string): boolean {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}
```

#### 语义表

| 环境变量取值 | `falsy` | 结果 |
| ------------ | ------- | ---- |
| 未设置 | 假 | **禁用** |
| `0` / `false` | 真 | **启用** |
| 其他值 | 假 | **禁用** |

#### instruction.ts 修改

```typescript
const FILES = [
  "AGENTS.md",
  ...(Flag.CODEGENIE_DISABLE_CLAUDE_CODE_PROMPT ? [] : ["CLAUDE.md"]),
  "CONTEXT.md",
]
```

---

## 三、不修改的内容

以下内容**保持不变**:

| 类别 | 内容 | 原因 |
|-----|------|------|
| SDK 包 | `@opencode-ai/*` | 独立 NPM 包 |
| 外部插件 | `opencode-gitlab-auth`, `opencode-poe-auth` | 外部包 |
| SDK 类型 | `OpencodeClient` | SDK 导出 |
| Effect ID | `@opencode/*` | Effect 服务标识符 |
| 仓库 URL | GitHub 仓库地址 | 外部资源 |

---

## 四、执行顺序

### 4.1 推荐执行顺序

```
1. Flag 逻辑修改 (F04) - 影响后续环境变量使用
2. 环境变量替换 (F01) - 批量替换
3. 配置文件名替换 (F02) - 批量替换
4. 配置目录名替换 (F03) - 批量替换
5. 测试验证 - 确认无遗漏
```

### 4.2 验证命令

```bash
# 确认无 OPENCODE 引用（排除外部）
grep -r "OPENCODE_" packages/opencode/src | grep -v "@opencode-ai|OpencodeClient"

# 确认无误改
grep -r "@codegenie-ai" packages/opencode/src  # 应为空
grep -r "codegenie-gitlab-auth" packages/opencode/src  # 应为空

# 类型检查
bun typecheck
```

---

## 五、批量替换脚本示例

```bash
# PowerShell 批量替换
$root = "packages/opencode/src"
Get-ChildItem -Path $root -Recurse -Include "*.ts" | ForEach-Object {
  $content = Get-Content -Raw -Path $_.FullName
  $orig = $content
  
  # 环境变量替换
  $content = $content -replace "OPENCODE_", "CODEGENIE_"
  $content = $content -replace "Flag\.OPENCODE_", "Flag.CODEGENIE_"
  
  # 配置名替换
  $content = $content -replace "opencode\.json", "codegenie.json"
  $content = $content -replace "\.opencode", ".codegenie"
  
  if ($content -ne $orig) {
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "Updated:" $_.FullName
  }
}
```