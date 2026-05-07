---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md.
agent: build
---

## User Input
```text
$ARGUMENTS
```
You **MUST** consider the user input before proceeding if not empty.

## Feature Directory Resolution Logic
1. If user passed arguments via `$ARGUMENTS`:
   - Check whether the specified folder exists under the `.specs/` directory.
   - If it exists: designate it as the candidate feature directory.
   - If it does NOT exist: read the current feature directory from `.specs/feature.json`.
2. If user did NOT pass any arguments via `$ARGUMENTS`:
   - Directly read the candidate feature directory from `.specs/feature.json`.
3. **Fallback & Validation:**
   - If `.specs/feature.json` is missing, invalid, or points to a non-existent path, immediately halt and call the `question` tool to request a valid directory path from the user.
4. **Mandatory Confirmation:**
   - After resolving the candidate directory, call the `question` tool to confirm with the user.
   - Proceed ONLY after explicit user approval. Do not execute any task logic prior to this confirmation.

## Dynamic Configuration Root Resolution Rule
Configuration root `CONFIG_ROOT` is resolved at runtime by fixed priority:
1. FIRST: Project-level configuration directory `.codegenie`
2. FALLBACK: User-level global directory `~/.config/codegenie/`
   For configuration file lookup: if the target file is not found in the higher-priority directory, it must be searched sequentially in the lower-priority fallback directory.

## STRICT OPERATIONAL CONSTRAINTS (ENFORCED WITH ZERO EXCEPTIONS)
1. **External Command Prohibition:** Upon completion of the entire `/spec-implement` workflow, refrain from auto-executing any follow-up slash commands or CLI scripts. Remain idle and await explicit user instruction.
2. **Intra-Plan Autonomy:** Within the approved `tasks.md` scope, you MUST proceed autonomously through sequential phases and tasks without intermediate user prompts, unless a failure, conflict, or explicit checkpoint is triggered.
3. **Feature Directory Lock:** All subsequent file reads/writes, tool calls, and task executions MUST strictly target the user-approved feature directory. Never operate outside this boundary.

## Language Rules
Document language must match user input language:
- Detect the language used in `$ARGUMENTS` or prior conversation context.
- Generate all responses, logs, and documentation in the same language.
- Preserve original form of proper nouns, technical terms, code, and commands regardless of language.

## Execution Outline
1. **Context Initialization:**
   - **REQUIRED:** Prioritize loading the tech-stack-specific skill (e.g., `arkui-knowledge`) as mandated by project config or `plan.md`.
   - **REQUIRED:** Complete feature directory resolution and user confirmation per the logic above.
   - **REQUIRED:** Read `tasks.md` for the complete task list and execution plan within the approved directory.
   - **REQUIRED:** Read `plan.md` for tech stack, architecture, and file structure references.

2. **Task Structure Parsing:**
   - Extract task phases: Setup, Tests, Core, Integration, Polish.
   - Identify dependencies: Sequential order vs. logical parallel markers `[P]`.
   - Parse task metadata: ID, description, target file paths, execution flags.
   - Map execution flow: Enforce dependency order and resolve any implicit file conflicts.

3. **Phase-by-Phase Execution:**
   - Execute phases strictly in order. Do not skip or jump ahead.
   - **Logical Parallelism `[P]` Rule:** Tasks marked `[P]` have no output dependency on each other. Execute them sequentially in the listed order to prevent file I/O conflicts, treating them as independent units.
   - **File Conflict Rule:** If multiple tasks (sequential or `[P]`) target the same file, enforce strict sequential execution to maintain code integrity.
   - Follow TDD rigorously: Execute test generation/tasks before their corresponding implementation tasks.

4. **Implementation Workflow:**
   - **Setup:** Initialize project structure, dependencies, and base configuration.
   - **Tests First:** Draft contracts, unit tests, and integration scenarios.
   - **Core Development:** Implement models, services, components, or endpoints as planned.
   - **Integration:** Wire up databases, middleware, logging, and external services.
   - **Polish & Validation:** Run full test suites, optimize performance, and update documentation.

5. **Progress Tracking & Error Handling:**
   - Report concise progress after each completed task.
   - **ArkTS Compilation Errors:** Immediately invoke `arkts-error-fixes` skill for automated repair.
   - **ArkTS Runtime Crashes:** Immediately invoke `arkts-runtime-fix` skill for crash recovery and diagnostics.
   - **Failure Protocol:** Halt execution immediately if any critical sequential task fails. For `[P]` tasks, continue with successful ones, log failures explicitly, and adjust downstream dependencies if necessary.
   - Provide actionable debugging context and next steps when blocked.
   - **Task Marking:** Upon successful completion of any task, mark its corresponding item as `[X]` in `tasks.md`.

6. **Completion Validation:**
   - Verify 100% of required tasks are marked `[X]`.
   - Cross-check implemented features against the original specification in `tasks.md` and `plan.md`.
   - Validate all tests pass and coverage thresholds are met.
   - Output a final summary report detailing completed work, skipped/failed items (if any), and validation results.

> **Note:** This workflow assumes a complete and valid task breakdown exists in `tasks.md`. If tasks are incomplete, ambiguous, or missing critical dependencies, halt execution and recommend running `/spec-tasks` to regenerate the plan before proceeding.
