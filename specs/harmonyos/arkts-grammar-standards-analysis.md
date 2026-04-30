# ArkTS Legacy Skill 收敛分析与后续方案

## 1. 背景结论

原始 legacy skill 并不只是一个 ArkTS 语法 skill，而更像一套面向鸿蒙开发的“参考文档工具书”。

它覆盖了：

- ArkTS 基础语法
- 标准库与常用能力
- 并发模型
- 运行时
- 跨语言交互
- 编译工具链
- 编码实践
- TypeScript 到 ArkTS 的迁移
- 基于 linter 规则整理出的限制与禁用项
- 以及一整套索引和 Python 检索脚本

因此，它对鸿蒙 agent 的价值是存在的，而且价值不小；但它更适合作为“领域知识底座”或“按需加载的重型参考库”，不适合原样作为默认常驻的单一 skill。

---

## 2. 原始 Skill 内容盘点

### 2.1 Guide 类内容

原始 skill 中包含 `ArkTS-Language-Guide` 的 9 个 guide 目录：

1. `01-Getting-Started-with-ArkTS`
2. `02-Basic-Syntax`
3. `03-Common-Library`
4. `04-Concurrency`
5. `05-Runtime`
6. `06-Cross-Language-Interaction`
7. `07-Compilation-Toolchain`
8. `08-Coding-Guide-and-Practices`
9. `09-Migration-Guide`

### 2.2 Linter 类内容

- `docs/linter/ArkTS_Syntax_Knowledge_From_Linter.md`
- `docs/linter/examples/`

这部分更偏工程约束、语法限制、禁止项和 Sendable 规则，特别适合回答：

- 为什么这样写不允许
- 这是官方限制还是工程规则
- 哪些 TS 写法在 ArkTS 下会被收紧

### 2.3 检索基础设施

- `references/doc_index.json`
- `references/snippet_index.json`
- `references/cli_index.json`
- `references/topic_aliases.json`
- `scripts/search_docs.py`

这部分不是知识本身，而是旧 skill 的“索引 + 检索脚本”实现。

---

## 3. 收敛后的保留/删除决策表

| 原始内容 | 是否保留 | 处理方式 | 原因 |
|---|---|---|---|
| `01-Getting-Started-with-ArkTS` | 否 | 删除 | 偏背景介绍和入门认知，对默认语法 skill 的直接帮助有限。 |
| `02-Basic-Syntax` | 是 | 摘要化保留 | 这是语法 skill 的核心来源，直接支撑类、接口、函数、变量、操作符等高频问题。 |
| `03-Common-Library` | 否 | 删除 | 属于库/API 用法，不是语法规范；会把 skill 边界拉宽。 |
| `04-Concurrency` | 否 | 删除 | 更偏并发模型和语义约束，不适合作为默认语法 skill 的一部分。 |
| `05-Runtime` | 否 | 删除 | 偏运行机制，与 runtime 诊断类能力更接近。 |
| `06-Cross-Language-Interaction` | 否 | 删除 | 属于跨语言场景，离当前 skill 核心目标较远。 |
| `07-Compilation-Toolchain` | 否 | 删除 | 偏编译工具链和流程，不属于语法依据。 |
| `08-Coding-Guide-and-Practices` | 否 | 删除 | 偏编码建议和实践，不是“语法是否允许”的主要依据。 |
| `09-Migration-Guide` | 部分保留 | 摘要化保留 | 只抽取 TypeScript 到 ArkTS 的关键语法差异，高频且直接影响改写。 |
| `linter` 摘要 | 是 | 摘要化保留 | 对解释限制、禁止项、Sendable 约束非常有价值。 |
| `linter/examples/` | 否 | 删除 | 属于验证样例资产，当前默认 skill 不承担验证流程。 |
| `doc_index.json` | 否 | 删除 | 属于旧检索器基础设施，体积大，默认 skill 不再走索引检索路线。 |
| `snippet_index.json` | 否 | 删除 | 同上，且与 snippet validation 能力绑定。 |
| `cli_index.json` | 否 | 删除 | 与命令提示、工具执行有关，超出当前 skill 边界。 |
| `topic-aliases.json` | 是 | 精简保留 | 对主题命中和问题归类有直接帮助，但不需要保留旧版的大体量。 |
| `search_docs.py` | 否 | 删除 | 引入 Python 依赖，不适合当前轻量默认 skill 方案。 |

---

## 4. 为什么我们只保留这么少

### 4.1 不是“内容没价值”，而是“默认 skill 要窄而准”

原版内容有价值，但它是“大而全”的参考库，不是“单一职责”的默认 skill。

默认内置 skill 更适合承载：

- 高频问题
- 边界清晰的问题
- 不依赖额外环境的问题
- 能稳定触发的问题

而不是：

- 大而广的全领域资料库
- 带脚本和索引的检索系统
- 会和其他 skill 重叠的综合能力

### 4.2 默认内置 skill 需要控制责任边界

如果把原版 guide 全部保留，`arkts-grammar-standards` 会同时覆盖：

- 语法
- 库用法
- 并发
- 运行时
- 工具链
- 迁移
- 实践建议

这样会与现有 skill 明显重叠：

- `arkts-error-fixes`
- `arkts-runtime-fix`
- `arkui-knowledge`

结果是 agent 触发后容易“什么都往里答”，边界会变模糊。

### 4.3 默认能力要尽量轻量

原始 legacy skill 本质上是：

- 文档库
- 索引文件
- Python 检索脚本
- 样例验证资产

这套方案更适合“重型知识工具”，不适合作为所有用户默认携带的轻量 skill。

---

## 5. 当前收敛策略

本次收敛策略可以概括为：

**只保留对 ArkTS 语法判断有明确提升、且能保持 skill 原子性的内容。**

具体做法：

- 保留 `02-Basic-Syntax` 的高频语法知识
- 保留 `linter` 中对限制和禁止项的高价值摘要
- 保留 `09-Migration-Guide` 中直接影响代码写法的 TS/ArkTS 差异
- 精简保留 `topic-aliases.json`
- 删除检索脚本、索引、样例、工具链和泛化文档内容

最终形成的是一个轻量静态参考 skill，而不是原版那种完整文档检索器。

---

## 6. 对鸿蒙 Agent 的价值判断

### 6.1 原版“工具书”对鸿蒙 agent 帮助大吗

有帮助，而且帮助不小。

它的主要价值在于：

- 降低 agent 凭通用 TS 记忆胡猜 ArkTS 规则的概率
- 能解释“为什么不允许这样写”
- 能覆盖长尾问题，如并发、Sendable、迁移、工具链
- 对 review、规范性答复、教育型答复很有帮助

### 6.2 为什么不原样保留

不是因为它没用，而是因为它更适合作为：

- 鸿蒙知识底座
- 按需加载的扩展参考 skill
- 或远程 skill / 独立知识包

而不是一个默认常驻的、单一职责的内置 skill。

一句话总结：

**这本“工具书”对鸿蒙 agent 有价值，但它适合做“鸿蒙知识库”，不适合原样做“默认语法 skill”。**

---

## 7. 当前方案的定位

当前落地的 `arkts-grammar-standards` 是一个收敛版默认 skill，定位是：

- 回答 ArkTS 语法规则
- 解释 ArkTS 限制
- 说明 TS/ArkTS 的关键语法差异
- 给出简洁、可追溯的依据

它不承担：

- 编译修复流程
- 运行时诊断
- ArkUI 设计建议
- 标准库/API 教程式问答
- 工具执行与脚本检索流程

---

## 8. 后续建议方案

### 8.1 分层建设，而不是回退到单一大 skill

建议把原版“工具书”拆成三层：

#### 第一层：默认内置轻量 skill

适合高频、窄边界、低依赖内容：

- `arkts-grammar-standards`
- `arkts-error-fixes`
- `arkts-runtime-fix`
- `arkui-knowledge`

#### 第二层：按需加载的专题 skill

适合中频但边界明确的知识模块：

- `arkts-library-guide`
- `arkts-concurrency-guide`
- `arkts-migration-guide`
- `arkts-toolchain-guide`

#### 第三层：重型鸿蒙参考库

适合完整资料沉淀，但不建议默认内置：

- 保留完整 guide
- 保留 linter 扩展材料
- 如有必要，单独保留索引和检索脚本
- 作为远程 skill、扩展 skill 或独立知识库使用

### 8.2 推荐实施顺序

1. 先稳定当前 `arkts-grammar-standards` 的触发质量和回答边界
2. 根据真实使用频率观察哪些长尾问题经常出现
3. 再把原版工具书按专题拆成多个 skill，而不是恢复成一个大 skill
4. 如果后续确实需要“完整鸿蒙工具书”，建议做成独立参考库或远程 skill，而不是塞回默认 skill

---

## 9. 最终汇总

> 原始 legacy skill 实际上不是单一的 ArkTS 语法 skill，而是一套更接近“鸿蒙编程参考文档工具书”的知识包。它覆盖了 9 类 ArkTS guide、linter 规则摘要、样例、索引和 Python 检索脚本。  
>  
> 这套工具书对鸿蒙 agent 是有价值的，尤其适合做知识底座和长尾问题支撑；但如果原样作为默认内置 skill，会带来两个问题：一是职责过宽，容易和现有 runtime、UI、编译修复类 skill 重叠；二是实现过重，包含索引和 Python 检索依赖，不适合默认常驻。  
>  
> 因此本次我们采用“收敛而不是照搬”的策略：只保留对默认语法 skill 有明确能力提升的内容，主要是 `02-Basic-Syntax`、linter 中关于限制的高价值摘要，以及 `09-Migration-Guide` 中直接影响写法的 TS/ArkTS 差异。其余库用法、并发、运行时、工具链和实践类内容，不是没有价值，而是更适合后续拆成专题 skill 或保留成独立鸿蒙知识库按需加载。
