# Config Migration Lessons Learned

> **策略**: 本次配置迁移采用**直接替换策略**，无向后兼容。

## 执行总结

### 已完成的工作
- ✅ 所有 `OPENCODE_*` 环境变量 → `CODEGENIE_*` (~232 处引用，~47 个文件)
- ✅ 配置文件名: `opencode.json` → `codegenie.json`, `opencode.jsonc` → `codegenie.jsonc`
- ✅ 配置目录名: `.opencode` → `.codegenie`
- ✅ `CODEGENIE_DISABLE_CLAUDE_CODE` 默认为 `true`（逻辑反转）
- ✅ specs/config-migration/ 文档套件更新

### 验证结果（2026-04-22）
- **src/ 目录**: 0 个 `Flag.OPENCODE_*` 引用（全部已改为 `Flag.CODEGENIE_*`）
- **SDK 包名**: 0 个 `@codegenie-ai` 误改（保持 `@opencode-ai`，共 111 处引用）
- **Effect ID**: 0 个 `@codegenie/` 误改（保持 `@opencode/`）
- **类型检查**: src/ 目录无错误

---

## 关键教训

### 1. 直接替换策略的优劣

**优势**:
- 代码简洁，无复杂逻辑
- 维护负担低，无"双重品牌"
- 用户迁移清晰明确

**劣势**:
- 用户需一次性迁移，无过渡期
- 旧配置文件需手动重命名

**决策依据**:
- 当用户迁移成本可控时，直接替换优于向后兼容
- 避免"兼容地狱"（多种格式并存导致的维护复杂性）

---

### 2. Workspace 依赖同步 (CRITICAL)

**问题**: 当 `packages/opencode/package.json` 的 `name` 改变时，其他 workspace 包中引用它的依赖不会自动更新。

**示例**:
```json
// packages/web/package.json (原来)
"devDependencies": {
  "opencode": "workspace:*"
}

// packages/web/package.json (必须手动改为)
"devDependencies": {
  "codegenie": "workspace:*"
}
```

**解决方案**:
```bash
# 搜索所有 workspace 内 package.json
Get-ChildItem -Path packages -Recurse -Include "package.json" | Select-String -Pattern '"opencode":|"@opencode-ai/opencode":'
```

---

### 3. 外部依赖保持不变（CRITICAL）

以下引用 **不应修改**（外部 NPM 包或 SDK）:

| 类别 | 内容 | 原因 |
|-----|------|------|
| SDK 包名 | `@opencode-ai/sdk`, `@opencode-ai/shared`, `@opencode-ai/plugin` | 独立 NPM 包 |
| 外部插件 | `opencode-gitlab-auth`, `opencode-poe-auth` | 外部认证插件 |
| SDK 类型 | `OpencodeClient`, `createOpencodeClient` | SDK 导出 |
| Effect ID | `@opencode/Plugin`, `@opencode/Session` | Effect Context Service 标识符 |
| GitHub 仓库 | `sst/opencode` 等仓库 URL | 外部仓库地址 |
| 网站地址 | `https://opencode.ai` | 外部网站 URL |

**教训**: 批量重命名时，应先明确"不改清单"，避免过度替换导致包解析失败。

---

### 4. Claude Code 禁用实现

**flag.ts 修改**:
```typescript
// 原来 (默认 false - Claude Code 启用)
const OPENCODE_DISABLE_CLAUDE_CODE = truthy("OPENCODE_DISABLE_CLAUDE_CODE")

// 改为 (默认 true - Claude Code 禁用)
export const CODEGENIE_DISABLE_CLAUDE_CODE = !falsy("CODEGENIE_DISABLE_CLAUDE_CODE")
```

**语义表**:

| 环境变量取值 | `falsy` | 结果 |
| ------------ | ------- | ---- |
| 未设置 | 假 | **禁用** |
| `0` / `false` | 真 | **启用** |
| 其他值 | 假 | **禁用** |

---

### 5. 批量替换安全方法

**问题**: PowerShell `Get-Content -Raw` + `Set-Content -NoNewline` 可能破坏 UTF-8 编码或文件结构

**安全方法**:
```powershell
# 使用 System.IO.File 替代 Set-Content
[System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::utf8)
```

**每次批量操作后立即验证**:
```bash
bun typecheck
```

---

### 6. 重命名范围明确界定

**建议的清单格式**:

```markdown
## 重命名范围确认

### 需要重命名
- [x] 环境变量: OPENCODE_* → CODEGENIE_*
- [x] 配置文件: opencode.json → codegenie.json
- [x] 配置目录: .opencode → .codegenie
- [x] Claude Code 继承: 默认禁用

### 不需要重命名（明确排除）
- [ ] SDK 包名: @opencode-ai/sdk, @opencode-ai/shared, @opencode-ai/plugin
- [ ] 外部插件包: opencode-gitlab-auth, opencode-poe-auth
- [ ] SDK 类型/函数: OpencodeClient, createOpencodeClient
- [ ] Effect Service ID: @opencode/Plugin, @opencode/Session 等
- [ ] GitHub 仓库 URL
- [ ] 网站 URL: https://opencode.ai
```

---

## 变更文件统计

### src/ 目录（实际统计）

| 文件路径 | CODEGENIE 引用数 |
|---------|-----------------|
| flag/flag.ts | 67 |
| lsp/server.ts | 23 |
| config/config.ts | 18 |
| session/instruction.ts | 9 |
| cli/cmd/tui/config/tui.ts | 8 |
| cli/cmd/tui/app.tsx | 6 |
| provider/models.ts | 5 |
| storage/db.ts | 5 |
| tool/registry.ts | 4 |
| plugin/index.ts | 4 |
| control-plane/workspace.ts | 4 |
| 其他文件 (~27个) | 各 2-3 |
| **总计** | **~232 处引用** |

### 不修改的内容确认

| 类别 | 引用数 | 说明 |
|-----|-------|------|
| @opencode-ai/* SDK | 111 | 保持不变 |
| @opencode/* Effect ID | - | 保持不变 |
| OPENCODE_VERSION 等构建变量 | - | 构建时注入，保持不变 |
| OPENCODE_PROCESS_ROLE 等 | - | Worker 通信标识，保持不变 |

### 文档更新

| 文档 | 状态 |
|-----|------|
| source-code-changes.md | ✅ 已更新（完整环境变量映射表） |
| lessons-learned.md | ✅ 已更新 |
| 其他 spec 文档 | ✅ 保持原状