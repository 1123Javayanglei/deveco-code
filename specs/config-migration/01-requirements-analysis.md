# 配置迁移需求分析 (Config Migration Requirements)

> **重要提示**: 本次迁移**不提供向后兼容**。所有旧品牌引用（OPENCODE_*、opencode.json、.opencode）将被完全替换，不会保留回退机制。

## 一、项目背景

### 1.1 迁移目标

将 OpenCode 配置系统迁移至 CodeGenie 品牌。本次迁移采用**直接替换策略**，不保留旧品牌支持，确保最小化修改。

### 1.2 核心变更范围（配置相关）

| 变更类型 | 原值 | 目标值 | 修改方式 |
|---------|------|--------|---------|
| 环境变量前缀 | OPENCODE_* | CODEGENIE_* | 全局替换 |
| 配置文件名 | opencode.json | codegenie.json | 全局替换 |
| 配置目录名 | .opencode | .codegenie | 全局替换 |
| Claude Code 继承 | 默认启用 | 默认禁用 | Flag 逻辑修改 |

---

## 二、功能点需求

### 2.1 环境变量替换

**需求**: 将所有 `OPENCODE_*` 环境变量直接替换为 `CODEGENIE_*`。

**环境变量映射表**:

| 新变量名 | 旧变量名 | 用途说明 |
|---------|---------|---------|
| CODEGENIE_API_KEY | OPENCODE_API_KEY | API 密钥 |
| CODEGENIE_API_URL | OPENCODE_API_URL | API 端点地址 |
| CODEGENIE_MODEL | OPENCODE_MODEL | 默认模型 |
| CODEGENIE_DEBUG | OPENCODE_DEBUG | 调试模式开关 |
| CODEGENIE_DISABLE_CLAUDE_CODE | OPENCODE_DISABLE_CLAUDE_CODE | Claude Code 禁用开关 |
| CODEGENIE_CONFIG_PATH | OPENCODE_CONFIG_PATH | 自定义配置路径 |
| CODEGENIE_CONFIG_DIR | OPENCODE_CONFIG_DIR | 配置目录路径 |
| CODEGENIE_CONFIG_CONTENT | OPENCODE_CONFIG_CONTENT | 配置内容 |
| CODEGENIE_CONSOLE_TOKEN | OPENCODE_CONSOLE_TOKEN | Console 认证令牌 |
| CODEGENIE_SERVER_PASSWORD | OPENCODE_SERVER_PASSWORD | 服务器密码 |
| CODEGENIE_AUTO_SHARE | OPENCODE_AUTO_SHARE | 自动分享 |
| CODEGENIE_MCP_PORT | OPENCODE_MCP_PORT | MCP 端口 |

**实现方式**: 全局字符串替换 `OPENCODE_` → `CODEGENIE_`

**验收标准**:
- [ ] 所有 `CODEGENIE_*` 环境变量可被正确读取
- [ ] 源代码中无 `OPENCODE_*` 引用（排除外部 SDK）

---

### 2.2 配置文件名替换

**需求**: 将配置文件名从 `opencode.json` 直接替换为 `codegenie.json`。

**修改范围**:
- 配置文件发现逻辑
- 配置文件名硬编码引用
- 文档和示例

**验收标准**:
- [x] `codegenie.json` 可被正确加载 ✅
- [x] 源代码中无 `opencode.json` 引用 ✅（排除主题文件）

---

### 2.3 配置目录名替换

**需求**: 将配置目录名从 `.opencode` 直接替换为 `.codegenie`。

**修改范围**:
- 目录发现逻辑
- 路径硬编码引用
- 全局配置目录（如 `~/.opencode` → `~/.codegenie`）

**验收标准**:
- [x] `.codegenie` 目录可被正确识别 ✅
- [x] 源代码中无 `.opencode` 引用 ✅（排除 URL）

---

### 2.4 Claude Code 继承禁用

**需求**: 默认禁用 Claude Code 配置继承功能。

**实现位置**:
- `packages/opencode/src/flag/flag.ts`
- `packages/opencode/src/session/instruction.ts`
- `packages/opencode/src/skill/index.ts`

**环境变量语义**:

| 环境变量取值 | 结果 |
| ------------ | ---- |
| 未设置 | **禁用**（不加载 .claude） |
| `0` / `false` | **启用**兼容 |
| 其他值 | **禁用** |

**代码实现**:
```typescript
export const CODEGENIE_DISABLE_CLAUDE_CODE = !falsy("CODEGENIE_DISABLE_CLAUDE_CODE")
```

**验收标准**:
- [ ] 默认不加载 `~/.claude/CLAUDE.md` 与项目 `.claude/skills`
- [ ] 设置 `CODEGENIE_DISABLE_CLAUDE_CODE=0` 或 `false` 时启用兼容

---

## 三、不修改的内容（重要）

以下内容**不应修改**（外部依赖或独立包）:

| 类别 | 内容 | 原因 |
|-----|------|------|
| SDK 包名 | `@opencode-ai/sdk`, `@opencode-ai/shared`, `@opencode-ai/plugin` | 独立的 NPM 包，有自己的 package.json |
| 外部插件 | `opencode-gitlab-auth`, `opencode-poe-auth` | 外部认证插件包 |
| SDK 类型 | `OpencodeClient`, `createOpencodeClient` | SDK 导出的类型名 |
| Effect 服务ID | `@opencode/Plugin`, `@opencode/Session` | Effect Context Service 标识符 |
| GitHub 仓库 | `sst/opencode` 等仓库 URL | 外部仓库地址 |
| 网站地址 | `https://opencode.ai` | 外部网站 URL |
| 内部文件名 | `opencode-process.ts` 等文件名 | 文件名本身可能改，但 import 路径不一定同步改 |

---

## 四、修改策略

### 4.1 全局替换

```bash
# 环境变量
OPENCODE_ → CODEGENIE_

# 配置名
opencode.json → codegenie.json
.opencode → .codegenie
```

### 4.2 Flag 逻辑修改

```typescript
// flag.ts
// 原来: truthy("OPENCODE_DISABLE_CLAUDE_CODE")  // 默认 false
// 改为: !falsy("CODEGENIE_DISABLE_CLAUDE_CODE") // 默认 true
```

---

## 五、验收清单

### 5.1 功能验收

- [x] 所有环境变量正确替换 ✅
- [x] 配置文件名正确替换 ✅
- [x] 配置目录名正确替换 ✅
- [x] Claude Code 继承默认禁用 ✅

### 5.2 排除验收

- [x] 确认无 `OPENCODE_*` 引用（排除外部 SDK） ✅
- [x] 确认无 `@codegenie-ai` 误改（应保持 `@opencode-ai`） ✅
- [x] 确认无 `codegenie-gitlab-auth` 误改（应保持原样） ✅
- [x] 确认无 Effect Service ID 误改 ✅