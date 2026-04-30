# 原始 Skill 与当前实际 Skill 的关系说明

本文用于说明 `specs/harmonyos/origin-skills/` 下保留的原始 HarmonyOS skill，与当前 `packages/opencode/resources/skills/` 中实际集成到 codegenie 的 skill 之间的关系。

## 目录定位

- `origin-skills/`：原始 skill 存档区，保留上游或候选 skill 的原始内容，便于分析、拆解和后续迁移。
- `resources/skills/`：当前 codegenie 实际内置并参与默认打包的 skill。

因此，`origin-skills/` 中的内容不等于当前已经产品化接入的 skill；它更像迁移输入、能力来源和对照基线。

## 对应关系总表

| 能力方向 | 原始 skill | 当前实际 skill | 当前处理策略 | 说明 |
|---|---|---|---|---|
| ArkTS/TS 语法差异与语法依据 | `hmos-arkts-knowledge-retriever` | `arkts-grammar-standards` | 拆解后新增 | 原始 skill 是大而全的 ArkTS 参考文档工具书，当前只保留“基础语法 + 限制摘要 + TS/ArkTS 关键差异”这部分高频且边界清晰的能力。 |
| ArkUI 知识 | `hmos-arkui-develop-skill` | `arkui-knowledge` | 保持不变 | 当前保留现有轻量 skill，不直接迁移原始 skill 的完整内容。 |
| 0-1 创建 | 无直接对应原始 skill | `deveco-create-project` | 保持不变 | 当前实际 skill 主要承担项目初始化能力，不依赖 `origin-skills/` 里的候选内容。 |
| ArkTS 语法错误修复 | `hmos-arkts-syntax-checker` | 无单独保留 | 不单独保留 | 该类能力与编译构建修复高度重叠，未作为独立 skill 接入。 |
| 编译构建问题修复 | `hmos-arkts-syntax-checker` | `arkts-error-fixes` | 拆解后收敛 | 当前保留“编译错误/类型错误修复”这部分实际高频能力，不保留原始 skill 的完整形态。 |
| 运行时等问题修复 | 暂无成熟原始 skill 直接接入 | `arkts-runtime-fix` | 保持不变 | 当前运行时问题修复 skill 按现有方案维护，未由 `origin-skills/` 中某个单一 skill 直接迁移而来。 |
| ArkTS 废弃接口检查 | `hmos-arkts-deprecated-interface-checker` | 暂未接入 | 候选能力 | 作为后续专题 skill 候选，当前未进入默认内置 skill。 |
| ArkUI 状态管理迁移 | `hmos-arkui-statemgt-migration` | 暂未接入 | 候选能力 | 作为后续专题 skill 候选，当前未进入默认内置 skill。 |

- 源代码仓: https://gitcode.com/HarmonyOS_Skills/harmonyos-agent-skills

## 重点说明

### 1. `hmos-arkts-knowledge-retriever` 与 `arkts-grammar-standards`

这是当前最典型的“原始 skill 被拆解后收敛接入”的案例。

原始 skill 包含：

- `ArkTS-Language-Guide` 的 9 个 guide 目录
- linter 约束摘要
- 样例
- 索引文件
- Python 检索脚本

它更像一套完整的 ArkTS / HarmonyOS 编程参考工具书，而不是一个窄职责 skill。

当前 `arkts-grammar-standards` 只保留了：

- `02-Basic-Syntax` 的高频语法知识
- linter 中关于限制和禁止项的高价值摘要
- `09-Migration-Guide` 中直接影响写法的 TypeScript/ArkTS 差异
- 精简后的主题别名映射

删除了：

- 标准库/API 用法
- 并发、运行时、跨语言、工具链、实践建议等泛化内容
- 索引文件
- Python 检索脚本
- 样例验证资产

原因是当前默认内置 skill 需要满足：

- 高频
- 轻量
- 责任边界清晰
- 不与其他 skill 大面积重叠

### 2. `hmos-arkts-syntax-checker` 与 `arkts-error-fixes`

原始 skill 更偏“ArkTS 语法检查/修复”。
当前产品化接入时，没有原样保留，而是把其中真正高频、与实际编译失败直接相关的能力收敛到 `arkts-error-fixes`。

因此两者关系不是一一映射，而是“原始能力的一部分被吸收到当前 skill 中”。

### 3. `hmos-arkui-develop-skill` 与 `arkui-knowledge`

这一类能力方向是对应的，但当前采取的是“保留现有实现，不直接整体替换”的策略。

也就是说：

- 原始 skill 是候选来源
- 当前 `arkui-knowledge` 仍是实际生效版本
- 后续如果要升级 ArkUI 方向能力，可以继续从 `origin-skills/hmos-arkui-develop-skill/` 中择优吸收

### 4. 仍未接入的原始 skill

以下目录当前主要作为后续能力候选保留：

- `hmos-arkts-deprecated-interface-checker`
- `hmos-arkui-statemgt-migration`

这两类能力都更适合后续按专题拆成独立 skill，而不是直接塞进现有默认 skill。

## 当前总体策略

对 `origin-skills/` 的总体处理策略不是“逐个原样迁入”，而是：

1. 保留原始目录作为参考基线
2. 按能力方向判断是否值得产品化
3. 只抽取对当前 agent 有明确增益、且边界清晰的部分
4. 以轻量、默认可打包的 skill 形态落到 `resources/skills/`

一句话总结：

> `origin-skills/` 是原始能力仓，`resources/skills/` 是当前产品化结果；两者是“能力来源”和“收敛落地”的关系，不是一一原样复制的关系。
