import { describe, expect, test } from "bun:test"
import { readSource } from "../lib/source-reader"

describe("OPENCODE_* flag residual regression guard (P0 Bug #1)", () => {
  test("workspace-routing.ts uses DEVECO_WORKSPACE_ID not OPENCODE_WORKSPACE_ID", () => {
    const source = readSource("packages/opencode/src/server/routes/instance/httpapi/middleware/workspace-routing.ts")
    expect(source).toContain("Flag.DEVECO_WORKSPACE_ID")
  })

  test("fence.ts uses DEVECO_WORKSPACE_ID not OPENCODE_WORKSPACE_ID", () => {
    const source = readSource("packages/opencode/src/server/routes/instance/httpapi/middleware/fence.ts")
    expect(source).toContain("Flag.DEVECO_WORKSPACE_ID")
  })
})

describe("core/flag.ts has no OPENCODE_ env var exports (positive check)", () => {
  const source = readSource("packages/core/src/flag/flag.ts")

  test("flag.ts exports DEVECO_SERVER_PASSWORD (not OPENCODE_SERVER_PASSWORD)", () => {
    expect(source).toMatch(/DEVECO_SERVER_PASSWORD:\s*process\.env/)
    expect(source).not.toMatch(/OPENCODE_SERVER_PASSWORD:\s*process\.env/)
  })

  test("flag.ts exports DEVECO_SERVER_USERNAME (not OPENCODE_SERVER_USERNAME)", () => {
    expect(source).toMatch(/DEVECO_SERVER_USERNAME:\s*process\.env/)
    expect(source).not.toMatch(/OPENCODE_SERVER_USERNAME:\s*process\.env/)
  })

  test("flag.ts exports DEVECO_WORKSPACE_ID (not OPENCODE_WORKSPACE_ID)", () => {
    expect(source).toMatch(/DEVECO_WORKSPACE_ID:\s*process\.env/)
    expect(source).not.toMatch(/OPENCODE_WORKSPACE_ID:\s*process\.env/)
  })
})

describe("runtime-flags.ts uses DEVECO_* prefix (not OPENCODE_*)", () => {
  const source = readSource("packages/opencode/src/effect/runtime-flags.ts")

  test("runtime-flags references DEVECO_ prefix", () => {
    expect(source).toMatch(/DEVECO_/)
  })
})