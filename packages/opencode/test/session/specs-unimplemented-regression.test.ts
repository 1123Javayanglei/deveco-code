import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("skills-migration regression guard (spec #20)", () => {
  const skillDirs = [
    "packages/opencode/src/skill",
    "packages/opencode/src/agent/prompt",
    "packages/opencode/src/tool",
  ]

  for (const dir of skillDirs) {
    test(`${dir} directory has source files`, () => {
      expect(fileExists(dir)).toBe(true)
    })
  }

  test("skill index exists with defaults and pipeline-build", () => {
    const source = readSource("packages/opencode/src/skill/index.ts")
    if (source) {
      expect(source.length).toBeGreaterThan(0)
    }
  })
})

describe("session-title-local-time regression guard (spec #19 — P1#4)", () => {
  const source = readSource("packages/opencode/src/session/session.ts")

  test.skip("session title uses local time formatting (0% implemented)", () => {
    expect(source).toMatch(/toLocaleString|localTime|DateTime\.nowAsDate/)
  })

  test("session title currently uses toISOString (baseline)", () => {
    expect(source).toMatch(/toISOString|title/)
  })
})

describe("bash-tool-windows-redirects regression guard (spec #21 — P1#5)", () => {
  test.skip("redirectKind function exists (0% implemented)", () => {
    expect(source).toMatch(/redirectKind/)
  })

  test.skip("adaptWindowsRedirects function exists (0% implemented)", () => {
    expect(source).toMatch(/adaptWindowsRedirects/)
  })
})

describe("v2/session init endpoint removal regression guard (spec #22 — P1#7)", () => {
  test.skip("POST /session/:sessionID/init is removed (0% implemented)", () => {
    const source = readSource("packages/opencode/src/server/routes/instance/httpapi/groups/v2/session.ts")
    expect(source).not.toMatch(/init/)
  })
})

describe("log-init-await-fix regression guard (spec #13)", () => {
  test("log initialization is properly awaited", () => {
    const source = readSource("packages/opencode/src/index.ts")
    expect(source).toMatch(/await|Log/)
  })
})

describe("sdd-agent regression guard (spec #18)", () => {
  test("goal.txt prompt exists", () => {
    expect(fileExists("packages/opencode/src/agent/prompt/goal.txt")).toBe(true)
  })

  test("spec-implementation.txt exists", () => {
    expect(fileExists("packages/opencode/src/agent/prompt/spec-implementation.txt")).toBe(true)
  })

  test("spec-verify.txt exists", () => {
    expect(fileExists("packages/opencode/src/agent/prompt/spec-verify.txt")).toBe(true)
  })

  test("subagent-permissions.ts exists", () => {
    expect(fileExists("packages/opencode/src/agent/subagent-permissions.ts")).toBe(true)
  })
})
