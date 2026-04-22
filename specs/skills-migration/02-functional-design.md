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
| 最小侵入 | 仅新增文件，不修改已有 Skill Discovery 逻辑 | src/skill/index.ts 不变 |

---

## 2. 实现思路

### 2.1 整体方案

采用与 codegenie-old 完全一致的两阶段方案：

1. **构建时嵌入**：`build.ts` 读取 `resources/skills/` 下所有文件，序列化为 `Record<string, Record<string, string>>`，通过 Bun 的 `define` 选项嵌入为 `CODEGENIE_DEFAULT_SKILLS` 常量
2. **运行时提取**：新增 `src/skill/defaults.ts`，首次运行时将嵌入的 Skill 文件提取到 `Global.Path.data/skills/`，Skill Discovery 扫描该目录

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

---

## 3. 实现设计

### 3.1 `resources/skills/`（新增）

从 codegenie-old 复制 4 个 Skill 目录，文件内容完全一致：

```
resources/skills/
├── arkts-error-fixes/
│   ├── SKILL.md
│   ├── assets/          (32 个 .ets 示例)
│   └── reference/       (28 个 .md 参考文档)
├── arkts-runtime-fix/
│   ├── SKILL.md
│   └── scripts/
│       ├── collect-hilog.ts
│       ├── fetch-faultlog.ts
│       ├── parse-jscrash-log.ts
│       ├── probe-faultlogger.ts
│       └── shared/
│           ├── hdc.ts
│           ├── jscrash-faultlogger.ts
│           ├── jscrash-parse.ts
│           └── utils.ts
├── arkui-knowledge/
│   └── SKILL.md
└── deveco-create-project/
    ├── SKILL.md
    ├── scripts/
    │   └── copy-template.ts
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

declare const CODEGENIE_DEFAULT_SKILLS: Record<string, Record<string, string>> | undefined

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
        yield* fsys.writeWithDirs(path.join(dir, skillName, fileName), content)
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
const defaultSkillsData: Record<string, Record<string, string>> = {}
if (fs.existsSync(defaultSkillsDir)) {
  for (const entry of await fs.promises.readdir(defaultSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const files: Record<string, string> = {}
    const skillPath = path.join(defaultSkillsDir, entry.name)
    for (const file of await walk(skillPath)) {
      const rel = path.relative(skillPath, file)
      files[rel] = await Bun.file(file).text()
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
| `script/build.ts` | 修改 | 读取 resources/skills/ 并嵌入到 CODEGENIE_DEFAULT_SKILLS |

---

## 附录

### A. 设计决策记录

| 决策ID | 决策内容 | 决策原因 | 决策日期 |
|--------|----------|----------|----------|
| D-001 | 采用嵌入+提取而非直接扫描 resources/ | codegenie-cli 的 Skill Discovery 不扫描 resources/ 目录，需要提取到 data 目录 | 2026-04-22 |
| D-002 | defaults.ts 使用 Effect 框架 | 与 codegenie-cli 整体架构一致，可访问 AppFileSystem 服务 | 2026-04-22 |

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
