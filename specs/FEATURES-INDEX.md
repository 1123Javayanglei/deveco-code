# 特性文档索引

**最后更新时间**: 2026-04-28

---

新建特性请参考 [TEMPLATE.md](./TEMPLATE.md)。如已加载 `speckit-custom` 技能，可直接使用该技能创建特性文档。

---

## 文档同步规则

修改代码后，保持特性文档与代码同步：

1. **确定变更归属** — 确认代码变更属于哪个特性（`specs/<feature>/`），涉及多个则分别处理。
2. **同步更新相关文档** — 检查该特性下所有阶段文档（需求、设计、任务、测试、源码变更、教训记录等），更新受影响的部分，保持文档与代码一致。
3. **更新本索引** — 新增特性按 [TEMPLATE.md](./TEMPLATE.md) 创建目录并注册；新增特性或变更状态时更新本文件头部的 **最后更新时间**。

---

## 特性列表

| 编号 | 特性名称 | 分支 | 需求分析 | 功能设计 | 任务分解 | 测试用例 | 源码修改 | 教训记录 | 最后更新 |
|------|----------|------|----------|----------|----------|----------|----------|----------|----------|
| 001 | CodeGenie 华为账号登录集成 | `codegenie-auth` | ✅ | ✅ | ✅ | ✅ | ✅ | - | 2026-04-22 |
| 002 | /feedback 与 /privacy 斜杠命令 | `feedback-privacy-commands` | ✅ | ✅ | - | - | ✅ | - | 2026-04-22 |
| 003 | 配置迁移 (Config Migration) | `config-migration` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-04-22 |
| 004 | 发布系统改造 | `publish-system` | ✅ | ✅ | - | - | ✅ | - | 2026-04-22 |
| 005 | Skills 迁移 | `skills-migration` | ✅ | ✅ | - | - | ✅ | - | 2026-04-28 |
| 006 | HarmonyOS 工具迁移 | `harmonyos-tools` | ✅ | ✅ | - | - | ✅ | - | 2026-04-28 |
| 007 | HarmonyOS Agents 迁移 | `harmonyos-agents` | ✅ | ✅ | - | - | ✅ | - | 2026-04-22 |
| 008 | 品牌增强 (Brand Enhancement) | `codegenie-brand-enhancement` | ✅ | ✅ | - | - | ✅ | - | 2026-04-22 |

**状态说明**: ✅ 已完成 | 🔄 进行中 | - 未开始

---

## 变更历史

| 日期 | 操作 | 特性 | 描述 |
|------|------|------|------|
| 2026-04-28 | 更新 | 005-skills-migration, 006-harmonyos-tools | 同步默认 Skill 私有脚本 Node 化、`jscrash_report` 下沉与二进制资源嵌入修复 |
| 2026-04-25 | 新增 | 008-codegenie-brand-enhancement | 补充遗漏的品牌增强特性索引 |
| 2026-04-25 | 规范 | - | 重构文档体系：放弃数字编号，采用语义化文件名 |
| 2026-04-25 | 更新 | - | 增加文档规范、教训记录列、补充 005-007 特性 |
| 2026-04-22 | 创建索引 | - | 初始化特性文档索引 |
| 2026-04-22 | 更新 | 001-codegenie-auth | 按 SDD 模板重构需求分析和功能设计文档，合并 03-tui-auth-check.md 到功能设计 |
| 2026-04-22 | 删除 | 001-codegenie-auth | 删除已合并的 03-tui-auth-check.md |
| 2026-04-22 | 重命名 | 001-codegenie-auth | 统一文件编号：04-tasks→03, test-cases→04, source-code-changes→05 |
| 2026-04-22 | 更新 | 002-feedback-privacy-commands | 补充特性索引，同步当前文档状态 |
| 2026-04-22 | 新增 | 003-config-migration | 补充特性索引（01~06 + source-code-changes） |
| 2026-04-22 | 新增 | 004-publish-system | 补充特性索引（01~02 + source-code-changes） |
