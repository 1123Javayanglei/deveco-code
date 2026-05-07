---
description: Execute optional build, start, and verify_ui workflow.
agent: build
---

## User Input
```text
$ARGUMENTS
```
Process input if non-empty.

## Global Constraints (Zero Exceptions)
1. **Language**: Match user input language exactly. Preserve technical terms, code, and commands.
2. **Strict Order**: Phase 0 → Phase 1 → Phase 2 (`build` → `start` → `plan/confirm` → `verify`).
3. **Optional Steps**: `build`, `start`, `verify_ui` are optional. Skip if preconditions fail; log reasons. Do not interrupt workflow.
4. **Environment Vars**: Never use defaults or autoconfigure. Skip step if required vars are missing.
5. **Device Check**: **Strictly forbid `hdc` command**. Use only platform-native device status APIs.
6. **Path Binding**: Always use `Confirmed_Feature_Dir` for all subsequent file/spec checks. Ignore raw `$ARGUMENTS` after Phase 0.
7. **Post-verify**: Immediately halt after `verify_ui`. No auto-execution of downstream commands. Await explicit user instruction.
8. **Dual Confirmation**: Directory (Phase 0) + Test Plan (Phase 2) both require explicit `question` tool approval. Default approval is forbidden.

## Execution Phases

### Phase 0: Feature Directory Selection & Confirmation (Mandatory First Step)
1. **Determine Candidate**:
    - If `$ARGUMENTS` provided & `.specs/{ARGUMENTS}` exists → Use it.
    - Otherwise → Read default from `.specs/feature.json`.
2. **User Approval**: Call `question` tool to confirm candidate. **Pause workflow** until explicit consent. Lock path as `Confirmed_Feature_Dir`.

### Phase 1: Precondition Validation
Validate in order using `Confirmed_Feature_Dir`. Skip on failure (except critical `verify_ui` file check).
- `build_project`: Valid if `DEVECO_HOME` exists.
- `start_app`: Valid if device/emulator online (platform-native check only).
- `verify_ui` (Critical):
    - Requires `UI_VERIFY_BASE_URL`, `UI_VERIFY_MODEL_NAME`, `UI_VERIFY_API_KEY`.
    - **Mandatory File Check**: `.specs/{Confirmed_Feature_Dir}/` and `spec.md` must exist. If missing → **Terminate workflow with error**.
- Output execution schedule marking each step as `executable` or `skipped`.

### Phase 2: Sequential Execution
1. **`build_project`**: Execute if valid; else skip & log.
2. **`start_app`**: Execute if valid; else skip & log.
3. **`verify_ui` Prep & Approval** (Triggered only if eligible):
    - Read `.specs/{Confirmed_Feature_Dir}/spec.md`.
    - Generate comprehensive UI test plan covering business logic, page layout, and interaction rules.
    - Call `question` tool to present plan. **Pause workflow**.
    - *Approved* → Proceed to step 4.
    - *Rejected* → Log reason, skip `verify_ui`, terminate UI workflow.
4. **`verify_ui`**: Execute only upon plan approval + valid envs.

### Phase 3: Termination & Reporting
- **Stop**: Halt completely after Phase 2. Await user instruction.
- **Report**: Output summary covering: directory confirmation status, step-by-step results (executed/skipped/failed + reasons), test plan overview, approval result, and verification outputs/errors.
