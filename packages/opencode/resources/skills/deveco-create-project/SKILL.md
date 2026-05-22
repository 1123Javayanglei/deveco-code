---
name: deveco-create-project
description: MUST load this skill before creating, initializing, or scaffolding an ArkTS project, including "0-1", "from scratch", "new ArkTS project", and empty directory initialization tasks. Use the skill's private TypeScript script to create ArkTS projects reliably.
---

# deveco-create-project

Use the skill's private script to create an ArkTS project, instead of relying on the model to copy template files one by one.

## Required Parameters

Confirm the following parameters before execution. Ask the user if any required value is missing:

| Parameter | Required | Default | Example |
|------|---------|--------|------|
| `projectPath` | Required | — | `/Users/yellow/Desktop/projects` |
| `appName` | Required | — | `HelloWorld` |
| `bundleName` | Auto-derived, no need to ask | `com.example.{appName lowercase}` | `com.example.helloworld` |
| `apiLevel` | Optional | Auto-detect from DevEco SDK metadata, fallback to `22` | `21` |

### appName format rules (MUST enforce before invoking the script)

`appName` is used as the on-disk directory name AND as the application label/bundle segment. The script will REJECT names that do not match these rules:

- Must start with an English letter (`A-Z` or `a-z`).
- Must contain only `[A-Za-z0-9_]`.
- Length 1–128.
- **Chinese / Japanese / Korean / emoji / whitespace / hyphens / dots are not allowed.**

When the user provides a non-ASCII or otherwise invalid name (e.g. "购物车", "购物 Cart", "shopping-cart"), you MUST:

1. Propose a sensible English equivalent in UpperCamelCase. Translate by meaning, not by transliteration when meaning is clear:
   - "购物车" → `ShoppingCart`
   - "天气预报" → `WeatherForecast`
   - "记账本" → `Ledger` or `AccountBook`
   - "天气小工具" → `WeatherWidget`
   - Fall back to pinyin only when meaning is unclear: "小明的玩具" → `XiaomingToys`.
2. Call `AskUserQuestion` (header: `项目英文名` / `Project English name`) showing the proposed name as the first option, plus a "let me type my own" option. Quote the original Chinese name in the question so the user knows what is being renamed.
3. Only invoke the script with the user-approved English `appName`. Do NOT silently translate and proceed.

If you skip this normalization step and pass a Chinese `appName` directly to the script, it will exit with code `4` and a JSON payload:

```json
{
  "code": "APP_NAME_INVALID",
  "rawAppName": "购物车",
  "reasons": ["contains non-ASCII characters (e.g. Chinese)", "..."],
  "suggestion": null,
  "hint": "..."
}
```

When you see this payload, fall back to the proposal-and-confirm flow above. Do NOT retry with the same invalid name.

`bundleName` is auto-derived as `com.example.{appName.toLowerCase()}`. If the user provides a custom `--bundle-name` it must be reverse-DNS with each dot-segment starting with a lowercase letter and containing only `[a-z0-9_]`; otherwise the script exits with code `5` and a `BUNDLE_NAME_INVALID` payload.

If the user explicitly specifies an SDK/API level, pass it through directly.
If the user does not specify one, do not let the model invent a version. Let the script detect it using this fixed priority:

1. `DEVECO_HOME/sdk/default/sdk-pkg.json`
2. `DEVECO_HOME/sdk/default/openharmony/*/oh-uni-package.json`
3. fallback to `22`

### Optional: Brief Requirement Checklist for Complex App Requests

If the current session is already executing an approved Plan Mode plan or an existing plan file is referenced, do not create another plan, do not call `plan_enter` or `plan_write`, and do not ask for plan approval again. Treat the existing plan as the source of truth.

If there is no existing approved plan and the user asks to create a new project with a complex app requirement, make a brief requirement checklist before copying or editing files.

The checklist must list:
- pages to implement
- the first screen / entry page
- navigation between pages
- key feature points for each page
- verification points for pages and navigation

Keep this checklist concise and continue automatically unless required project parameters are missing or the requirement is contradictory.
Do not expand this skill into ArkUI design guidance; load `arkui-knowledge` before implementing UI code.

## Execution Steps

> `copy-template.mjs` reads the sibling skill directory `deveco-create-project/application/` as the template source by default.
> This script runs with Node.js. If `node` is not available in the environment, stop immediately and explain that to the user.
> Default skills are extracted to a local user skill directory before execution. Keep all scripts in this skill self-contained and do not import repo-only source files.

### Step 0: Pre-check the Target Path (Required)

Before invoking the create script, you MUST verify whether the target directory already exists at `{projectPath}/{appName}`. Do not blindly run the script and let it fail; surface the conflict proactively.

This step applies **unconditionally** to every creation request, including:

- Fresh sessions where the project was created in a previous session and already exists on disk.
- Requests that say "重新创建" / "再建一个" / "rebuild" / "重新生成" against a path that already contains a project.
- Cases where you already know from earlier tool output that the directory exists.

You MUST NOT skip Step 0 by assuming the existing directory belongs to the user's current request, and you MUST NOT route the request to `switch_cwd` + `build_project` + `start_app` instead of creation just because a project already exists at the target.

How to perform the check (pick whichever is available; use the dedicated filesystem tool first):

- Prefer `glob` or `read` against `{projectPath}/{appName}/build-profile.json5` to determine whether a project lives there.
- If those tools cannot reach the path (e.g. it is outside the workspace), fall back to a single defensive run of the script with the default `--on-conflict error` flag and inspect its `PROJECT_EXISTS` payload — but only if you cannot detect via filesystem tools first.

Detection rules:

- If `{projectPath}/{appName}` does not exist, or exists and is an empty directory, continue directly to Step 1 with the default `--on-conflict error` behavior (no extra flag needed).
- If `{projectPath}/{appName}` exists as a non-empty directory or as a file, treat it as a conflict and STOP. Do not proceed to Step 1 until the user has chosen an option.

**You MUST NOT skip this step, and you MUST NOT silently retry the script with `--on-conflict overwrite` after a conflict was emitted.** Doing so will be rejected by the script (see "Two-flag overwrite guard" below), but the rejection only fires if the script is invoked at all — you are still required to ask the user first using `AskUserQuestion`.

When a conflict is detected, you MUST call `AskUserQuestion` (in the user's language; use Simplified Chinese if the user's request is in Chinese) with header `项目目录已存在` and exactly three options:

1. **Overwrite (覆盖)** — Delete the existing directory and recreate the project. Destructive. Only proceed after explicit confirmation. Mark this option as destructive in the question.
2. **Rename (重命名)** — Ask the user for a new `appName` (e.g. `HelloWorld2`) and create the project under the new name. The `bundleName` will be re-derived from the new name unless `--bundle-name` was explicitly set by the user.
3. **Cancel (取消)** — Abort the creation. Do not run the script. Report back that the creation was cancelled.

Always quote the exact conflicting absolute path in the question so the user knows which directory will be affected.

### Step 1: Run the Private Script

After Step 0 produced a decision (no conflict / overwrite / rename), run the following with Shell:

```bash
node "{SKILL_DIR}/scripts/copy-template.mjs" --project-path "{projectPath}" --app-name "{appName}" --bundle-name "{bundleName}" --api-level "{apiLevel}"
```

If `apiLevel` is not explicitly provided by the user, omit `--api-level` and let the script detect it from DevEco metadata.

Execution requirements:

- Do not manually copy template files one by one.
- Let the script handle recursive copying, binary asset copying, placeholder replacement, and basic validation.
- The script is responsible for SDK detection. Do not decide the SDK version in the prompt by guesswork.
- If the script exits with a non-zero code, report the error to the user and stop.

#### Conflict handling flags

Step 0 already pre-checks the path, but the script will still defend itself if a race or oversight slips through. Default behavior is to refuse overwrite and exit with code `2`.

Re-run flags after the user has chosen an option in Step 0:

- Overwrite: append BOTH `--on-conflict overwrite` AND `--confirm-overwrite-target "<absoluteTargetRoot>"`. The two-flag overwrite guard (see below) requires the absolute path of the directory the user agreed to overwrite — typically `{projectPath}/{appName}` as an absolute path.
- Rename: append `--on-conflict rename:<NewName>`; the script also uses `<NewName>` as the new `appName`.
- Cancel: do NOT run the script at all.

#### Two-flag overwrite guard

The script will REJECT `--on-conflict overwrite` unless it is paired with `--confirm-overwrite-target "<absoluteTargetRoot>"` whose resolved path equals the conflicting target exactly. When the guard fires, the script exits with code `3` and emits this JSON payload on stderr:

```json
{
  "code": "OVERWRITE_CONFIRMATION_REQUIRED",
  "message": "--on-conflict overwrite must be accompanied by --confirm-overwrite-target \"...\" matching the exact target path. ...",
  "targetRoot": "...",
  "hint": "..."
}
```

If you see this payload, STOP. It means you attempted to overwrite without the per-path confirmation token. Go back to Step 0, call `AskUserQuestion` for THIS exact `targetRoot`, and only after the user picks "Overwrite" should you re-run with both flags.

If the script returns this JSON payload on stderr (e.g. you skipped Step 0):

```json
{
  "code": "PROJECT_EXISTS",
  "message": "A project already exists at \"...\".",
  "targetRoot": "...",
  "isProject": true,
  "isEmpty": false,
  "isFile": false,
  "options": [
    { "value": "overwrite", "label": "覆盖现有项目", "destructive": true },
    { "value": "rename", "label": "使用新名称重新创建", "destructive": false },
    { "value": "cancel", "label": "取消创建", "destructive": false }
  ],
  "hint": "..."
}
```

then fall back to the same three-option dialog described in Step 0. Do NOT silently retry, do NOT delete the directory yourself, and do NOT pick a new name without asking.

Example re-run after user confirms overwrite (note both flags are mandatory):

```bash
node "{SKILL_DIR}/scripts/copy-template.mjs" --project-path "{projectPath}" --app-name "{appName}" --on-conflict overwrite --confirm-overwrite-target "{projectPath}/{appName}"
```

Example re-run after user picks a new name:

```bash
node "{SKILL_DIR}/scripts/copy-template.mjs" --project-path "{projectPath}" --app-name "{NewName}" --on-conflict rename:{NewName}
```

### Step 2: Verify the Result

At minimum, verify that the following file exists:

- `{projectPath}/{appName}/build-profile.json5`

If the file is missing, treat the creation as failed and do not proceed to later compile or page-generation steps.

### Step 3: Switch Session Project Context (Required)

After project creation succeeds, call `switch_cwd` and set the target path to the generated project root (`{projectPath}/{appName}`).

Reason:

- `build_project` and `start_app` only work correctly when the current session context directory is the actual project root.
- This skill creates a full project under the current path; without switching context to that generated path, subsequent build/run actions may fail or target the wrong directory.

If `switch_cwd` fails, report the context switch failure and stop. Do not continue to feature implementation, `build_project`, or `start_app`.

### Step 4: Continue Feature Work in the Generated Project

If the user's request includes app behavior, UI, pages, or business requirements in addition to project creation, continue only after `switch_cwd` succeeds.

Before implementing the feature:

- Read `entry/src/main/resources/base/profile/main_pages.json` to identify the launch page list.
- Read the launch page file, usually `entry/src/main/ets/pages/Index.ets`.
- Modify the actual launch page or its navigation path so the requested feature is reachable from the first screen.
- Do not finish by only creating a new named page/component unless the launch page routes to it.
- After changes, run `build_project`; if it succeeds, run `start_app`.
- If a device is available and visual behavior matters, use `verify_ui` or screenshots to check that the app no longer shows the untouched template `Hello World` screen.

### Step 5: Report Back to the User

Report after all requested creation, implementation, build, run, and verification work is complete, or immediately when a blocking failure stops the flow.

Output:

- The absolute project path
- App name / bundle name / API Level
- `source` of the selected API level: `user_input` / `sdk_pkg` / `oh_uni_package` / `fallback`
- Whether the template integrity check passed
- Whether `switch_cwd` succeeded
- Build/run/verification status when feature work was requested
