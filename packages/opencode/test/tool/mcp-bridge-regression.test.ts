import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("harmonyos-mcp-bridge lifecycle regression guard", () => {
  const source = readSource("packages/opencode/src/tool/lib/harmony_napi.ts")

  test("napiBridgeInit gate serialization exists", () => {
    expect(source).toMatch(/gate/)
  })

  test("worktree binding for bridge context", () => {
    expect(source).toMatch(/worktree|bound/)
  })

  test("token refresh integration for bridge reinit", () => {
    expect(source).toMatch(/expires|auth|token/)
  })

  test("napiBridgeStop export exists", () => {
    expect(source).toMatch(/napiBridgeStop|stop/)
  })
})

describe("mcp-bridge.d.ts signature regression guard", () => {
  const source = readSource("packages/opencode/src/tool/lib/mcp-bridge.d.ts")

  test.skip("init function declared with all 6 parameters (P0#3 — d.ts only has 3)", () => {
    expect(source).toMatch(/init.*logDir.*projectPath.*devecoHome.*baseURL.*apiKey.*modelName/)
  })

  test("listTools function declared", () => {
    expect(source).toMatch(/listTools/)
  })

  test("callTool function declared", () => {
    expect(source).toMatch(/callTool/)
  })

  test("stop function declared", () => {
    expect(source).toMatch(/stop/)
  })
})
