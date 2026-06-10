---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
agent: goal
---

## Pre-Flow: Resolve Confirmed_Feature_Dir
1. Read `feature_directory` from `{PROJECT_ROOT}/spec/feature.json` (relative path). Prepend `{PROJECT_ROOT}` → `Confirmed_Feature_Dir`.
   Example: `"feature_directory": "spec/add-user-auth"` → `{PROJECT_ROOT}/spec/add-user-auth`.
2. Validate: if directory doesn't exist, halt with error.

## Shared Rules
- **Paths**: `CONFIG_ROOT` = `~/.local/share/deveco/` (resolve `~` to OS home dir). `PROJECT_ROOT` = workspace root.
- **Language**: Match output to user's input language. Default: system language.
- **Knowledge**: When `arkts_knowledge_search` is available, verify ArkTS syntax/APIs before responding.
- **No Early Coding**: No code in `src/` during this step. Implementation target descriptions (file paths, component names, task descriptions) in `tasks.md` are permitted.
- **No Auto-Execute**: This command covers only its own scope. Phase transitions managed by parent orchestrator (`goal.txt`).
- **Safety**: GitHub-flavored markdown. No URLs. No prohibited content. Anti-loop: if repetitive, stop.

## Workflow
1. **Load & Validate**: Read from `Confirmed_Feature_Dir`:
   - **Expected**: `plan.md` (tech stack, structure), `spec.md` (user stories with priorities)
   - **Fallback**: If missing, insert `⚠️ MISSING ARTIFACTS` block listing missing files. Generate best-effort tasks. **DO NOT fabricate specs.**
2. **Generate Tasks**:
   - Extract tech stack & structure from `plan.md`
   - Extract user stories & priorities (P1, P2, P3...) from `spec.md`
   - Map tasks to stories, generate dependency graph, identify parallel opportunities
   - Validate: each story must have independent test criteria and be incrementally deliverable
3. **Generate tasks.md**: Use `{CONFIG_ROOT}/specs/templates/tasks-template.md` as skeleton. If missing, use Phase Structure below. Fill with:
   - Feature name from `plan.md`
   - Phased tasks (Setup → Foundational → Stories → Polish → Verification)
   - Dependency graph & parallel execution guide
4. **Write**: Use `spec_write` with `filePath: "{Confirmed_Feature_Dir}/tasks.md"`. Do NOT use generic `write`.
5. **Report**: Output path + summary (total tasks, per-story count, parallel opportunities, independent test criteria, suggested MVP scope).

## Task Generation Rules
**CRITICAL**: Tasks organized by user story for independent implementation and testing.
**Tests are OPTIONAL**: Only if explicitly requested or TDD approach specified.

### Checklist Format (REQUIRED)
Every task: `- [ ] [TaskID] [P?] [Story?] Description with exact file path`

1. **Checkbox**: Always `- [ ]`
2. **Task ID**: Sequential (T001, T002...) in execution order
3. **[P] marker**: Only if parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: Required for user story tasks only — `[US1]`, `[US2]`, etc. Setup/Foundational/Polish: no label.
5. **Description**: Clear action with concrete file path

**Examples**:
- ✅ `- [ ] T001 Create project structure per implementation plan`
- ✅ `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ `- [ ] Create User model` (missing ID and Story label)
- ❌ `T001 [US1] Create model` (missing checkbox)
- ❌ `- [ ] [US1] Create User model` (missing Task ID)
- ❌ `- [ ] T001 [US1] Create model` (missing file path)

### Output Format Extensions
- **Dependencies**: `## 📊 Dependency Graph` — valid Mermaid `graph TD` syntax.
- **Parallel Execution**: `## ⚡ Parallel Execution Guide` — table: `Phase | Tasks | Required Files | Execution Notes`.

### Phase Structure
1. **Setup**: Project init, tooling, shared config
2. **Foundational**: Blocking prerequisites (must complete before stories)
3. **User Stories**: Ordered by P1, P2, P3... from `spec.md`
   - Per story: Tests (if requested) → Models → Services → Endpoints/UI → Integration
   - Each phase = complete, independently testable increment
4. **Polish**: Cross-cutting concerns, docs, cleanup
5. **Verification**: Build, deploy, optional UI verification (populated based on parent workflow's verification choice)
   - **MUST include**: build task + deploy task
     - Example: `- [ ] TXXX Build project and fix any compilation errors`
     - Example: `- [ ] TXXX Deploy application to device/emulator via start_app`
   - **Conditionally include** (only if verification choice is `Run verification + UI verification`):
     - Example: `- [ ] TXXX Run UI verification against deployed application`
   - **If `Run verification` (build-only)**: NO UI verification task.
   - **Scope hint**: Add HTML comment at top of Verification section:
     - `<!-- verification_scope: build-only -->` or `<!-- verification_scope: build+ui -->`
   - Verification tasks do NOT carry `[USx]` labels.

## Self-Validation
Before outputting `tasks.md`, verify:
- ✅ Every task starts with `- [ ]`
- ✅ Every task has unique sequential ID (T001, T002...)
- ✅ US-phase tasks have `[USx]`; Setup/Foundational/Polish do NOT
- ✅ Total count matches summary report
If any check fails, regenerate invalid tasks. Do not output unvalidated versions.

Each task must be specific enough for an LLM to complete without additional context.
