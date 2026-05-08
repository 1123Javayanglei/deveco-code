---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
agent: spec
---

## Pre-Flow: FEATURE_DIR Resolution & User Confirmation (STRICT SEQUENCE)
1. Resolve target path:
    - If `$ARGUMENTS` is not empty → `TARGET = .specs/$ARGUMENTS`
    - If `$ARGUMENTS` is empty → `TARGET = value from .specs/feature.json` (key: `default_feature_dir`)
2. Validate directory:
    - Check if `TARGET` exists.
    - If exists → `FEATURE_DIR = TARGET`
    - If not exists → `FEATURE_DIR = fallback directory from .specs/feature.json`
3. **User Confirmation (MANDATORY)**: Call the `question` tool with: `"Use '{FEATURE_DIR}' as the current feature working directory? (Reply yes/no)"`
4. Execution Gate: Proceed to the main workflow **ONLY** if the user explicitly replies "yes". If "no" or ambiguous, halt immediately and prompt for a valid directory.

## User Input
```text
$ARGUMENTS
```
You **MUST** consider the user input before proceeding (if not empty).

## DYNAMIC CONFIG ROOT RESOLUTION RULE
Configuration root `CONFIG_ROOT` is resolved at runtime by fixed priority:
1. FIRST: Project-level configuration directory `.codegenie`
2. FALLBACK: User-level global directory `~/.config/codegenie/`, The tilde symbol `~` denotes the **user home directory**.
   Lookup sequence: Always check the higher-priority directory first. If the target file is not found, sequentially search the lower-priority fallback directory.

## STRICT OPERATIONAL CONSTRAINTS (ENFORCED WITH ZERO EXCEPTIONS)
1. **No Early Coding**: You are strictly forbidden from writing any application code in the `src/` directory in this step. This includes code snippets, pseudocode, or implementation details. Main Agent must comply fully.
2. **No Auto-Execute Next Command**: Upon completion of `/spec-tasks`, refrain from auto-executing any follow-up commands including `/spec-implement`. Remain idle and await clear user instruction.
3. **Hard Context Lock**: All logic, config lookup, and state management only runs in subagent `general`.

## Language Rules
**Document language must match user input language; default to system language if no user input is provided**:
- Detect the language used in user input (Chinese, English, etc.)
- If there is **no valid user input content**, automatically use the **current system default language** as the output language
- Generate all document content in the detected user input language (or system fallback language)
- Section titles, descriptions, and explanations must use the consistent determined language
- Preserve original form of proper nouns, technical terms, code, and commands

## Outline & Workflow
1. **Load & Validate Design Documents**: Read from confirmed `FEATURE_DIR`:
    - **Expected**: `plan.md` (tech stack, libraries, structure), `spec.md` (user stories with priorities)
    - **Fallback Rule**: If `plan.md` or `spec.md` is missing, insert a `⚠️ MISSING ARTIFACTS` block at the top of `tasks.md`. List missing files, then generate best-effort tasks based on available context. **DO NOT fabricate fictional specs.**
2. **Execute Task Generation**:
    - Extract tech stack & project structure from `plan.md`
    - Extract user stories & priorities (P1, P2, P3...) from `spec.md`
    - Map tasks to stories, generate dependency graph, and identify parallel opportunities
    - Validate completeness: Each story must have independent test criteria and be incrementally deliverable
3. **Generate tasks.md**: Use `{CONFIG_ROOT}/specs/templates/tasks-template.md` as structural skeleton. If template is missing, generate directly using the "Phase Structure" defined below. Fill with:
    - Correct feature name from `plan.md`
    - Phased tasks (Setup → Foundational → Stories → Polish)
    - Dependency graph & parallel execution guide
    - Summary report & format validation confirmation
4. **Report**: Output final path to `tasks.md` and append a summary block containing: total tasks, per-story count, parallel opportunities, independent test criteria, suggested MVP scope.

## Task Generation Rules
**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.
**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Checklist Format (REQUIRED - ZERO EXCEPTIONS)
Every task MUST strictly follow this format:
`- [ ] [TaskID] [P?] [Story?] Description with exact file path`

**Format Components**:
1. **Checkbox**: ALWAYS start with `- [ ]`
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
    - Format: `[US1]`, `[US2]`, `[US3]`, etc. (maps to user stories from `spec.md`)
    - Setup/Foundational/Polish phases: NO story label
5. **Description**: Clear action ending with a concrete file path

**Examples**:
- ✅ `- [ ] T001 Create project structure per implementation plan`
- ✅ `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ `- [ ] Create User model` (missing ID and Story label)
- ❌ `T001 [US1] Create model` (missing checkbox)
- ❌ `- [ ] [US1] Create User model` (missing Task ID)
- ❌ `- [ ] T001 [US1] Create model` (missing file path)

### Output Format Extensions (MANDATORY)
- **Dependencies**: Render under `## 📊 Dependency Graph` using valid Mermaid `graph TD` syntax.
- **Parallel Execution**: Render under `## ⚡ Parallel Execution Guide` as a Markdown table with columns: `Phase | Tasks | Required Files | Execution Notes`.

### Task Organization & Phase Structure
1. **Phase 1: Setup** (Project initialization, tooling, shared config)
2. **Phase 2: Foundational** (Blocking prerequisites, MUST complete before user stories)
3. **Phase 3+: User Stories** (Ordered by P1, P2, P3... from `spec.md`)
    - Structure per story: Tests (if requested) → Models → Services → Endpoints/UI → Integration
    - Each phase = complete, independently testable increment
4. **Final Phase: Polish** (Cross-cutting concerns, docs, cleanup, refactoring)

## Final Self-Validation Step
Before outputting `tasks.md`, internally verify:
- ✅ Every task starts with `- [ ]`
- ✅ Every task has a unique sequential ID (T001, T002...)
- ✅ US-phase tasks contain `[USx]` label; Setup/Foundational/Polish do NOT
- ✅ Every task description ends with a concrete, valid file path
- ✅ Total count matches the summary report
  If any check fails, regenerate the invalid tasks before final output. Do not output draft or unvalidated versions.

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.
