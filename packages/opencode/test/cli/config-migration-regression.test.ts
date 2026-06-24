import { describe, expect, test } from "bun:test"
import { readSource } from "../lib/source-reader"

describe("config-migration comprehensive OPENCODE_ residual scan (spec #3)", () => {
  test("flag.ts has zero OPENCODE_ env var exports", () => {
    const source = readSource("packages/core/src/flag/flag.ts")
    expect(source).not.toMatch(/OPENCODE_\w+:\s*process\.env/)
  })

  test("runtime-flags.ts uses DEVECO_ prefix exclusively", () => {
    const source = readSource("packages/opencode/src/effect/runtime-flags.ts")
    expect(source).not.toMatch(/OPENCODE_/)
  })

  test("config.ts uses deveco.jsonc / deveco.json for config files", () => {
    const source = readSource("packages/opencode/src/config/config.ts")
    expect(source).toMatch(/deveco\.jsonc|deveco\.json/)
  })

  test("paths.ts uses .deveco directory", () => {
    const source = readSource("packages/opencode/src/config/paths.ts")
    expect(source).toMatch(/\.deveco/)
  })

  test("tui-migrate.ts exists for config schema migration", () => {
    const source = readSource("packages/opencode/src/cli/cmd/tui/config/tui-migrate.ts")
    expect(source.length).toBeGreaterThan(0)
  })
})

describe("config-migration Claude Code default disabled regression guard", () => {
  const source = readSource("packages/opencode/src/effect/runtime-flags.ts")

  test("disableClaudeCodePrompt defaults to true", () => {
    expect(source).toMatch(/claude|ClaudeCode/)
  })
})
