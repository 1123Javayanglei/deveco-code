---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
agent: goal
---

## Shared Rules
- **Paths**: `CONFIG_ROOT` = `~/.local/share/deveco/` (resolve `~` to OS home dir). `PROJECT_ROOT` = workspace root. `spec/` relative to `{PROJECT_ROOT}`.
- **Language**: Match output to user's input language. Default: system language.
- **Knowledge**: When `arkts_knowledge_search` is available, verify ArkTS syntax/APIs before responding.
- **No Early Coding**: No code in `src/` during this step. Architecture diagrams, data models, interface contracts allowed; pseudocode and code snippets are not.
- **No Auto-Execute**: This command covers only its own scope. Phase transitions managed by parent orchestrator (`goal.txt`).
- **Safety**: GitHub-flavored markdown. No URLs. No prohibited content. Anti-loop: if repetitive, stop.

## Workflow

1. **Setup & Directory Resolution**:
   - Read `feature_directory` from `{PROJECT_ROOT}/spec/feature.json` (relative path). Prepend `{PROJECT_ROOT}` → `Confirmed_Feature_Dir`.
     Example: `"feature_directory": "spec/add-user-auth"` → `Confirmed_Feature_Dir` = `{PROJECT_ROOT}/spec/add-user-auth`.
   - `FEATURE_SPEC` = `Confirmed_Feature_Dir/spec.md`
   - `IMPL_PLAN` = `Confirmed_Feature_Dir/plan.md`

2. **Check Existing Document** (if `IMPL_PLAN` exists):
   - Preserve valid sections. Update only sections impacted by `FEATURE_SPEC`.
   - Append `## Changelog`: timestamp, modified sections, rationale.

3. **Load Context & Template**:
   - Read `FEATURE_SPEC`.
   - Load `{CONFIG_ROOT}/specs/templates/plan-template.md`.
   - **Fallback**: Initialize with `## Summary, ## Technical Context, ## Project Structure, ## Complexity Tracking, ## Research & Decisions, ## Data Model, ## Contracts & Interfaces`.

4. **Execute Plan Workflow**:
   - Fill `Technical Context`
   - Phase 0: Research unknowns, document decisions inline
   - Phase 1: Design data structures, interfaces, setup guidelines
   - Finalize and validate

5. **Write**: Use `spec_write` with `filePath: "{IMPL_PLAN}"`. Do NOT use generic `write`.

6. **Stop**: Report `IMPL_PLAN` path and generated artifacts. Do not trigger further actions.

## Phases

### Phase 0: Research & Resolution
1. Identify knowledge gaps from Technical Context.
2. Resolve and document inline in `## Research & Decisions`:
   - **Decision**: [chosen approach]
   - **Rationale**: [reasoning]
   - **Alternatives considered**: [other options]

### Phase 1: Architecture & Contracts Design
**Prerequisites:** Phase 0 complete

1. **Data Modeling**: Extract entities, fields, relationships, validation rules, state transitions → `## Data Model` section.
2. **Interface Contracts**: Identify external interfaces (APIs, CLI, endpoints, UI contracts) → `## Contracts & Interfaces` section. Omit for purely internal projects.
3. **Finalize**: Review for completeness, consistency, alignment with `FEATURE_SPEC`.

## Key Rules
- All design artifacts consolidated in `IMPL_PLAN` (research, models, contracts).
- Use absolute paths for all references.
- Halt on unresolved critical issues:
  ```text
  [ERROR] <reason>
  [ACTION_REQUIRED] <instruction needed>
  [STATUS] TERMINATED
  ```
- Output must be self-contained for downstream task generation.
