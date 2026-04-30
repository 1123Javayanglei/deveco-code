# 配置迁移架构指南 (Config Migration Architecture Guide)

> **重要提示**: 本次迁移**无向后兼容**，采用直接替换策略。

## 一、三大原则

### 1.1 配置命名一致性原则 (Config Naming Consistency Principle)

#### 原则定义

所有配置相关的标识、名称、路径必须使用统一的品牌名称 `CodeGenie`。

#### 适用范围

- 配置文件名和目录名
- 环境变量前缀
- 配置继承开关

#### 不适用范围（不替换）

以下内容**不需要**进行品牌替换：

| 类别 | 内容 | 原因 |
|-----|------|------|
| URL 和链接 | `https://opencode.ai`、API 端点 | 外部资源 |
| SDK 包名 | `@opencode-ai/*` | 独立 NPM 包，有自己的 package.json |
| 外部依赖包名 | `opencode-gitlab-auth`、`opencode-poe-auth` | 外部认证插件 |
| Effect Service ID | `@opencode/Plugin` 等 | Effect 标识符 |
| SDK 类型 | `OpencodeClient`、`createOpencodeClient` | SDK 导出类型 |
| GitHub 仓库 | `sst/opencode` 等仓库 URL | 外部仓库地址 |
| 内部文件名 | `opencode-process.ts` 等文件名 | 文件名本身可能改，但 import 路径不一定同步 |

#### 实施要求

1. **全局替换**: 所有配置相关引用直接替换为 `CodeGenie`
2. **排除外部**: 不修改外部依赖引用
3. **文档同步**: 所有配置文档使用新品牌名称

#### 代码示例

```typescript
// 正确：新配置名
const CONFIG_FILE_NAME = 'codegenie.json'
const CONFIG_DIR_NAME = '.codegenie'
const ENV_PREFIX = 'CODEGENIE_'

// 错误：不应出现旧配置名（除非是外部引用）
const CONFIG_FILE_NAME = 'opencode.json'  // ❌ 应替换
```

---

### 1.2 配置路径统一原则 (Unified Config Path Principle)

#### 原则定义

所有配置路径必须使用统一的命名规范。

#### 命名规范

| 类型 | 名称 | 环境变量 |
|-----|------|---------|
| 配置文件 | codegenie.json | CODEGENIE_CONFIG_PATH |
| 配置目录 | .codegenie | CODEGENIE_CONFIG_DIR |
| 用户目录 | ~/.codegenie | - |

#### 发现顺序（简化版）

```
1. 环境变量指定的路径
2. 当前目录 ./codegenie.json 或 ./.codegenie
3. 用户目录 ~/.codegenie
```

#### 实施要求

- 统一发现逻辑
- 所有路径使用新品牌名称
- 无回退机制

---

### 1.3 继承禁用原则 (Inheritance Disable Principle)

#### 原则定义

默认禁用 Claude Code 配置继承，用户必须显式启用。

#### 设计理由

1. **避免配置冲突**: Claude Code 和 CodeGenie 可能有不同配置需求
2. **提供可预测性**: 用户明确知道配置来源
3. **明确责任边界**: CodeGenie 对自己的配置负责
4. **独立产品定位**: 与 CodeGenie 独立产品定位一致

#### 实现位置

- `packages/opencode/src/flag/flag.ts`
- `packages/opencode/src/session/instruction.ts`
- `packages/opencode/src/skill/index.ts`

#### 环境变量语义

```typescript
export const CODEGENIE_DISABLE_CLAUDE_CODE = !falsy("CODEGENIE_DISABLE_CLAUDE_CODE")
```

| 环境变量取值 | `falsy` | 结果 |
| ------------ | ------- | ---- |
| 未设置 | 假 | **禁用** |
| `0` / `false` | 真 | **启用** |
| 其他值 | 假 | **禁用** |

#### 启用方式

```bash
# 环境变量
export CODEGENIE_DISABLE_CLAUDE_CODE=0
export CODEGENIE_DISABLE_CLAUDE_CODE=false
```

#### 实施要求

1. **默认禁用**: 不做任何配置时，继承功能禁用
2. **显式启用**: 必须通过明确的配置项启用
3. **继承范围明确**: 明确哪些配置项会被继承

---

## 二、架构图

### 2.1 配置加载流程（简化版）

```
┌──────────────┐
│   CLI 启动    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  读取环境变量  │
│ CODEGENIE_*  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 发现配置文件  │
│ codegenie.json│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 发现配置目录  │
│ .codegenie   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 检查 Claude  │
│ Code 继承开关 │
│ (默认禁用)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  加载配置     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  配置就绪     │
└──────────────┘
```

---

## 三、设计决策

### 3.1 为什么默认禁用 Claude Code 继承？

**决策**: 默认禁用继承，用户需显式启用。

**理由**:
1. 配置来源明确，减少调试复杂度
2. 避免 Claude Code 和 CodeGenie 配置冲突
3. 提供更可预测的行为
4. 与 CodeGenie 独立产品定位一致

---

### 3.2 为什么不提供向后兼容？

**决策**: 直接替换，无向后兼容。

**理由**:
1. 最小化修改，减少复杂度
2. 避免"双重品牌"带来的维护负担
3. 代码更简洁，更易理解
4. 用户迁移成本可控（一次性替换）

---

### 3.3 为什么外部 SDK 包名不改？

**决策**: `@opencode-ai/*` 等外部包名保持不变。

**理由**:
1. 这些是独立的 NPM 包，有自己的 package.json
2. 改名会导致包解析失败
3. 外部依赖的命名是独立的决策，不随本项目迁移