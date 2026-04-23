# Upstream Sync Lessons Learned

> 同步规则和流程见 [UPSTREAM-SYNC-GUIDE.md](./UPSTREAM-SYNC-GUIDE.md)
> 同步历史记录见 [UPSTREAM-SYNC-CHANGELOG.md](./UPSTREAM-SYNC-CHANGELOG.md)

本文档记录上游同步过程中积累的经验、反复出现的问题和隐蔽陷阱，供后续同步参考。

---

## v1.14.20 → v1.14.21

### package.json 冲突套路

所有 package.json 冲突都是纯版本号差异（`1.14.20` → `1.14.21`），唯独 `packages/opencode/package.json` 额外包含 `name` 字段冲突（`codegenie` vs `opencode`）。解决方式：接受上游版本号，但把 name 保留为 `codegenie`。

### bun.lock 直接接受上游即可

bun.lock 冲突块多但都是依赖锁文件，直接 `git checkout --theirs` 接受上游版本，然后 `bun install` 重新生成即可。

### Flag 命名自动合并陷阱

上游新增或修改了 `Flag.OPENCODE_*` 时，git auto-merge 会直接采用上游文本，导致本地已重命名的 `Flag.CODEGENIE_*` 被覆盖回 `OPENCODE`。本次在 `upgrade.ts` 和 `server.ts` 中都遇到了这个问题。**解决后务必全局搜索确认没有 `OPENCODE_` 残留。**

### upgrade.ts 中的重复检查

上游 v1.14.21 移除了 `upgrade.ts` 中一处重复的 autoupdate 禁用检查（原来有两个相同的 `if` 判断）。CodeGenie 之前两个位置都改成了 `CODEGENIE_DISABLE_AUTOUPDATE`，合并时只需保留第一个（行首那个），删除重复的那个。

### workspace 依赖引用名称未随品牌重命名同步

`packages/web/package.json` 中的 devDependency `"opencode": "workspace:*"` 引用的是 `packages/opencode/package.json` 的 `name` 字段。品牌重命名将 name 从 `opencode` 改为 `codegenie` 后，其他包中通过 `workspace:*` 引用该包的地方也需要同步更新依赖名。bun workspace 依赖是通过 package `name` 字段解析的，name 变了但引用没改，会导致 `bun install` 报 `Workspace dependency "opencode" not found` 错误。

**同步后务必搜索所有 `package.json` 中是否存在 `"opencode": "workspace:*"` 残留引用，以及是否有其他包的 `name` 已重命名但 workspace 引用未同步的情况。**

### server.ts 的 csharp-ls → roslyn-language-server 迁移

上游将 C# LSP 从 `csharp-ls` 替换为 `roslyn-language-server`，涉及 `dotnet tool install` 命令和二进制路径变更。同时 `Npm.which("pyright")` 新增了第二个参数 `"pyright-langserver"`。这些都是上游功能变更，应直接接受，仅保留 `CODEGENIE_DISABLE_LSP_DOWNLOAD` flag。

---
