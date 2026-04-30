# 特性文档模板

> 新建特性时复制本模板，替换 `<feature-name>` 为实际特性目录名。如已加载 `speckit-custom` 技能，可直接使用该技能创建特性文档。

---

## 目录结构

```
specs/<feature-name>/
├── requirements-analysis.md      # 需求阶段
├── functional-design.md          # 设计阶段
├── tasks.md                      # 计划阶段
├── test-cases.md                 # 验证阶段
├── source-code-changes.md        # 实现阶段（可选）
├── lessons-learned.md            # 复盘阶段（可选）
└── <additional-docs>             # 附加文档（可选，自由命名）
```

## 文件说明

| 文件 | 阶段 | 内容 |
|------|------|------|
| `requirements-analysis.md` | 需求 | 目的、范围、假设约束、术语 |
| `functional-design.md` | 设计 | 架构、接口、数据流、关键决策 |
| `tasks.md` | 计划 | 任务分解、实施阶段、架构决策 |
| `test-cases.md` | 验证 | 测试场景、预期结果、覆盖矩阵 |
| `source-code-changes.md` | 实现 | 源码文件清单、修改类型、行数、说明 |
| `lessons-learned.md` | 复盘 | 踩坑记录、验证方法、避免重蹈 |
| `<additional-docs>` | - | 附加说明、参考材料、流程图等，自由命名 |

## 命名规则

- 六个阶段文件使用固定语义化文件名，禁止数字编号前缀
- 阶段顺序: 需求 → 设计 → 计划 → 验证 → 实现 → 复盘
- 附加文档: 可自由命名，要求语义清晰、利于理解

## 头部元数据示例

```markdown
# 需求分析说明书: <特性名称>

**功能分支**: `<branch-name>`
**创建日期**: YYYY-MM-DD
**状态**: 草稿 / 已实现
**输入**: <一句话描述>
```
