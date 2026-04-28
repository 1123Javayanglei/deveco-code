# HarmonyOS Skills 迁移 - 源码修改清单

> **设计原则**: 将 codegenie-old 的 4 个 HarmonyOS Skill 资源迁移到 codegenie-cli，采用"构建时嵌入 + 运行时提取"机制。

---

## 1. 修改概览

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `packages/opencode/resources/skills/` | 新增目录 | 从 codegenie-old 复制 4 个 Skill（含脚本、模板、参考文档，约 75+ 文件） |
| `packages/opencode/src/skill/defaults.ts` | 新增 | Effect 版默认 Skill 提取逻辑，参照 codegenie-old |
| `packages/opencode/src/skill/index.ts` | 修改 | 在 discoverSkills 中新增 defaults.ensure() + scan() |
| `packages/opencode/script/build.ts` | 修改 | 读取 resources/skills/ 嵌入到 CODEGENIE_DEFAULT_SKILLS，并对二进制资源使用 base64 |
| `packages/opencode/src/tool/registry.ts` | 修改 | 移除全局 `jscrash_report` 工具注册，崩溃分析能力改由 runtime-fix 私有脚本提供 |

**总计**: 新增默认 Skill 资源与提取逻辑；后续同步 Node 化时将默认 Skill 私有脚本从 `.ts` 改为 `.mjs`，并删除全局 `jscrash_report` 工具。

---

## 2. 支持的 Skill

```
arkts-error-fixes    ArkTS 编译错误修复（32 .ets 示例 + 28 .md 参考）
arkts-runtime-fix    运行时崩溃诊断（4 脚本 + 3 共享模块）
arkui-knowledge      ArkUI 最佳实践（仅 SKILL.md）
deveco-create-project 项目创建模板（1 脚本 + 完整项目模板）
```

---

## 3. 构建嵌入数据结构

```typescript
// build.ts 生成，嵌入到二进制
CODEGENIE_DEFAULT_SKILLS: {
  "arkts-error-fixes": {
    "SKILL.md": "...",
    "assets/NotificationError.ets": "...",
    "reference/notification_errors.md": "...",
    // ... 60+ 文件
  },
  "arkts-runtime-fix": {
    "SKILL.md": "...",
    "scripts/jscrash-report.mjs": "...",
    "scripts/collect-hilog.mjs": "...",
    "scripts/shared/hdc.mjs": "...",
    // ... Node ESM 脚本和共享模块
  },
  "arkui-knowledge": {
    "SKILL.md": "..."
  },
  "deveco-create-project": {
    "SKILL.md": "...",
    "scripts/copy-template.mjs": "...",
    "scripts/detect-sdk.mjs": "...",
    "application/entry/src/main/resources/base/media/icon.png": {
      "encoding": "base64",
      "content": "..."
    },
    "application/build-profile.json5": "...",
    // ... 20+ 文件
  }
}
```

---

## 4. 运行时提取目录结构

```
~/.local/share/opencode/skills/     ← Global.Path.data/skills/
├── .version                         ← 版本标记（与 Installation.VERSION 比对）
├── arkts-error-fixes/
│   ├── SKILL.md
│   ├── assets/
│   └── reference/
├── arkts-runtime-fix/
│   ├── SKILL.md
│   └── scripts/
├── arkui-knowledge/
│   └── SKILL.md
└── deveco-create-project/
    ├── SKILL.md
    ├── scripts/
    └── application/
```

---

## 5. 详细修改说明

### 5.1 `packages/opencode/resources/skills/`（新增）

从 codegenie-old 的 `/packages/opencode/resources/skills/` 复制 4 个目录。当前产品化版本已对私有脚本运行时和部分失效资源链接做调整，不再要求与原仓内容逐字一致。

```bash
# 复制命令示例
cp -r codegenie-old/packages/opencode/resources/skills/arkts-error-fixes \
      codegenie-cli/packages/opencode/resources/skills/
cp -r codegenie-old/packages/opencode/resources/skills/arkts-runtime-fix \
      codegenie-cli/packages/opencode/resources/skills/
cp -r codegenie-old/packages/opencode/resources/skills/arkui-knowledge \
      codegenie-cli/packages/opencode/resources/skills/
cp -r codegenie-old/packages/opencode/resources/skills/deveco-create-project \
      codegenie-cli/packages/opencode/resources/skills/
```

注意：排除 `.DS_Store` 文件。

### 5.2 `packages/opencode/src/skill/defaults.ts`（新增）

参照 codegenie-old 的 `src/skill/defaults.ts`，使用 Effect 框架重写：

- 声明 `CODEGENIE_DEFAULT_SKILLS` 常量（构建时 define 嵌入）
- `ensure(version, fsys)` Effect 函数：
  - 读取 `Global.Path.data/skills/.version`
  - 版本匹配 → 直接返回目录路径
  - 版本不匹配 → 清空目录 → 遍历嵌入数据写入文件 → 写 `.version`
  - 使用 `fsys.writeWithDirs()` 确保目录存在

### 5.3 `packages/opencode/src/skill/index.ts`（修改）

在 `discoverSkills` 函数中，`if (!Flag.OPENCODE_DISABLE_EXTERNAL_SKILLS)` 块之前，新增默认 Skill 扫描：

```typescript
// 新增导入（文件顶部）
import { Defaults } from "./defaults"
import { Installation } from "@/installation"

// discoverSkills 函数内，EXTERNAL SKILLS 块之前新增：
const defaultDir = yield* Defaults.ensure(Installation.VERSION, fsys)
yield* scan(state, defaultDir, SKILL_PATTERN)
```

### 5.4 `packages/opencode/script/build.ts`（修改）

在现有构建逻辑中新增 Skill 资源读取和嵌入：

```typescript
// 在 dir 定义之后、walk 函数之后新增：
const defaultSkillsDir = path.join(dir, "resources/skills")
type EmbeddedSkillFile = string | { encoding: "base64"; content: string }
const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bin"])
const defaultSkillsData: Record<string, Record<string, EmbeddedSkillFile>> = {}
if (fs.existsSync(defaultSkillsDir)) {
  for (const entry of await fs.promises.readdir(defaultSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const files: Record<string, EmbeddedSkillFile> = {}
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

// 在 Bun.build 的 define 对象中添加：
CODEGENIE_DEFAULT_SKILLS: JSON.stringify(defaultSkillsData),
```

---

## 6. 流程总结

```
开发时:
  编辑 resources/skills/ → 私有脚本保持 Node ESM `.mjs` 和自包含

构建时:
  bun run build
    └── build.ts → 读取 resources/skills/ → 文本/二进制分流嵌入到 CODEGENIE_DEFAULT_SKILLS

运行时:
  opencode 启动
    └── Skill.layer → discoverSkills()
        ├── Defaults.ensure() → 首次提取到 ~/.local/share/opencode/skills/
        └── scan(defaultDir, "**/SKILL.md") → 发现 4 个 Skill

  AI 使用:
    └── skill tool → 列出 available_skills → 加载 Skill 指令
```

## 7. 2026-04-28 默认 Skill 脚本 Node 化补充

本次脚本运行时改造属于对默认 Skill 资源和工具注册的侵入式更新，需在 specs 中记录：

- `arkts-runtime-fix/scripts/*.ts` 与 `scripts/shared/*.ts` 改为 Node ESM `.mjs`，不再依赖外部 Bun 命令。
- 新增 `arkts-runtime-fix/scripts/jscrash-report.mjs`，承接原全局 `jscrash_report` 的文本解析、文件解析和 hilog 自动采集解析能力。
- `arkts-runtime-fix/scripts/shared/hdc.mjs` 自包含 DevEco/hdc 查找逻辑，不再 import `packages/opencode/src/tool/lib/env`。
- `deveco-create-project/scripts/copy-template.ts`、`detect-sdk.ts` 改为 `.mjs`，使用 Node 标准库完成模板复制、占位符替换、API Level 检测和完整性校验。
- 删除 `packages/opencode/src/tool/jscrash_report.ts` 和 `packages/opencode/src/tool/jscrash-report.txt`，并从 `packages/opencode/src/tool/registry.ts` 移除注册。
- `packages/opencode/script/build.ts` 与 `packages/opencode/src/skill/defaults.ts` 支持二进制 Skill 资源的 base64 嵌入和 `Uint8Array` 写出。
