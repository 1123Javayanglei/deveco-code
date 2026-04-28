# 功能设计说明书: HarmonyOS Skills 迁移

**功能分支**: `001-skills-migration`
**创建日期**: 2026-04-22
**状态**: 草稿
**关联需求文档**: [01-requirements-analysis.md](./01-requirements-analysis.md)

---

## 1. 功能概述

### 1.1 功能简介

将 codegenie-old 仓库中的 4 个 HarmonyOS Skill 资源迁移到 codegenie-cli，采用与 codegenie-old 相同的"构建时嵌入 + 运行时提取"机制，确保 Skill 可被 AI 通过 skill tool 自动发现和加载。

### 1.2 设计目标

| 目标类型 | 目标描述 | 衡量标准 |
|----------|----------|----------|
| 功能目标 | 4 个 Skill 完整迁移，AI 可自动发现和加载 | skill tool 列表显示 4 个 Skill |
| 性能目标 | Skill 提取仅在版本变更时执行 | 缓存命中时跳过提取 |
| 质量目标 | 迁移后行为与 codegenie-old 一致 | 无功能回归 |

### 1.3 设计原则

| 原则 | 描述 | 应用场景 |
|------|------|----------|
| 一致性 | 采用与 codegenie-old 相同的嵌入+提取机制 | defaults.ts 设计参照 codegenie-old |
| 幂等性 | 版本未变时跳过提取 | 缓存版本检查 |
| 最小侵入 | 默认 Skill 接入阶段尽量复用已有 Skill Discovery；后续脚本运行时改造仅触达默认 Skill 资源、构建嵌入和提取逻辑 | src/skill/index.ts 不因脚本 Node 化继续修改 |

---

## 2. 实现思路

### 2.1 整体方案

采用与 codegenie-old 一致的两阶段方案，并在默认 Skill 脚本 Node 化后补充二进制资源处理：

1. **构建时嵌入**：`build.ts` 读取 `resources/skills/` 下所有文件，文本资源按 UTF-8 字符串嵌入，`.png` 等二进制资源按 base64 对象嵌入，通过 Bun 的 `define` 选项嵌入为 `CODEGENIE_DEFAULT_SKILLS` 常量。
2. **运行时提取**：`src/skill/defaults.ts` 首次运行时将嵌入的 Skill 文件提取到 `Global.Path.data/skills/`；文本资源写字符串，base64 资源解码为 `Uint8Array` 写出，Skill Discovery 扫描该目录。
3. **脚本执行**：默认 Skill 私有脚本发布为 Node ESM `.mjs`，用户侧只依赖 `node` 命令，不依赖 Bun、tsx、ts-node 或 TypeScript 运行能力。

### 2.2 技术架构

```
构建时:
resources/skills/                    build.ts
┌────────────────────────┐           ┌────────────────────┐
│ arkts-error-fixes/     │           │ 读取 resources/skills/
│ arkts-runtime-fix/     │──读取────▶│ 序列化为 JSON      │
│ arkui-knowledge/       │           │ define 嵌入到二进制 │
│ deveco-create-project/ │           └────────────────────┘
└────────────────────────┘                    │
                                              ▼
                                   CODEGENIE_DEFAULT_SKILLS
                                   (嵌入在二进制中)

运行时:
二进制启动
    │
    ▼
defaults.ts (首次运行或版本变更)
    │
    ▼
提取到 Global.Path.data/skills/
├── arkts-error-fixes/SKILL.md + assets/ + reference/
├── arkts-runtime-fix/SKILL.md + scripts/
├── arkui-knowledge/SKILL.md
└── deveco-create-project/SKILL.md + scripts/ + application/
    │
    ▼
Skill Discovery (src/skill/index.ts)
    │  scan(defaultDir, SKILL_PATTERN)
    ▼
skill tool 可用
```

### 2.3 核心流程

```
应用启动
    │
    ▼
Skill.layer 初始化
    │
    ▼
discoverSkills()
    │
    ├── 1. defaults.ts ensure()
    │       ├── 检查 ~/.local/share/opencode/skills/.version
    │       ├── 版本匹配 → 跳过提取
    │       └── 版本不匹配 → 清空 + 提取 + 写 .version
    │
    ├── 2. scan(defaultDir, "**/SKILL.md")
    │
    ├── 3. 扫描外部目录 (.claude, .agents)
    │
    ├── 4. 扫描 config directories
    │
    └── 5. 扫描自定义 skill paths

    ▼
loadSkills() → 解析所有 SKILL.md → 注册到 state
```

### 2.4 关键技术点

| 技术点 | 描述 | 解决方案 |
|--------|------|----------|
| Skill 文件嵌入 | Skill 资源需要打包到二进制中 | build.ts 中 `define: { CODEGENIE_DEFAULT_SKILLS: ... }` |
| Skill 版本缓存 | 避免每次启动都重新提取 | .version 文件比对，版本未变则跳过 |
| Skill Discovery 集成 | 让 Skill Discovery 扫描提取目录 | 在 discoverSkills() 中新增 defaults.ensure() + scan() |
| 构建时文件读取 | 递归读取 Skill 目录下所有文件 | walk() 函数遍历目录树 |
| 二进制资源嵌入 | 模板图片等资源不可按文本嵌入 | 按扩展名识别二进制资源，使用 base64 嵌入并在提取时解码 |
| 私有脚本运行时 | 默认 Skill 脚本需要在用户提取目录中独立执行 | 发布 `.mjs`，脚本内部只使用 Node 标准库和 Skill 目录内文件 |

---

## 3. 实现设计

### 3.1 `resources/skills/`（新增）

从 codegenie-old 复制 4 个 Skill 目录；当前实现已对脚本运行时和部分资源说明做产品化调整：

```
resources/skills/
├── arkts-error-fixes/
│   ├── SKILL.md
│   ├── assets/          (32 个 .ets 示例)
│   └── reference/       (28 个 .md 参考文档)
├── arkts-runtime-fix/
│   ├── SKILL.md
│   └── scripts/
│       ├── jscrash-report.mjs
│       ├── collect-hilog.mjs
│       ├── fetch-faultlog.mjs
│       ├── parse-jscrash-log.mjs
│       ├── probe-faultlogger.mjs
│       └── shared/
│           ├── hdc.mjs
│           ├── jscrash-faultlogger.mjs
│           ├── jscrash-parse.mjs
│           └── utils.mjs
├── arkui-knowledge/
│   └── SKILL.md
└── deveco-create-project/
    ├── SKILL.md
    ├── scripts/
    │   ├── copy-template.mjs
    │   └── detect-sdk.mjs
    └── application/
        ├── AppScope/
        ├── entry/
        ├── build-profile.json5
        └── ... (完整 ArkTS 项目模板)
```

### 3.2 `src/skill/defaults.ts`（新增）

参照 codegenie-old 的同名文件，使用 Effect 框架重写：

```typescript
import path from "path"
import { Effect } from "effect"
import { Global } from "@/global"
import { AppFileSystem } from "@opencode-ai/shared/filesystem"
import { Log } from "@/util"

type EmbeddedSkillFile = string | { encoding: "base64"; content: string }
declare const CODEGENIE_DEFAULT_SKILLS: Record<string, Record<string, EmbeddedSkillFile>> | undefined

export namespace Defaults {
  const log = Log.create({ service: "skill-defaults" })

  export const ensure = Effect.fn("Skill.Defaults.ensure")(function* (
    version: string,
    fsys: AppFileSystem.Interface,
  ) {
    const dir = path.join(Global.Path.data, "skills")
    const versionFile = path.join(dir, ".version")

    // 版本匹配检查
    const current = yield* fsys.readText(versionFile).pipe(Effect.catch(() => Effect.succeed("")))
    if (current === version && current !== "local") {
      return dir
    }

    log.info("extracting default skills", { version })

    // 清空旧文件
    yield* fsys.remove(dir, { recursive: true, force: true }).pipe(Effect.catch(() => Effect.void))

    // 从嵌入数据提取
    const data = typeof CODEGENIE_DEFAULT_SKILLS !== "undefined" ? CODEGENIE_DEFAULT_SKILLS : {}
    for (const [skillName, files] of Object.entries(data)) {
      for (const [fileName, content] of Object.entries(files)) {
        const target = path.join(dir, skillName, fileName)
        if (typeof content === "string") {
          yield* fsys.writeWithDirs(target, content)
        } else {
          yield* fsys.writeWithDirs(target, Uint8Array.from(Buffer.from(content.content, "base64")))
        }
      }
    }

    // 写版本标记
    yield* fsys.writeWithDirs(versionFile, version)

    return dir
  })
}
```

### 3.3 `src/skill/index.ts`（修改）

在 `discoverSkills` 函数中新增默认 Skill 扫描：

```typescript
// 新增导入
import { Defaults } from "./defaults"
import { Installation } from "@/installation"

// 在 discoverSkills 函数开头，configDirs 之前新增：
// 1. 提取默认 Skills（嵌入资源）
const defaultDir = yield* Defaults.ensure(Installation.VERSION, fsys)
yield* scan(state, defaultDir, SKILL_PATTERN)
```

插入位置：在 `if (!Flag.OPENCODE_DISABLE_EXTERNAL_SKILLS)` 块之前。

### 3.4 `script/build.ts`（修改）

在构建时嵌入 Skill 资源文件：

```typescript
// 新增：读取默认 Skills
const defaultSkillsDir = path.join(dir, "resources/skills")
type EmbeddedSkillFile = string | { encoding: "base64"; content: string }
const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bin"])
const defaultSkillsData: Record<string, Record<string, EmbeddedSkillFile>> = {}
if (fs.existsSync(defaultSkillsDir)) {
  for (const entry of await fs.promises.readdir(defaultSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const files: Record<string, string> = {}
    const skillPath = path.join(defaultSkillsDir, entry.name)
    for (const file of await walk(skillPath)) {
      const rel = path.relative(skillPath, file)
      files[rel] = binaryExtensions.has(path.extname(file).toLowerCase())
        ? { encoding: "base64", content: Buffer.from(await Bun.file(file).arrayBuffer()).toString("base64") }
        : await Bun.file(file).text()
    }
    defaultSkillsData[entry.name] = files
  }
}
console.log(`Loaded ${Object.keys(defaultSkillsData).length} default skills`)

// 在 Bun.build 的 define 中添加：
define: {
  // ...existing defines...
  CODEGENIE_DEFAULT_SKILLS: JSON.stringify(defaultSkillsData),
}
```

### 3.5 `src/flag/flag.ts`（修改）

新增 Flag（可选，用于禁用默认 Skills）：

```typescript
export const OPENCODE_DISABLE_DEFAULT_SKILLS = truthy("OPENCODE_DISABLE_DEFAULT_SKILLS")
```

---

## 4. 环境变量

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `OPENCODE_DISABLE_DEFAULT_SKILLS` | `false` | 禁用默认 Skill 提取（开发调试用） |

---

## 5. 设计决策

| 决策 | 原因 |
|------|------|
| 采用"构建时嵌入 + 运行时提取" | 与 codegenie-old 一致，Skill 文件打包在二进制中，用户无需额外下载 |
| defaults.ts 使用 Effect 框架 | 与 codegenie-cli 整体架构一致 |
| 版本缓存机制 | 避免每次启动都重新提取，提升启动性能 |
| .version 文件比对 | 简单可靠，与 codegenie-old 行为一致 |
| 默认 Skill 私有脚本发布为 `.mjs` | 用户侧只依赖 Node，不要求安装 Bun 或 TypeScript 运行器 |
| 构建嵌入区分文本和二进制 | 避免模板图片等二进制资源在默认 Skill 提取后损坏 |

---

## 6. 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `resources/skills/arkts-error-fixes/` | 新增目录 | 从 codegenie-old 复制，含 SKILL.md + assets/ + reference/ |
| `resources/skills/arkts-runtime-fix/` | 新增目录 | 从 codegenie-old 复制，含 SKILL.md + scripts/ |
| `resources/skills/arkui-knowledge/` | 新增目录 | 从 codegenie-old 复制，含 SKILL.md |
| `resources/skills/deveco-create-project/` | 新增目录 | 从 codegenie-old 复制，含 SKILL.md + scripts/ + application/ |
| `src/skill/defaults.ts` | 新增 | Effect 版默认 Skill 提取逻辑 |
| `src/skill/index.ts` | 修改 | 在 discoverSkills 中新增 defaults.ensure() + scan() |
| `script/build.ts` | 修改 | 读取 resources/skills/ 并嵌入到 CODEGENIE_DEFAULT_SKILLS，二进制资源使用 base64 |

---

## 附录

### A. 设计决策记录

| 决策ID | 决策内容 | 决策原因 | 决策日期 |
|--------|----------|----------|----------|
| D-001 | 采用嵌入+提取而非直接扫描 resources/ | codegenie-cli 的 Skill Discovery 不扫描 resources/ 目录，需要提取到 data 目录 | 2026-04-22 |
| D-002 | defaults.ts 使用 Effect 框架 | 与 codegenie-cli 整体架构一致，可访问 AppFileSystem 服务 | 2026-04-22 |
| D-003 | 默认 Skill 私有脚本从 Bun/TS 改为 Node/.mjs | 降低用户空白环境依赖，不让默认 Skill 隐式依赖 Bun 或 TS 运行器 | 2026-04-28 |
| D-004 | `jscrash_report` 下沉到 `arkts-runtime-fix` 私有脚本 | 崩溃分析能力只服务 runtime-fix Skill，作为全局内置工具会扩大公共工具面 | 2026-04-28 |
| D-005 | 默认 Skill 嵌入支持 base64 二进制资源 | `deveco-create-project` 模板包含 `.png` 等二进制资源，文本嵌入会损坏文件 | 2026-04-28 |

### B. 参考文档

| 文档名称 | 来源 |
|----------|------|
| codegenie-old src/skill/defaults.ts | 参照实现 |
| codegenie-old script/build.ts | 参照构建嵌入逻辑 |
| codegenie-cli src/skill/index.ts | 修改目标 |

### C. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-22 | zhangyuchen | 初始版本 |
| 1.1 | 2026-04-28 | Codex | 同步 Node `.mjs` 私有脚本、`jscrash_report` 下沉与二进制资源嵌入设计 |
