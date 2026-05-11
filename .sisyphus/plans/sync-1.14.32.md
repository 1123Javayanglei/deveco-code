# Sync Plan: OpenCode v1.14.31 → v1.14.32

## TL;DR

> **Quick Summary**: 同步上游 OpenCode v1.14.32 到 CodeGenie sync 分支，解决 120+ 个文件冲突，保留品牌标识和本地特性，升级核心架构（InstanceStore/InstanceContext）。
> 
> **Deliverables**:
> - 合并完成的工作区（无冲突）
> - 升级后的 package.json（版本 1.14.32，name="codegenie"）
> - 修复后的测试文件（品牌标识 CODEGENIE_*）
> - 更新的 UPSTREAM-SYNC-CHANGELOG.md
> - 验证通过的构建和 TUI
> 
> **Estimated Effort**: Medium (约 185 分钟 / 3 小时)
> **Parallel Execution**: NO - sequential git merge workflow
> **Critical Path**: Merge → Logo/adapters/InstanceStore → package.json → 测试文件 → 验证 → 提交

---

## Context

### Original Request
用户请求：切到 origin/sync 分支，基于它新建 sync 分支，重新分析同步 v1.14.31 和 v1.14.32 方案。

### Interview Summary

**Key Discussions**:
- **Logo 组件处理**: 保留本地简化版 + 接受上游 subpixel rendering gate（防止低色深渲染问题）
- **adapters 重命名**: 接受上游重命名（adaptors → adapters），手动迁移本地修改到新文件
- **InstanceStore 新架构**: 已理解 Effect Service/Layer 模式，直接接受并集成

**Research Findings**:
- 上游提交数: 23 个（v1.14.31 → v1.14.32）
- 冲突文件: 120+ 个（模拟合并识别）
- 主要变更: InstanceStore/InstanceContext 新模块、opentui 升级至 0.2.2、adapters 重命名、Logo 组件重构
- 品牌标识需修复: 40+ 个测试文件 + 15+ 个 HTTPAPI 新增文件

### Metis Review

**Identified Gaps** (addressed):
- Logo 组件决策已明确（保留简化版 + subpixel gate）
- adapters 重命名迁移方案已确定（手动迁移修改）
- InstanceStore Effect 模式理解已确认（直接执行）
- 批量处理工具已规划（sed 批量替换）

---

## Work Objectives

### Core Objective
将 OpenCode v1.14.32 的变更合并到 CodeGenie sync 分支，同时保留所有 CodeGenie 品牌标识和自有特性（HarmonyOS 工具、华为登录、品牌标识等）。

### Concrete Deliverables
- Git 合并完成（无冲突状态）
- packages/opencode/package.json: version="1.14.32", name="codegenie"
- packages/web/package.json: "codegenie": "workspace:*"
- 测试文件: 所有 Flag.OPENCODE_* 替换为 Flag.CODEGENIE_*
- HTTPAPI 新增文件: 包含 CODEGENIE_* 品牌标识
- Logo 组件: 简化版 + subpixel rendering gate
- docs/upstream-sync/UPSTREAM-SYNC-CHANGELOG.md: 新增同步记录

### Definition of Done
- [ ] `git status` 无 conflict 文件
- [ ] `bun run build` 构建通过
- [ ] `bun run typecheck` 类型检查通过
- [ ] `bun run dev` TUI 正常启动（显示 CodeGenie 界面）
- [ ] `grep -r "OPENCODE_" packages/ --include="*.ts"` 无新增不应存在的残留
- [ ] UPSTREAM-SYNC-CHANGELOG.md 已更新

### Must Have
- 所有 CodeGenie 品牌标识（CODEGENIE_*）保留
- HarmonyOS 工具（HdcLogTool, SwitchCwdTool, OhKnowledgeTool）保留
- 本地内部插件（CodegenieAuthPlugin, AnalyticsPlugin, HarmonyNapiDynamicToolsPlugin）保留
- Logo 组件简化版（拒绝 shimmer/wave/burst/rings）
- name="codegenie" 在所有 package.json 中

### Must NOT Have (Guardrails)
- ❌ 上游品牌标识（OPENCODE_*）残留（测试文件除外，需批量修复）
- ❌ Logo 组件复杂交互效果（shimmer/wave/burst/rings）
- ❌ 删除本地 HarmonyOS 工具和插件
- ❌ workspace:* 依赖被覆盖为 opencode（packages/web/package.json）
- ❌ package.json name 字段被改为 opencode

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **Automated tests**: Tests-after（合并完成后运行测试验证）
- **Framework**: bun test
- **QA Policy**: 每个关键步骤后验证，最终运行完整测试套件

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Git Operations**: Use Bash (git status, git diff, git log) - Verify merge state, conflict resolution
- **Code Verification**: Use Bash (bun run build, bun run typecheck) - Verify no build/type errors
- **Brand Check**: Use Bash (grep) - Verify OPENCODE_* removal, CODEGENIE_* presence
- **TUI Verification**: Use Bash (bun run dev) - Start TUI, check CodeGenie branding

---

## Execution Strategy

### Sequential Execution Flow

> Git merge workflow cannot be parallelized. Tasks must execute in strict order.
> Each Phase must complete before the next begins.

```
Phase 1 (Merge Initialization):
├── Task 1: Execute git merge --no-ff v1.14.32 [git]

Phase 2 (High-Risk Conflicts):
├── Task 2: Logo component conflict [visual-engineering]
├── Task 3: workspace adapters rename [deep]
└── Task 4: InstanceStore/InstanceContext [deep]

Phase 3 (Batch Processing):
├── Task 5: package.json version conflicts [quick]
├── Task 6: Test file brand fixes [quick]
└── Task 7: HTTPAPI new files brand fixes [unspecified-high]

Phase 4 (Functional Conflicts):
├── Task 8-16: Other functional conflicts [unspecified-high] (parallelizable within phase)

Phase 5 (Build & Dependencies):
├── Task 17: bun.lock regeneration [quick]
└── Task 18: extension.toml update [quick]

Phase 6 (Documentation & Verification):
├── Task 19: Update CHANGELOG [writing]
├── Task 20: Build verification [quick]
├── Task 21: Typecheck verification [quick]
├── Task 22: Brand residue check [quick]
├── Task 23: TUI startup verification [quick]
└── Task 24: Test suite run [unspecified-high]

Phase 7 (Commit & Push):
├── Task 25: Final status check [quick]
├── Task 26: Commit merge [git]
└── Task 27: Push to origin [git]

Phase FINAL (Post-Merge Review):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]
```

### Dependency Matrix

- **1**: - 2-27, F1-F4
- **2**: 1 - 3-27
- **3**: 1 - 4-27
- **4**: 1 - 5-27
- **5-7**: 2-4 - 8-27
- **8-16**: 5-7 - 17-27 (can parallelize within phase)
- **17-18**: 8-16 - 19-27
- **19-24**: 17-18 - 25-27 (can parallelize verification tasks)
- **25-27**: 19-24 - F1-F4
- **F1-F4**: 25-27 -

Critical Path: 1 → 2 → 3 → 4 → 5 → 17 → 19 → 25 → F1 → F4

---

## TODOs

- [x] 1. **Execute git merge v1.14.32**

  **What to do**:
  - Execute: `git merge --no-ff v1.14.32 --no-edit`
  - Wait for merge to complete (automatic merge + conflict detection)
  - Verify: `git status` shows all conflict files
  - Record: Number of conflict files and types

  **Must NOT do**:
  - Do NOT abort merge unless critical error
  - Do NOT manually edit files before Phase 2

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single git command, straightforward execution
  - **Skills**: `git-master`
    - `git-master`: Git merge workflow, conflict detection, status reading
  - **Skills Evaluated but Omitted**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 2-27
  - **Blocked By**: None (can start immediately)

  **References**:
  - UPSTREAM-SYNC-GUIDE.md: Step 3.1 - "git merge --no-ff <tag> --no-edit"
  - Draft analysis: `.sisyphus/drafts/sync-1.14.32-analysis.md` §2 - "Conflict清单及建议"

  **Acceptance Criteria**:
  - [ ] Git merge executed successfully
  - [ ] Conflict files identified (120+ expected)
  - [ ] git status shows unmerged paths

  **QA Scenarios**:

  ```
  Scenario: Merge executes and detects conflicts
    Tool: Bash
    Preconditions: Working tree clean, on sync branch, v1.14.32 tag fetched
    Steps:
      1. git merge --no-ff v1.14.32 --no-edit
      2. git status --porcelain | grep "^UU\|^AA\|^DD" | wc -l
    Expected Result: > 100 conflict files detected
    Failure Indicators: Merge aborted, < 10 conflicts (unexpectedly low)
    Evidence: .sisyphus/evidence/task-1-merge-status.txt
  ```

  **Commit**: NO (merge commit in Phase 7)

---

- [x] 2. **Resolve Logo component conflict**

  **What to do**:
  - Read: `packages/opencode/src/cli/cmd/tui/component/logo.tsx` (both versions)
  - Strategy: Keep local simplified version + add upstream subpixel rendering gate
  - Manual merge:
    1. Preserve local simplified Logo component structure
    2. Reject upstream shimmer/wave/burst/rings effects
    3. Accept upstream subpixel rendering gate logic (truecolor support check)
    4. Keep `Flag.CODEGENIE_*` brand identifiers
  - Resolve: `git add packages/opencode/src/cli/cmd/tui/component/logo.tsx`

  **Must NOT do**:
  - Do NOT accept shimmer/wave/burst/rings complex effects
  - Do NOT remove existing CodeGenie brand identifiers
  - Do NOT use upstream Logo as-is without modification

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component merge, visual rendering logic
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed - no browser testing in merge phase

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete after merge)
  - **Parallel Group**: Sequential (Phase 2)
  - **Blocks**: Tasks 3-27
  - **Blocked By**: Task 1 (merge must complete)

  **References**:
  - Draft analysis §C.1: "Logo 组件重构 — 高风险"
  - CHANGELOG v1.14.31→v1.14.32: "logo.tsx: 保留本地简化版"
  - Brand enhancement: `specs/codegenie-brand-enhancement/source-code-changes.md`

  **Acceptance Criteria**:
  - [ ] Logo file conflict resolved
  - [ ] Simplified Logo preserved (no shimmer/wave/burst/rings)
  - [ ] Subpixel rendering gate added
  - [ ] CodeGenie brand identifiers present

  **QA Scenarios**:

  ```
  Scenario: Logo component has no complex effects
    Tool: Bash
    Preconditions: Logo file conflict resolved
    Steps:
      1. grep -E "shimmer|wave|burst|rings" packages/opencode/src/cli/cmd/tui/component/logo.tsx
      2. grep "Flag.CODEGENIE" packages/opencode/src/cli/cmd/tui/component/logo.tsx
      3. grep "truecolor.*subpixel" packages/opencode/src/cli/cmd/tui/component/logo.tsx
    Expected Result: 
      - shimmer/wave/burst/rings: 0 matches
      - CODEGENIE: > 0 matches
      - subpixel: > 0 matches
    Failure Indicators: Complex effect keywords found, brand identifiers missing
    Evidence: .sisyphus/evidence/task-2-logo-check.txt
  ```

  **Commit**: NO (commit in Phase 7)

---

- [x] 3. **Handle workspace adapters rename**

  **What to do**:
  - Rename strategy: Accept upstream rename (adaptors → adapters)
  - Manual migration:
    1. Create new files: `adapters/index.ts` and `adapters/worktree.ts`
    2. Read old files: `adaptors/index.ts` and `adaptors/worktree.ts` (HEAD version)
    3. Migrate local modifications to new files (preserve brand identifiers, local logic)
    4. Update all import references: `control-plane/adaptors` → `control-plane/adapters`
    5. Delete old files: `git rm packages/opencode/src/control-plane/adaptors/*`
    6. Resolve conflict: `git add packages/opencode/src/control-plane/adapters/*`
  - Global import update:
    - Search: `grep -r "control-plane/adaptors" packages/ --include="*.ts" -l`
    - Replace: `sed -i 's/control-plane\/adaptors/control-plane\/adapters/g'` on all found files

  **Must NOT do**:
  - Do NOT keep old adaptors directory (must rename to adapters)
  - Do NOT lose local modifications during migration
  - Do NOT skip import reference updates (will cause build failures)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding local modifications, careful migration, global impact
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - `git-master`: Could help but agent should do manual file operations

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Parallel Group**: Sequential (Phase 2)
  - **Blocks**: Tasks 4-27
  - **Blocked By**: Task 1 (merge)

  **References**:
  - Draft analysis §C.3: "workspace adapters 重命名 — 结构性变更"
  - Conflict files: `packages/opencode/src/control-plane/adaptors/*` (modify/delete)
  - CHANGELOG: "refactor: rename workspace adapters (#25272)"

  **Acceptance Criteria**:
  - [ ] New adapter files created (index.ts, worktree.ts)
  - [ ] Local modifications migrated (brand identifiers, local logic)
  - [ ] Old adaptors files deleted
  - [ ] All import references updated
  - [ ] Conflict resolved (git add completed)

  **QA Scenarios**:

  ```
  Scenario: Adapters renamed successfully
    Tool: Bash
    Preconditions: Conflict resolved
    Steps:
      1. ls packages/opencode/src/control-plane/adapters/
      2. ls packages/opencode/src/control-plane/adaptors/ 2>&1 || echo "deleted"
      3. grep -r "control-plane/adaptors" packages/ --include="*.ts" | wc -l
      4. grep -r "control-plane/adapters" packages/ --include="*.ts" | wc -l
    Expected Result:
      - adapters/: 2 files (index.ts, worktree.ts)
      - adaptors/: error/deleted
      - adaptors imports: 0
      - adapters imports: > 10
    Failure Indicators: Old adaptors directory exists, import references not updated
    Evidence: .sisyphus/evidence/task-3-adapters-rename.txt
  ```

  **Commit**: NO (commit in Phase 7)

---

- [x] 4. **Resolve InstanceStore/InstanceContext conflicts**

  **What to do**:
  - Accept upstream new modules:
    - `packages/opencode/src/project/instance-store.ts` (new file)
    - `packages/opencode/src/project/instance-context.ts` (new file)
  - Merge bootstrap.ts and instance.ts:
    1. Read both versions, accept upstream Effect Service/Layer architecture
    2. Add brand identifiers: `Flag.CODEGENIE_*` where applicable
    3. Ensure ALS correctly installed for adapter Promise bridge
  - Resolve HTTPAPI middleware conflicts:
    - Accept Instance ALS logic, add `CODEGENIE_EXPERIMENTAL_HTTPAPI`, `CODEGENIE_WORKSPACE_ID`
  - Resolve conflicts: `git add` all files

  **Must NOT do**:
  - Do NOT reject InstanceStore/InstanceContext architecture
  - Do NOT skip ALS installation (will break Promise bridge)
  - Do NOT lose brand identifiers

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Effect Service/Layer, ALS, core architecture changes
  - **Skills**: `effect`
    - `effect`: Effect v4 patterns, ALS integration

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Blocks**: Tasks 5-27
  - **Blocked By**: Task 1

  **References**:
  - Draft §C.4: "workspace.ts — Instance 模块重构"
  - AGENTS.md: "Effect v4 beta API" - ALS patterns
  - Upstream: #25418, #25417, #25376

  **Acceptance Criteria**:
  - [ ] instance-store.ts/instance-context.ts created
  - [ ] bootstrap.ts/instance.ts merged with brand identifiers
  - [ ] HTTPAPI middleware merged with brand identifiers
  - [ ] ALS installation preserved

  **QA Scenarios**:
  ```
  Scenario: InstanceStore modules exist with brand identifiers
    Tool: Bash
    Steps:
      1. ls packages/opencode/src/project/instance-store.ts
      2. grep "CODEGENIE" packages/opencode/src/project/bootstrap.ts | wc -l
    Expected Result: files exist, CODEGENIE > 0
    Evidence: .sisyphus/evidence/task-4-instance.txt
  ```

  **Commit**: NO

---

- [x] 5. **Handle package.json version conflicts**

  **What to do**:
  - Process 17 package.json files:
    1. Accept upstream version upgrade (1.14.31 → 1.14.32)
    2. Special handling:
       - `packages/opencode/package.json`: Ensure `name="codegenie"`
       - `packages/web/package.json`: Ensure `"codegenie": "workspace:*"`
    3. Resolve: `git add packages/*/package.json`

  **Must NOT do**:
  - Do NOT allow name="opencode"
  - Do NOT allow "opencode": "workspace:*"

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Batch processing, straightforward

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Phase 2)
  - **Blocks**: Tasks 6-27
  - **Blocked By**: Tasks 2-4

  **References**:
  - Draft §A: "package.json 版本号冲突"
  - CHANGELOG: "auto-merge 陷阱修复"

  **Acceptance Criteria**:
  - [ ] All 17 package.json conflicts resolved
  - [ ] name="codegenie" in packages/opencode/package.json
  - [ ] "codegenie": "workspace:*" in packages/web/package.json

  **QA Scenarios**:
  ```
  Scenario: Package.json versions correct
    Tool: Bash
    Steps:
      1. grep '"name"' packages/opencode/package.json
      2. grep 'codegenie.*workspace' packages/web/package.json
      3. grep -r '"version":.*1\.14\.32' packages/*/package.json | wc -l
    Expected Result: name=codegenie, workspace=codegenie, versions >= 16
    Evidence: .sisyphus/evidence/task-5-package-json.txt
  ```

  **Commit**: NO

---

- [x] 6. **Batch fix test file brand identifiers**

  **What to do**:
  - Batch replace OPENCODE_* → CODEGENIE_*:
    1. Find files: `grep -r "OPENCODE_" packages/opencode/test/ --include="*.ts" -l`
    2. Replace: `sed -i 's/OPENCODE_/CODEGENIE_/g'` on all files
    3. Verify: OPENCODE_ residue < 5
    4. Resolve: `git add packages/opencode/test/`

  **Must NOT do**:
  - Do NOT modify non-test files
  - Do NOT leave OPENCODE_ residue

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Batch sed replacement

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 5)
  - **Blocks**: Tasks 7-27
  - **Blocked By**: Task 5

  **References**:
  - Draft §B: "测试文件冲突"
  - CHANGELOG: "Flag.OPENCODE_* → Flag.CODEGENIE_*"

  **Acceptance Criteria**:
  - [ ] 40+ test files processed
  - [ ] OPENCODE_ residue < 5
  - [ ] CODEGENIE_ count > 100

  **QA Scenarios**:
  ```
  Scenario: Test files have CODEGENIE identifiers
    Tool: Bash
    Steps:
      1. grep -r "OPENCODE_" packages/opencode/test/ --include="*.ts" | wc -l
      2. grep -r "CODEGENIE_" packages/opencode/test/ --include="*.ts" | wc -l
    Expected Result: OPENCODE_ < 5, CODEGENIE_ > 100
    Evidence: .sisyphus/evidence/task-6-test-brand.txt
  ```

  **Commit**: NO

---

- [x] 7. **Add brand identifiers to HTTPAPI new files**

  **What to do**:
  - Process HTTPAPI new files (groups/handlers/middleware):
    1. Find files in `httpapi/groups/`, `handlers/`, `middleware/`
    2. Add brand identifiers:
       - `Flag.CODEGENIE_EXPERIMENTAL_HTTPAPI`
       - `Flag.CODEGENIE_WORKSPACE_ID`
       - Headers: `x-codegenie-directory`, `x-codegenie-workspace`
    3. Resolve add/add conflicts: `git add`

  **Must NOT do**:
  - Do NOT use OPENCODE_* identifiers
  - Do NOT leave x-opencode headers

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: HTTPAPI architecture, multiple files

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 6)
  - **Blocks**: Tasks 8-27
  - **Blocked By**: Task 6

  **References**:
  - Draft §C.8: "HTTPAPI middleware/groups/handlers 新增文件"

  **Acceptance Criteria**:
  - [ ] 15+ HTTPAPI files processed
  - [ ] CODEGENIE identifiers present
  - [ ] x-opencode headers = 0

  **QA Scenarios**:
  ```
  Scenario: HTTPAPI files have CodeGenie identifiers
    Tool: Bash
    Steps:
      1. grep -r "CODEGENIE" packages/opencode/src/server/routes/instance/httpapi/ --include="*.ts" | wc -l
      2. grep -r "x-opencode" packages/opencode/src/server/routes/instance/httpapi/ --include="*.ts" | wc -l
    Expected Result: CODEGENIE > 20, x-opencode = 0
    Evidence: .sisyphus/evidence/task-7-httpapi-brand.txt
  ```

  **Commit**: NO

---

- [x] 8. **Resolve remaining functional conflicts** (Batch: 9 sub-conflicts)

  **What to do**:
  Resolve remaining source code conflicts with brand preservation:
  - **8a. tui/app.tsx**: Accept renderer.waitForThemeMode() + prewarm palette, keep `CODEGENIE_*`
  - **8b. workspace.ts**: Accept Instance ALS, keep `CODEGENIE_EXPERIMENTAL_WORKSPACES`
  - **8c. config.ts**: Accept containsPath() simplification, keep `CODEGENIE_CONFIG_CONTENT`
  - **8d. skill/index.ts**: Merge CLAUDE_EXTERNAL_DIR support, keep local brand + Defaults.ensure()
  - **8e. tool/registry.ts**: Keep HarmonyOS tools + `CODEGENIE_*` identifiers
  - **8f. llm.ts**: Keep `x-codegenie-*` headers + `User-Agent: codegenie/*`
  - **8g. tool/bash.ts**: Keep `CODEGENIE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS`
  - **8h. plugin/index.ts**: Keep CodegenieAuthPlugin + AnalyticsPlugin + HarmonyNapiDynamicToolsPlugin
  - **8i. instruction.ts**: Merge config.instructions, keep `CODEGENIE_DISABLE_*` flags
  - Resolve all: `git add` modified files

  **Must NOT do**:
  - Do NOT remove HarmonyOS tools
  - Do NOT use OPENCODE headers
  - Do NOT delete local plugins

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` (for entire batch)
    - Reason: Multiple conflicts, brand preservation critical
  - **Parallelization**: Tasks 8a-8i can run in parallel within this batch

  **Acceptance Criteria**:
  - [ ] All 9 sub-conflicts resolved
  - [ ] HarmonyOS tools preserved
  - [ ] Brand identifiers present in all files

  **QA Scenarios**:
  ```
  Scenario: Functional conflicts resolved with brand preservation
    Tool: Bash
    Steps:
      1. grep "HdcLogTool\|SwitchCwdTool\|OhKnowledgeTool" packages/opencode/src/tool/registry.ts | wc -l
      2. grep "x-codegenie" packages/opencode/src/session/llm.ts | wc -l
      3. grep "CODEGENIE" packages/opencode/src/config/config.ts | wc -l
    Expected Result: Tools > 0, x-codegenie > 0, CODEGENIE > 0
    Evidence: .sisyphus/evidence/task-8-functional.txt
  ```

  **Commit**: NO

---

- [x] 9. **Regenerate bun.lock and update extension.toml**

  **What to do**:
  - Run: `bun install` to regenerate bun.lock
  - Update `packages/extensions/zed/extension.toml`:
    - Accept version upgrade
    - Update download URL to v1.14.32
  - Resolve conflicts: `git add bun.lock packages/extensions/zed/extension.toml`

  **Must NOT do**:
  - Do NOT manually edit bun.lock

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard bun install, simple file edit

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 8)
  - **Blocks**: Tasks 10-27
  - **Blocked By**: Task 8

  **Acceptance Criteria**:
  - [ ] bun.lock regenerated successfully
  - [ ] extension.toml updated (version + URL)

  **QA Scenarios**:
  ```
  Scenario: Dependencies regenerated
    Tool: Bash
    Steps:
      1. bun install
      2. ls bun.lock
      3. grep "version.*1\.14\.32" packages/extensions/zed/extension.toml
    Expected Result: bun.lock exists, version correct
    Evidence: .sisyphus/evidence/task-9-deps.txt
  ```

  **Commit**: NO

---

- [x] 10. **Update UPSTREAM-SYNC-CHANGELOG.md**

  **What to do**:
  - Add new sync record to `docs/upstream-sync/UPSTREAM-SYNC-CHANGELOG.md`:
    - Date: 2026-05-11
    - Version: v1.14.31 → v1.14.32
    - Branch: sync
    - Conflicts: 120+ files
    - Key changes: InstanceStore, opentui 0.2.2, adapters rename, Logo, brand fixes
  - Document conflict resolution strategy (reference Draft analysis)
  - Resolve: `git add docs/upstream-sync/UPSTREAM-SYNC-CHANGELOG.md`

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation writing

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 9)
  - **Blocks**: Tasks 11-27
  - **Blocked By**: Task 9

  **Acceptance Criteria**:
  - [ ] CHANGELOG updated with complete sync record
  - [ ] Conflict resolution strategy documented

  **QA Scenarios**:
  ```
  Scenario: CHANGELOG updated
    Tool: Bash
    Steps: grep "v1.14.31 → v1.14.32" docs/upstream-sync/UPSTREAM-SYNC-CHANGELOG.md | wc -l
    Expected Result: count = 1
    Evidence: .sisyphus/evidence/task-10-changelog.txt
  ```

  **Commit**: NO

---

- [x] 11. **Verify build and typecheck**

  **What to do**:
  - Run: `bun run build`
  - Run: `bun run typecheck`
  - Verify: No errors, all pass

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard build verification

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 10)
  - **Blocks**: Tasks 12-27
  - **Blocked By**: Task 10

  **Acceptance Criteria**:
  - [ ] Build passes (no errors)
  - [ ] Typecheck passes (no type errors)

  **QA Scenarios**:
  ```
  Scenario: Build and typecheck pass
    Tool: Bash
    Steps:
      1. bun run build 2>&1 | tee .sisyphus/evidence/task-11-build.txt
      2. bun run typecheck 2>&1 | tee .sisyphus/evidence/task-11-typecheck.txt
    Expected Result: exit code 0, no errors
  ```

  **Commit**: NO

---

- [x] 12. **Check brand residue**

  **What to do**:
  - Verify no OPENCODE_ residue:
    - `grep -r "OPENCODE_" packages/ --include="*.ts" | grep -v test/ | wc -l` (expected: 0)
  - Verify no x-opencode headers:
    - `grep -r "x-opencode" packages/ --include="*.ts" | wc -l` (expected: 0)
  - Investigate any residue found

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: grep verification

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 11)
  - **Blocks**: Tasks 13-27
  - **Blocked By**: Task 11

  **Acceptance Criteria**:
  - [ ] OPENCODE_ residue = 0 (excluding test files)
  - [ ] x-opencode headers = 0

  **QA Scenarios**:
  ```
  Scenario: No brand residue
    Tool: Bash
    Steps:
      1. grep -r "OPENCODE_" packages/ --include="*.ts" | grep -v test/ | wc -l
      2. grep -r "x-opencode" packages/ --include="*.ts" | wc -l
    Expected Result: both = 0
    Evidence: .sisyphus/evidence/task-12-brand.txt
  ```

  **Commit**: NO

---

- [x] 13. **Verify TUI startup**

  **What to do**:
  - Run: `bun run dev` (start TUI)
  - Verify: TUI starts successfully, shows CodeGenie branding
  - Stop TUI after verification

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: TUI startup verification

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 12)
  - **Blocks**: Tasks 14-27
  - **Blocked By**: Task 12

  **Acceptance Criteria**:
  - [ ] TUI starts without errors
  - [ ] CodeGenie branding visible

  **QA Scenarios**:
  ```
  Scenario: TUI starts with CodeGenie branding
    Tool: Bash (interactive)
    Steps: bun run dev (verify startup, then stop)
    Expected Result: TUI starts, CodeGenie branding shown
    Evidence: .sisyphus/evidence/task-13-tui.txt
  ```

  **Commit**: NO

---

- [x] 14. **Run test suite**

  **What to do**:
  - Run: `bun run test` (execute all tests)
  - Verify: Tests pass (may have minor failures, investigate if critical)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Test suite execution, failure investigation

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 13)
  - **Blocks**: Tasks 15-27
  - **Blocked By**: Task 13

  **Acceptance Criteria**:
  - [ ] Test suite executed
  - [ ] Critical tests pass (minor failures investigated)

  **QA Scenarios**:
  ```
  Scenario: Test suite runs
    Tool: Bash
    Steps: bun run test 2>&1 | tee .sisyphus/evidence/task-14-tests.txt
    Expected Result: Tests complete, no critical failures
  ```

  **Commit**: NO

---

- [ ] 15. **Final git status check**

  **What to do**:
  - Run: `git status`
  - Verify: No conflict files remaining
  - Verify: All modified files properly staged

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Git status verification

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 14)
  - **Blocks**: Tasks 16-27 + F1-F4
  - **Blocked By**: Task 14

  **Acceptance Criteria**:
  - [ ] No unmerged paths (conflicts)
  - [ ] All changes staged for commit

  **QA Scenarios**:
  ```
  Scenario: Working tree clean
    Tool: Bash
    Steps: git status --porcelain | grep "^UU\|^AA\|^DD" | wc -l
    Expected Result: count = 0 (no conflicts)
    Evidence: .sisyphus/evidence/task-15-status.txt
  ```

  **Commit**: NO

---

- [ ] 16. **Commit merge**

  **What to do**:
  - Create merge commit:
    - Message: `sync: OpenCode v1.14.31 → v1.14.32`
    - Body: Key changes + conflicts resolved + brand preservation
  - Execute: `git commit`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Git commit

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 15)
  - **Blocks**: Tasks 17-27 + F1-F4
  - **Blocked By**: Task 15

  **Acceptance Criteria**:
  - [ ] Merge commit created
  - [ ] Commit message includes detailed changes

  **QA Scenarios**:
  ```
  Scenario: Merge commit created
    Tool: Bash
    Steps: git log -1 --oneline
    Expected Result: shows merge commit
    Evidence: .sisyphus/evidence/task-16-commit.txt
  ```

  **Commit**: YES (this is the merge commit)

---

- [ ] 17. **Push to origin/sync**

  **What to do**:
  - Execute: `git push origin sync`
  - Verify: Push successful

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Git push

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 16)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 16

  **Acceptance Criteria**:
  - [ ] Push successful
  - [ ] Sync branch updated on origin

  **QA Scenarios**:
  ```
  Scenario: Push successful
    Tool: Bash
    Steps: git push origin sync 2>&1 | tee .sisyphus/evidence/task-17-push.txt
    Expected Result: push succeeds, no errors
  ```

  **Commit**: NO (push only)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify all "Must Have" present, all "Must NOT Have" absent. Check evidence files.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run build + typecheck + tests. Review for AI slop patterns.

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start TUI, verify CodeGenie branding, test basic functionality.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify no scope creep, all changes align with plan.

---

## Commit Strategy

- **Single Commit**: Merge commit with detailed message
- **Message**: `sync: OpenCode v1.14.31 → v1.14.32`
- **Body**: 
  ```
  Key changes:
  - InstanceStore/InstanceContext new modules
  - opentui upgrade to 0.2.2
  - workspace adapters rename (adaptors → adapters)
  - Logo component: simplified version + subpixel gate
  - Brand fixes: OPENCODE_* → CODEGENIE_* in tests
  
  Conflicts resolved:
  - 120+ files (package.json, tests, HTTPAPI, core modules)
  - Brand identifiers preserved throughout
  - HarmonyOS tools and plugins retained
  ```

---

## Success Criteria

### Verification Commands
```bash
git status                              # Expected: nothing to merge, clean working tree
bun run build                           # Expected: success, no errors
bun run typecheck                       # Expected: success, no type errors
bun run dev                             # Expected: TUI starts, shows CodeGenie branding
grep -r "OPENCODE_" packages/ --include="*.ts" | grep -v test/ | wc -l  # Expected: 0
grep -r "x-opencode" packages/ --include="*.ts" | wc -l                 # Expected: 0
grep "name.*codegenie" packages/opencode/package.json                  # Expected: present
grep "codegenie.*workspace" packages/web/package.json                  # Expected: present
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Build passes
- [ ] Typecheck passes
- [ ] TUI starts with CodeGenie branding
- [ ] No OPENCODE_ residue (except in test files, all fixed)
- [ ] UPSTREAM-SYNC-CHANGELOG.md updated
- [ ] Merge commit pushed to origin/sync