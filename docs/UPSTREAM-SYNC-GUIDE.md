# Upstream Sync Guide

> 本项目基于 [OpenCode](https://github.com/anomalyco/opencode) fork。
> 本文档描述上游同步的规则、流程和记录规范。
> **每次同步上游版本时，必须遵循本文档的流程和冲突解决原则。**

## Remote 配置

| 名称 | 地址 | 用途 |
|------|------|------|
| `opencode` | `git@github.com:anomalyco/opencode.git` | 上游 |
| `origin` | `git@gitcode.com:OwenO/codegenie-cli.git` | 个人 fork |
| `gitcode` | `git@gitcode.com:codegenie/codegenie-cli.git` | 组织仓库 |

## 同步流程

1. 确保当前分支工作区干净（`git status`）
2. fetch 上游目标版本：`git fetch opencode <tag>`
3. 查看上游变更范围：`git log --oneline <old-tag>..<new-tag>`
4. 执行合并：`git merge <new-tag> --no-edit`
5. 解决冲突（参考下方原则）
6. 验证构建：`bun install && bun run build`
7. 在 [UPSTREAM-SYNC-CHANGELOG.md](./UPSTREAM-SYNC-CHANGELOG.md) 中添加同步记录

## 冲突解决原则

1. **品牌标识**（`CODEGENIE_`/CodeGenie）：始终保留本地版本
2. **HarmonyOS 相关文件**：CodeGenie 独有功能，保留本地
3. **上游 bug 修复 / 功能增强**：优先接受上游变更
4. **配置和构建脚本**：以 CodeGenie 本地实现为准，合并上游新增配置

## 同步后验证

- 项目构建通过：`bun run build`
- 品牌一致性：`grep -r "OPENCODE_" packages/ --include="*.ts"` 应无结果
- 功能回归测试（如适用）

## 同步记录

同步记录维护在 [UPSTREAM-SYNC-CHANGELOG.md](./UPSTREAM-SYNC-CHANGELOG.md) 中。
