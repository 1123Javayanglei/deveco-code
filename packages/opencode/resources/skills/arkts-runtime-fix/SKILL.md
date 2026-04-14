---
name: arkts-runtime-fix
description: Triage and fix ArkTS or JavaScript runtime crashes. MUST load this skill immediately when the user provides jscrash logs, uncaught exceptions, or runtime stack traces.
---

# Harmony JSCrash Fixes

Use this skill to diagnose and fix ArkTS or JavaScript runtime crashes with minimal edits.

This skill uses private Bun scripts under `skills/arkts-runtime-fix/scripts/`. The old global `jscrash_report` tool is gone.

If `bun` is unavailable, stop and explain that the private scripts cannot run.

## When To Load

Load this skill when the issue looks like one of these:

- Runtime logs show `TypeError`, `ReferenceError`, `RangeError`, `SyntaxError`, `BusinessError`, or similar exceptions.
- The app exits, flashes back, or white-screens during launch or after a tap.
- The user provides a `jscrash` log, stack trace, or a temporary log file with `@file`.
- Build succeeds, but runtime behavior fails immediately.

## Core Approach

Prefer a concrete crash anchor before broad code exploration. A good anchor can come from:

- a provided crash log
- a stack trace
- a clear page or module named by the user
- a recent device-side faultlog or hilog when no better evidence is available

Avoid broad `Read` / `Glob` / `Explore` across the whole project until you have at least one concrete anchor such as:

- `error_type`
- `error_message`
- `suspected_file`
- `top_stack`
- or a clearly named crash entry point from the user

Do not over-collect logs. If the user already gave enough crash evidence, parse that evidence first and move into focused reading and minimal fixes.

## Private Script Contract

Run the private scripts through Shell like this:

```bash
bun "{SKILL_DIR}/scripts/<script>.ts" ...
```

`{SKILL_DIR}` is the absolute path of this skill directory at runtime.

Scripts print stable `key: value` text to stdout. A non-zero exit code means the current step could not continue and the agent should report the reason instead of guessing.

## Preferred Flows

### Case A: The user already provided raw crash text

```bash
bun "{SKILL_DIR}/scripts/parse-jscrash-log.ts" --log-text "{crashLog}" --bundle-name "{bundleName}" --include-text
```

### Case B: The user provided `@file` or a local log path

```bash
bun "{SKILL_DIR}/scripts/parse-jscrash-log.ts" --log-file "{logFilePath}" --bundle-name "{bundleName}" --include-text
```

### Case C: The user only described symptoms and did not provide logs

Log collection is optional here. Use it when you still need a concrete runtime anchor.

Prefer recent faultlogger evidence first:

```bash
bun "{SKILL_DIR}/scripts/probe-faultlogger.ts" --bundle-name "{bundleName}" --device-id "{deviceId}" --max-age-minutes "30" --limit "10"
```

If `status: found`, fetch and parse the latest faultlog:

```bash
bun "{SKILL_DIR}/scripts/fetch-faultlog.ts" --faultlog-name "{latestFaultlog}" --device-id "{deviceId}" --output-dir "{tempDir}"
bun "{SKILL_DIR}/scripts/parse-jscrash-log.ts" --log-file "{localFaultlogPath}" --bundle-name "{bundleName}" --source file --include-text
```

If faultlogger is unavailable, empty, or still not enough, you may fall back to hilog:

```bash
bun "{SKILL_DIR}/scripts/collect-hilog.ts" --device-id "{deviceId}" --lines "4000" --output-dir "{tempDir}"
bun "{SKILL_DIR}/scripts/parse-jscrash-log.ts" --log-file "{hilogPathFromCollect}" --bundle-name "{bundleName}" --source hilog --include-text
```

## Output Contract

The leading `key: value` block from `parse-jscrash-log.ts` includes:

- `status`: `detected` | `no_crash_signature` | `parse_failed`
- `source`: `file` | `text` | `hilog` and similar sources
- `error_type`
- `error_message`
- `suspected_file`
- `top_stack`: `|`-joined frames
- `keywords`: comma-separated
- `next_action`

`--include-text` appends a human-readable summary after the structured block.

If `status: no_crash_signature`, explain that the evidence is weak and ask for a better log, clearer repro, or an additional runtime clue before broad code reading.

## Common Crash Signatures

| Signature | Typical Cause | First Fix Direction |
|---|---|---|
| `TypeError` on property access | Null or undefined state during render or lifecycle | Guard null state, initialize earlier, or move logic to a safer lifecycle |
| `ReferenceError` | Wrong scope, stale import, missing symbol | Fix symbol ownership, import path, or callback capture |
| `RangeError` | Invalid index, recursion loop, oversized access | Add bounds checks, break loops, clamp indexes |
| `BusinessError` / `ParameterError` | Framework API preconditions not met | Validate args, permissions, or call timing |

## Interpretation Rules

- Prefer application frames over framework noise.
- Treat the first concrete `.ets`, `.ts`, or `.js` path as the starting point, not the final truth.
- If the user gave repro steps, trust them over a simplistic stack-only guess.
- If the stack points to a non-entry page, assume an interaction-triggered path unless evidence proves a cold-start crash.
- Do not refactor broadly. Fix the crash path first.

## Conversational Shape

1. Say what evidence you already have.
2. If logs are missing, say whether you are optionally checking faultlogger or hilog for a better anchor.
3. Once you have an anchor, switch into focused code reading and minimal fixing.

## Constraints

- Never claim a crash fix from prompt reasoning alone.
- Never replace a root-cause fix with retries, arbitrary delays, or broad defensive rewrites.
- If unfamiliar `@ohos.*` or `@kit.*` APIs are involved, check their constraints before editing.
- This skill does not decide the final compile / run / verification order; the primary agent owns that.
