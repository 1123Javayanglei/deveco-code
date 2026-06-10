---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md.
agent: goal
---

## Shared Rules
- **Paths**: `CONFIG_ROOT` = `~/.local/share/deveco/` (resolve `~` to OS home dir). `PROJECT_ROOT` = workspace root. `spec/` relative to `{PROJECT_ROOT}`.
- **Language**: Match output to user's input language. Default: system language.
- **Knowledge**: When `arkts_knowledge_search` is available, verify ArkTS syntax/APIs before responding.
- **Safety**: GitHub-flavored markdown. No URLs. No prohibited content. Anti-loop: if repetitive, stop.

## Constraints
1. **Autonomy**: Proceed autonomously through Setup → Foundational → Stories → Polish without intermediate prompts, unless failure/conflict triggered. **Scope ends at Polish phase** — do NOT trigger Phase 5 (Verification). Phase transitions managed by parent orchestrator (`goal.txt`).
2. **Tool Restriction**: `verify_ui`, `build_project`, `start_app` MUST NOT be invoked here. The **Verification phase** in `tasks.md` (marked with `<!-- verification_scope: ... -->`) is OUT OF SCOPE — do NOT execute or mark its tasks.
3. **Empty Project**: If workspace has no valid project files, call `deveco-create-project` skill directly. Do not ask questions.

## Feature Directory Resolution
Read `feature_directory` from `{PROJECT_ROOT}/spec/feature.json` (relative path). Prepend `{PROJECT_ROOT}` → `Confirmed_Feature_Dir`.
Example: `"feature_directory": "spec/add-user-auth"` → `{PROJECT_ROOT}/spec/add-user-auth`.

## Execution

1. **Context Init**:
   - Load tech-stack skills (e.g., `arkui-knowledge`, `arkts-grammar-standards`) per `plan.md`.
   - Resolve feature directory.
   - Read `tasks.md` and `plan.md` from `Confirmed_Feature_Dir`.

2. **Parse Task Structure**:
   - Extract phases: Setup, Foundational, User Stories, Polish.
   - **Skip Verification phase** — owned by `spec-verify` subagent.
   - Identify dependencies (sequential vs `[P]` parallel).
   - Map execution flow, resolve file conflicts.

3. **Phase-by-Phase Execution**:
   - Execute phases strictly in order. No skipping.
   - Sequential tasks in order; `[P]` tasks can run together.
   - **File Conflict Rule**: Multiple tasks targeting same file → enforce sequential execution.
   - **Phase Completion Protocol**: IMMEDIATELY after completing all tasks in a phase, use `edit` to mark that phase's checkboxes `[X]` in `tasks.md`. Do NOT defer or batch across phases. Each phase marked as soon as it finishes.

4. **Implementation Workflow**:
   - **Setup**: Project structure, dependencies, base config.
   - **Core**: Models, services, components, endpoints.
   - **Integration**: Databases, middleware, logging, external services.
   - **Polish**: Documentation, cleanup.

5. **Progress & Errors**:
   - Report concise progress after each task.
   - **Failure**: Halt on critical sequential task failure. For `[P]` tasks, continue successful ones, log failures.

6. **Completion**:
   - No functional validation in this phase.
   - Output final summary: completed work, skipped/failed items.

> If tasks are incomplete or ambiguous, halt and regenerate plan before proceeding.
