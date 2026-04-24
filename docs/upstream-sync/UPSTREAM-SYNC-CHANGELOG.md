# Upstream Sync Changelog

> 同步规则和流程见 [UPSTREAM-SYNC-GUIDE.md](./UPSTREAM-SYNC-GUIDE.md)

## 2026-04-24 | v1.14.21 → v1.14.22

- **分支**: upstream-tracking-develop
- **上游提交数**: 9
- **冲突**: 19 个文件。16 个 package.json 版本号冲突（保留 codegenie 名称，升级版本）；bun.lock 接受上游；extension.toml 下载 URL 升级到 v1.14.22；packages/web/package.json workspace 依赖从 opencode 改为 codegenie。
- **主要变更**:
  - feat(project): add icon_url_override field to projects (#23955)
  - fix(npm): respect npmrc config (#24001)
  - fix: add keyed prop to Show components for proper reactivity (#23935)
  - refactor: remove redundant pending check from working memo (#23929)
  - 新增 database migration: 20260423070820_add_icon_url_override

## 2026-04-23 | v1.14.20 → v1.14.21

- **分支**: upstream-tracking-develop
- **合并提交**: 79bb903c7
- **上游提交数**: 49
- **冲突**: 21 个文件。14 个 package.json 版本号冲突（保留 codegenie 名称，升级版本）；bun.lock 接受上游（后续 bun install 重新生成）；extension.toml 下载 URL 升级到 v1.14.21；upgrade.ts 保留 CODEGENIE_DISABLE_AUTOUPDATE flag、移除重复检查；server.ts 保留 CODEGENIE_DISABLE_LSP_DOWNLOAD flag、接受 pyright 参数更新和 csharp-ls → roslyn-language-server 迁移。

---
