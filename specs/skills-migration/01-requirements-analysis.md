# 需求分析说明书: HarmonyOS Skills 迁移

**功能分支**: `001-skills-migration`
**创建日期**: 2026-04-22
**状态**: 草稿
**输入**: 将 codegenie-old 仓库中的 HarmonyOS Skills 迁移到 codegenie-cli 仓库

---

## 1. 简介

### 1.1 目的

本文档分析将 codegenie-old 仓库中的 HarmonyOS 相关 Skills 迁移到 codegenie-cli 仓库的需求。迁移涵盖 4 个 Skill：arkts-error-fixes、arkts-runtime-fix、arkui-knowledge、deveco-create-project，及其附带的脚本、模板和参考文档资源。

### 1.2 范围

**包含**：
- 迁移 4 个 HarmonyOS Skill 到 codegenie-cli 的 `resources/skills/` 目录
- 迁移 Skill 内的脚本（arkts-runtime-fix/scripts/）
- 迁移 Skill 内的模板（deveco-create-project/application/）
- 迁移 Skill 内的参考文档和示例代码（arkts-error-fixes/reference/、assets/）
- 确保 Skill 通过 codegenie-cli 已有的 Skill 发现机制可被加载

**不包含**：
- Tool 迁移（hdc_log、jscrash_report、switch_cwd、oh_knowledge 将在独立文档中规划）
- 新增 Skill（仅迁移现有功能）
- Skill 内容修改或增强
- CI/CD 流水线改造

### 1.3 假设和约束

| 类型 | 描述 |
|------|------|
| 假设 | codegenie-cli 的 Skill 发现机制（src/skill/index.ts）已支持 resources/skills/ 目录扫描 |
| 假设 | Skills 中的 Bun 脚本可在目标环境正常执行 |
| 约束 | SKILL.md 格式必须符合 codegenie-cli 的 frontmatter 解析要求（name + description） |
| 约束 | Skill 内脚本仅支持 Bun 运行时 |
| 约束 | Skill 资源文件必须通过 skill tool 加载后才能被 AI 使用 |

### 1.4 术语与缩写

| 术语/缩写 | 全称 | 说明 |
|-----------|------|------|
| Skill | 技能 | SKILL.md 定义的知识模块，通过 skill tool 加载到对话上下文 |
| SKILL.md | - | Skill 的入口定义文件，包含 YAML frontmatter 和 Markdown 正文 |
| Skill Discovery | Skill 发现 | codegenie-cli 扫描多个路径查找 SKILL.md 的机制 |
| DevEco Studio | - | 华为 HarmonyOS 开发 IDE |
| ArkTS | - | HarmonyOS 应用开发语言（TypeScript 扩展） |
| ArkUI | - | HarmonyOS 声明式 UI 框架 |

---

## 2. 系统上下文

### 2.1 系统定位

本次迁移属于 codegenie-cli 仓库的功能补全：将 HarmonyOS 开发者专用 Skill 知识资源从旧仓库搬运到新仓库，使新仓库具备 HarmonyOS 开发领域的知识辅助能力。

### 2.2 系统边界

```
codegenie-cli 仓库
├── resources/skills/          <- Skill 资源（本次迁移目标）
│   ├── arkts-error-fixes/     <- ArkTS 编译错误修复知识
│   │   ├── SKILL.md
│   │   ├── assets/            <- .ets 示例代码
│   │   └── reference/         <- .md 错误参考文档
│   ├── arkts-runtime-fix/     <- 运行时崩溃诊断知识
│   │   ├── SKILL.md
│   │   └── scripts/           <- Bun 分析脚本
│   ├── arkui-knowledge/       <- ArkUI 最佳实践
│   │   └── SKILL.md
│   └── deveco-create-project/ <- 项目创建模板
│       ├── SKILL.md
│       ├── scripts/           <- copy-template.ts
│       └── application/       <- 完整 ArkTS 项目模板
├── src/skill/index.ts         <- Skill 发现（已有，无需修改）
└── src/skill/discovery.ts     <- Skill 远程拉取（已有，无需修改）

外部依赖：
├── Bun 运行时（Skill 脚本执行：arkts-runtime-fix、deveco-create-project）
├── DevEco Studio（hdc 命令：arkts-runtime-fix 脚本依赖）
└── skill tool（AI 加载 Skill 的入口）
```

### 2.3 系统架构图

```
codegenie-old                          codegenie-cli
┌─────────────────────────┐            ┌─────────────────────────┐
│ resources/skills/        │            │ resources/skills/        │
│                          │            │                          │
│ ┌─────────────────────┐  │            │ ┌─────────────────────┐  │
│ │ arkts-error-fixes/  │  │  文件复制  │ │ arkts-error-fixes/  │  │
│ │  SKILL.md           │──┼───────────>│ │  SKILL.md           │  │
│ │  assets/ (32 .ets)  │  │            │ │  assets/ (32 .ets)  │  │
│ │  reference/ (28.md) │  │            │ │  reference/ (28.md) │  │
│ └─────────────────────┘  │            │ └─────────────────────┘  │
│                          │            │                          │
│ ┌─────────────────────┐  │            │ ┌─────────────────────┐  │
│ │ arkts-runtime-fix/  │  │  文件复制  │ │ arkts-runtime-fix/  │  │
│ │  SKILL.md           │──┼───────────>│ │  SKILL.md           │  │
│ │  scripts/ (4+3)     │  │            │ │  scripts/ (4+3)     │  │
│ └─────────────────────┘  │            │ └─────────────────────┘  │
│                          │            │                          │
│ ┌─────────────────────┐  │            │ ┌─────────────────────┐  │
│ │ arkui-knowledge/    │  │  文件复制  │ │ arkui-knowledge/    │  │
│ │  SKILL.md           │──┼───────────>│ │  SKILL.md           │  │
│ └─────────────────────┘  │            │ └─────────────────────┘  │
│                          │            │                          │
│ ┌─────────────────────┐  │            │ ┌─────────────────────┐  │
│ │ deveco-create-project│  │  文件复制  │ │ deveco-create-project│  │
│ │  SKILL.md           │──┼───────────>│ │  SKILL.md           │  │
│ │  scripts/           │  │            │ │  scripts/           │  │
│ │  application/       │  │            │ │  application/       │  │
│ └─────────────────────┘  │            │ └─────────────────────┘  │
└─────────────────────────┘            └─────────────────────────┘

运行时加载路径:
resources/skills/*/SKILL.md
       │
       ▼  Skill Discovery (src/skill/index.ts)
       │  扫描 config.directories() 下的 {skill,skills}/**/SKILL.md
       ▼
skill tool 加载
       │
       ▼  AI 获得 Skill 指令和参考资源
```

---

## 3. 需求分析概述

### 3.1 需求来源

codegenie-cli 作为新代码仓，需要具备与 codegenie-old 同等的 HarmonyOS 开发辅助能力。旧仓库中的 4 个 Skill 包含了大量 HarmonyOS 开发领域知识（编译错误修复方案、运行时崩溃诊断流程、ArkUI 最佳实践、项目模板），是 HarmonyOS 开发者最常使用的功能。

### 3.2 需求目标

- 将旧仓库的 4 个 HarmonyOS Skill 资源文件完整迁移到 codegenie-cli
- 确保迁移后的 Skill 通过 codegenie-cli 已有的 Skill 发现机制可被加载
- 不改变 Skill 的功能行为和内容

### 3.3 关键利益相关者

| 角色 | 职责 | 关注点 |
|------|------|--------|
| HarmonyOS 开发者 | 使用 Skills 获取开发知识和指导 | Skill 可用性、内容完整性 |
| 构建维护者 | 维护 codegenie-cli 构建 | 资源文件不影响构建流程 |

---

## 4. 需求场景分析

### 4.1 业务场景

#### 4.1.1 业务流程图

```
迁移流程:

resources/skills/ -> resources/skills/
├── arkts-error-fixes/       (SKILL.md + assets/ + reference/)
├── arkts-runtime-fix/       (SKILL.md + scripts/ + shared/)
├── arkui-knowledge/         (SKILL.md)
└── deveco-create-project/   (SKILL.md + scripts/ + application/)

运行时流程:

AI 识别用户意图
       │
       ▼
调用 skill tool 加载对应 Skill
       │
       ▼
Skill Discovery 查找 resources/skills/{name}/SKILL.md
       │
       ▼
解析 SKILL.md frontmatter + content
       │
       ▼
AI 获得 Skill 指令，按 Skill 指导执行任务
```

#### 4.1.2 业务规则

| 规则编号 | 规则名称 | 规则描述 | 优先级 |
|----------|----------|----------|--------|
| BR-001 | 资源完整性 | 每个 Skill 的所有文件必须完整迁移，不可遗漏 | 高 |
| BR-002 | 内容一致性 | 迁移后的文件内容与 codegenie-old 完全一致 | 高 |
| BR-003 | 格式兼容 | SKILL.md 的 frontmatter 必须包含 name 和 description 字段 | 高 |
| BR-004 | 目录结构 | Skill 目录名必须与 SKILL.md 中的 name 字段匹配 | 中 |

### 4.2 用户操作场景与关键路径

#### 4.2.1 用户角色定义

| 角色ID | 角色名称 | 角色描述 | 权限范围 |
|--------|----------|----------|----------|
| UR-001 | HarmonyOS 开发者 | 使用 opencode 进行 HarmonyOS 应用开发 | 可加载所有 HarmonyOS Skill |
| UR-002 | 通用开发者 | 使用 opencode 进行非鸿蒙开发 | 不触发 HarmonyOS Skill |

#### 4.2.2 用户操作场景

**场景 US-001: 开发者遇到 ArkTS 编译错误** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者在编写 ArkTS 代码时遇到编译错误，AI 自动加载 arkts-error-fixes Skill 提供修复方案 |
| 前置条件 | opencode 运行在 HarmonyOS 项目目录中 |
| 操作步骤 | 1. 开发者粘贴编译错误信息<br>2. AI 识别错误类型，通过 skill tool 加载 arkts-error-fixes<br>3. 根据 Skill 中的参考文档（reference/*.md）和示例代码（assets/*.ets）提供修复建议 |
| 预期结果 | 开发者获得准确的 ArkTS 编译错误修复方案，包含代码示例 |
| 异常处理 | Skill 加载失败时回退到通用错误处理 |

**场景 US-002: 开发者分析运行时崩溃** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 应用运行时崩溃，开发者提供崩溃日志，AI 加载 arkts-runtime-fix Skill 进行诊断 |
| 前置条件 | Bun 运行时已安装（用于运行分析脚本） |
| 操作步骤 | 1. 开发者提供 jscrash 日志或描述崩溃现象<br>2. AI 加载 arkts-runtime-fix Skill<br>3. 按照 Skill 指令调用内置脚本解析崩溃日志<br>4. 根据分析结果定位和修复问题 |
| 预期结果 | 获得包含 error_type、suspected_file、top_stack 的结构化崩溃分析 |
| 异常处理 | Bun 不可用时提示用户安装 Bun；日志不足时请求更多证据 |

**场景 US-003: 开发者创建新项目** (优先级: P1)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者使用 deveco-create-project Skill 创建新的 ArkTS 项目 |
| 前置条件 | Bun 运行时已安装 |
| 操作步骤 | 1. 开发者请求创建项目，指定路径和应用名称<br>2. AI 加载 deveco-create-project Skill<br>3. 运行 copy-template.ts 脚本从 application/ 模板创建项目<br>4. 验证项目结构完整性 |
| 预期结果 | 在指定路径生成包含 AppScope、entry、build-profile.json5 的完整 ArkTS 项目 |
| 异常处理 | 脚本执行失败时报告错误并停止 |

**场景 US-004: 开发者学习 ArkUI 组件用法** (优先级: P2)

| 项目 | 描述 |
|------|------|
| 场景描述 | 开发者在编写 ArkUI 界面时需要参考最佳实践 |
| 前置条件 | 无 |
| 操作步骤 | 1. 开发者询问 ArkUI 布局、状态管理、动画等用法<br>2. AI 加载 arkui-knowledge Skill<br>3. 根据 Skill 中的最佳实践指导开发者 |
| 预期结果 | 获得符合 ArkUI 规范的代码建议 |
| 异常处理 | 无特殊异常 |

#### 4.2.3 关键路径分析

```
用户请求 -> AI 识别意图 -> skill tool 加载 -> SKILL.md 解析 -> AI 按 Skill 指令执行
```

| 路径编号 | 路径描述 | 关键节点 | 风险点 |
|----------|----------|----------|--------|
| KP-001 | 编译错误修复 | 错误识别 -> skill tool -> arkts-error-fixes -> 查找匹配的错误类型 | 错误类型不在 Skill 覆盖范围 |
| KP-002 | 崩溃诊断 | 日志收集 -> skill tool -> arkts-runtime-fix -> Bun 脚本执行 | Bun 不可用、hdc 不可用 |
| KP-003 | 项目创建 | 参数确认 -> skill tool -> deveco-create-project -> copy-template.ts -> 项目验证 | Bun 不可用、模板文件缺失 |
| KP-004 | ArkUI 指导 | 问题识别 -> skill tool -> arkui-knowledge -> 最佳实践输出 | 无特殊风险 |

### 4.3 研发与维护阶段场景

#### 4.3.1 开发阶段场景

| 场景 | 描述 | 注意事项 |
|------|------|----------|
| Skill 资源复制 | 将 resources/skills/ 整体复制 | 保持文件结构和内容不变，不遗漏隐藏文件 |
| Skill 发现验证 | 验证 Skill Discovery 机制能扫描到新 Skill | 检查 config.directories() 返回值包含 resources/skills/ |

#### 4.3.2 测试阶段场景

| 场景 | 描述 | 测试要点 |
|------|------|----------|
| SKILL.md 解析 | 验证每个 SKILL.md 的 frontmatter 可被正确解析 | name、description 字段 |
| Skill 加载 | 验证每个 Skill 可通过 skill tool 加载 | 返回完整 content |
| 脚本执行 | 验证 arkts-runtime-fix 脚本可运行 | Bun 环境下正常执行 |
| 项目创建 | 验证 deveco-create-project 可创建完整项目 | 输出项目结构完整 |

### 4.4 兼容性分析

#### 4.4.1 版本兼容性

| 兼容类型 | 兼容要求 | 影响范围 |
|----------|----------|----------|
| 向后兼容 | 迁移后 Skill 行为与 codegenie-old 一致 | Skill 加载和内容 |

#### 4.4.2 平台兼容性

| 平台 | 兼容性要求 | 备注 |
|------|------------|------|
| macOS (darwin-arm64) | 完全支持 | DevEco Studio 主要平台 |
| macOS (darwin-x64) | 完全支持 | DevEco Studio 主要平台 |
| Windows (win32-x64) | 完全支持 | DevEco Studio 主要平台 |

---

## 5. 功能性需求分析

### 5.1 功能需求列表

| 需求编号 | 需求名称 | 需求描述 | 优先级 | 来源 |
|----------|----------|----------|--------|------|
| FR-001 | arkts-error-fixes Skill 迁移 | 迁移 ArkTS 编译错误修复 Skill（SKILL.md + 32 .ets 示例 + 28 .md 参考） | P1 | 功能对齐 |
| FR-002 | arkts-runtime-fix Skill 迁移 | 迁移运行时崩溃诊断 Skill（SKILL.md + 4 脚本 + 3 共享模块） | P1 | 功能对齐 |
| FR-003 | arkui-knowledge Skill 迁移 | 迁移 ArkUI 最佳实践 Skill（SKILL.md） | P1 | 功能对齐 |
| FR-004 | deveco-create-project Skill 迁移 | 迁移项目创建 Skill（SKILL.md + copy-template.ts + 项目模板） | P1 | 功能对齐 |
| FR-005 | Skill 可发现性验证 | 确保 Skill Discovery 机制能扫描到迁移的 4 个 Skill | P1 | 功能验证 |

### 5.2 功能需求详细说明

#### FR-001: arkts-error-fixes Skill 迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 将 arkts-error-fixes Skill 完整复制到 codegenie-cli 的 resources/skills/ 目录 |
| 验收标准 | 1. SKILL.md 文件存在且 frontmatter 包含 name: arkts-error-fixes<br>2. assets/ 目录包含 32 个 .ets 示例代码文件<br>3. reference/ 目录包含 28 个 .md 错误参考文档<br>4. 通过 skill tool 可加载该 Skill |
| 关联场景 | US-001 |
| 依赖需求 | 无 |

资源清单：
- `SKILL.md` - Skill 入口定义，包含 21 个错误分类和快速参考表
- `assets/*.ets` - 32 个错误示例代码文件（如 NotificationError.ets、WindowTypeError.ets）
- `reference/*.md` - 28 个错误详细说明文档（如 notification_errors.md、window_type_errors.md）

#### FR-002: arkts-runtime-fix Skill 迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 将 arkts-runtime-fix Skill 完整复制到 codegenie-cli 的 resources/skills/ 目录 |
| 验收标准 | 1. SKILL.md 文件存在且 frontmatter 包含 name: arkts-runtime-fix<br>2. scripts/ 目录包含 4 个分析脚本和 3 个共享模块<br>3. 通过 skill tool 可加载该 Skill<br>4. Bun 环境下脚本可正常执行 |
| 关联场景 | US-002 |
| 依赖需求 | 无 |

资源清单：
- `SKILL.md` - Skill 入口定义，包含崩溃诊断流程和脚本调用说明
- `scripts/collect-hilog.ts` - 设备 hilog 日志收集
- `scripts/fetch-faultlog.ts` - Faultlogger 日志拉取
- `scripts/parse-jscrash-log.ts` - 崩溃日志结构化解析
- `scripts/probe-faultlogger.ts` - Faultlogger 状态探测
- `scripts/shared/hdc.ts` - hdc 命令共享封装
- `scripts/shared/jscrash-faultlogger.ts` - Faultlogger 共享逻辑
- `scripts/shared/jscrash-parse.ts` - 解析共享逻辑
- `scripts/shared/utils.ts` - 通用工具函数

#### FR-003: arkui-knowledge Skill 迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 将 arkui-knowledge Skill 复制到 codegenie-cli 的 resources/skills/ 目录 |
| 验收标准 | 1. SKILL.md 文件存在且 frontmatter 包含 name: arkui-knowledge<br>2. 通过 skill tool 可加载该 Skill |
| 关联场景 | US-004 |
| 依赖需求 | 无 |

资源清单：
- `SKILL.md` - ArkUI 最佳实践（布局、响应式、导航、状态管理、动画、性能优化）

#### FR-004: deveco-create-project Skill 迁移

| 项目 | 描述 |
|------|------|
| 需求描述 | 将 deveco-create-project Skill 完整复制到 codegenie-cli 的 resources/skills/ 目录 |
| 验收标准 | 1. SKILL.md 文件存在且 frontmatter 包含 name: deveco-create-project<br>2. scripts/copy-template.ts 存在且可执行<br>3. application/ 目录包含完整 ArkTS 项目模板<br>4. 通过 skill tool 可加载该 Skill |
| 关联场景 | US-003 |
| 依赖需求 | 无 |

资源清单：
- `SKILL.md` - Skill 入口定义，包含参数说明和执行步骤
- `scripts/copy-template.ts` - 项目模板复制脚本
- `application/` - 完整 ArkTS 项目模板（AppScope、entry、build-profile.json5 等）

#### FR-005: Skill 可发现性验证

| 项目 | 描述 |
|------|------|
| 需求描述 | 确保 codegenie-cli 的 Skill Discovery 机制能扫描到迁移的 4 个 Skill |
| 验收标准 | 1. `src/skill/index.ts` 的 scan 逻辑能匹配 `resources/skills/*/SKILL.md`<br>2. 4 个 Skill 均出现在 skill tool 的 available_skills 列表中<br>3. 每个 Skill 的 name 和 description 正确显示 |
| 关联场景 | 所有场景 |
| 依赖需求 | FR-001, FR-002, FR-003, FR-004 |

### 5.3 功能依赖关系

```
FR-001 (arkts-error-fixes)   <- 独立
FR-002 (arkts-runtime-fix)   <- 独立
FR-003 (arkui-knowledge)     <- 独立
FR-004 (deveco-create-project) <- 独立

FR-005 (可发现性验证)
├── FR-001
├── FR-002
├── FR-003
└── FR-004
```

| 需求ID | 依赖需求 | 依赖类型 | 说明 |
|--------|----------|----------|------|
| FR-005 | FR-001~FR-004 | 强依赖 | 验证依赖所有 Skill 文件就位 |

---

## 6. 非功能性需求分析

### 6.1 系统定位

面向 HarmonyOS 应用开发者的 AI 编程辅助工具，通过 Skills 提供领域知识和工作流指导。

### 6.2 系统可靠性

| 指标 | 要求 | 说明 |
|------|------|------|
| Skill 加载率 | 100% | 所有 4 个 Skill 必须可通过 skill tool 加载 |
| 脚本可用性 | Bun 环境下 100% | 未安装 Bun 时 Skill 内容仍可加载，但脚本无法执行 |

### 6.3 安全隐私

| 类型 | 需求描述 | 安全等级 |
|------|----------|----------|
| 文件访问 | Skill 脚本仅读取本地文件和设备日志 | 低 |

### 6.4 可测试性

| 测试类型 | 测试要求 | 覆盖率目标 |
|----------|----------|------------|
| Skill 加载测试 | 验证 4 个 SKILL.md 可被正确解析 | 4/4 |
| 脚本执行测试 | 验证 arkts-runtime-fix 脚本在 Bun 环境下可运行 | 关键脚本 |
| 项目创建测试 | 验证 deveco-create-project 可创建完整项目 | 端到端 |

---

## 7. 系统影响分析

### 7.1 功能影响列表

| 影响模块 | 影响类型 | 影响程度 | 影响描述 |
|----------|----------|----------|----------|
| `resources/skills/` | 新增 | 高 | 新增 4 个 Skill 目录及约 75+ 个资源文件 |
| `src/skill/index.ts` | 无修改 | - | 已有 Skill Discovery 机制自动覆盖 |

### 7.2 风险评估与缓解措施

| 风险项 | 风险等级 | 影响范围 | 缓解措施 |
|--------|----------|----------|----------|
| Skill Discovery 未扫描 resources/skills/ | 低 | 所有 Skill | 验证 config.directories() 返回值 |
| SKILL.md frontmatter 格式不兼容 | 低 | Skill 加载 | 确认 name + description 字段存在 |
| 脚本中 hdc 路径硬编码 | 低 | arkts-runtime-fix | 脚本已通过 shared/hdc.ts 动态检测 |

---

## 附录

### A. 参考文档

| 文档名称 | 版本 | 来源 |
|----------|------|------|
| codegenie-old Skills 源码 | - | /packages/opencode/resources/skills/ |
| codegenie-cli Skill Discovery | - | /packages/opencode/src/skill/index.ts |
| codegenie-cli Skill 解析 | - | /packages/opencode/src/skill/discovery.ts |

### B. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-04-22 | zhangyuchen | 初始版本（仅 Skills 迁移，Tools 迁移另行规划） |
