import { describe, expect, test } from "bun:test"
import { readSource } from "../lib/source-reader"

const FLAG_TS_FLAGS = [
  "DEVECO_CONFIG",
  "DEVECO_CONFIG_CONTENT",
  "DEVECO_SERVER_PASSWORD",
  "DEVECO_SERVER_USERNAME",
  "DEVECO_WORKSPACE_ID",
  "DEVECO_DB",
  "DEVECO_EXPERIMENTAL_FILEWATCHER",
  "DEVECO_EXPERIMENTAL_DISABLE_FILEWATCHER",
  "DEVECO_EXPERIMENTAL_WORKSPACES",
  "DEVECO_DISABLE_PROJECT_CONFIG",
  "DEVECO_TUI_CONFIG",
  "DEVECO_CONFIG_DIR",
  "DEVECO_PURE",
  "DEVECO_AUTO_HEAP_SNAPSHOT",
  "DEVECO_GIT_BASH_PATH",
  "DEVECO_DISABLE_AUTOUPDATE",
  "DEVECO_ALWAYS_NOTIFY_UPDATE",
  "DEVECO_DISABLE_PRUNE",
  "DEVECO_DISABLE_TERMINAL_TITLE",
  "DEVECO_SHOW_TTFD",
  "DEVECO_PERMISSION",
  "DEVECO_DISABLE_DEFAULT_PLUGINS",
  "DEVECO_DISABLE_AUTOCOMPACT",
  "DEVECO_DISABLE_MODELS_FETCH",
  "DEVECO_DISABLE_MOUSE",
  "DEVECO_FAKE_VCS",
  "DEVECO_ENABLE_QUESTION_TOOL",
  "DEVECO_MODELS_URL",
  "DEVECO_MODELS_PATH",
  "DEVECO_PLUGIN_META_FILE",
  "DEVECO_CLIENT",
]

describe("deveco-flags regression guard", () => {
  const source = readSource("packages/core/src/flag/flag.ts")

  for (const flag of FLAG_TS_FLAGS) {
    test(`${flag} exists in flag.ts`, () => {
      expect(source).toContain(flag)
    })
  }

  test("no OPENCODE_ env var exports remain in flag.ts", () => {
    expect(source).not.toMatch(/OPENCODE_\w+:\s*process\.env/)
  })
})

describe("runtime-flags DEVECO_ prefix regression guard", () => {
  const source = readSource("packages/opencode/src/effect/runtime-flags.ts")

  test("runtime-flags uses DEVECO_ prefix for all flag references", () => {
    expect(source).toMatch(/DEVECO_/)
  })
})
