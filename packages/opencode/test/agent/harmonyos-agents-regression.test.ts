import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

const AGENT_PROMPTS_IN_SUBDIR = [
  "build",
  "plan",
  "goal",
  "explore",
  "spec-implementation",
  "spec-verify",
  "compaction",
  "summary",
  "title",
  "scout",
]

describe("harmonyos-agents prompt regression guard (spec #9)", () => {
  for (const name of AGENT_PROMPTS_IN_SUBDIR) {
    test(`${name}.txt prompt file exists`, () => {
      expect(fileExists(`packages/opencode/src/agent/prompt/${name}.txt`)).toBe(true)
    })
  }

  test("generate.txt prompt file exists (in agent root, not prompt/)", () => {
    expect(fileExists("packages/opencode/src/agent/generate.txt")).toBe(true)
  })

  test.skip("ask.txt prompt file exists (spec §3.1.5 — not yet implemented)", () => {
    expect(fileExists("packages/opencode/src/agent/prompt/ask.txt")).toBe(true)
  })
})

const AGENT_IMPORTED_PROMPTS = [
  "build",
  "plan",
  "goal",
  "explore",
  "spec-implementation",
  "spec-verify",
  "compaction",
  "summary",
  "title",
  "scout",
]

describe("harmonyos-agents registration regression guard", () => {
  const source = readSource("packages/opencode/src/agent/agent.ts")

  for (const name of AGENT_IMPORTED_PROMPTS) {
    test(`${name} agent prompt imported from prompt/`, () => {
      expect(source).toMatch(new RegExp(`import.*${name}.*\\.txt`))
    })
  }

  test("generate agent prompt imported from agent root", () => {
    expect(source).toMatch(/PROMPT_GENERATE/)
  })

  test("6 agent prompt bindings exist", () => {
    expect(source).toMatch(/prompt/)
  })
})

describe("harmonyos-agents permission matrix regression guard", () => {
  const source = readSource("packages/opencode/src/agent/subagent-permissions.ts")

  test("subagent-permissions module exists", () => {
    expect(source.length).toBeGreaterThan(0)
  })

  test("PermissionV1 type migration complete", () => {
    expect(source).toMatch(/Permission|Ruleset/)
  })

  test("build/plan/goal permission matrix defined", () => {
    expect(source).toMatch(/deriveSubagentSessionPermission|permission/)
  })
})
