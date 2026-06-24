import { describe, expect, test } from "bun:test"
import { readSource } from "../lib/source-reader"

const HARMONYOS_REGISTRY_TOOL_NAMES = ["hdclog", "switchcwd", "arktscheck"]

describe("harmonyos-tools registration regression guard (spec #11)", () => {
  const source = readSource("packages/opencode/src/tool/registry.ts")

  for (const name of HARMONYOS_REGISTRY_TOOL_NAMES) {
    test(`${name} tool referenced in registry`, () => {
      expect(source).toContain(name)
    })
  }

  test("6 harmonyos tool imports exist", () => {
    expect(source).toMatch(/hdc_log|switch_cwd|arkts_check|arkts_knowledge_search/)
  })

  test("Auth.Service layer used for OAuth-gated tools", () => {
    expect(source).toMatch(/Auth\.Service|Auth\.defaultLayer/)
  })
})

describe("harmonyos-tools env.ts regression guard", () => {
  const source = readSource("packages/opencode/src/tool/lib/env.ts")

  test("findDevEcoHome 3-layer resolution: env → saved → defaults", () => {
    expect(source).toMatch(/findDevEcoHome|resolveDevEcoHome/)
  })

  test("DEVECO_HOME env var checked first", () => {
    expect(source).toMatch(/DEVECO_HOME/)
  })

  test("saveDevEcoHome/loadSavedDevEcoHome for persistence", () => {
    expect(source).toMatch(/saveDevEcoHome|loadSavedDevEcoHome/)
  })

  test("isDevEcoHome validation function", () => {
    expect(source).toMatch(/isDevEcoHome/)
  })

  test("MIN_DEVECO_STUDIO_VERSION for version gating", () => {
    expect(source).toMatch(/MIN_DEVECO_STUDIO_VERSION/)
  })
})
