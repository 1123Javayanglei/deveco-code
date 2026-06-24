import { describe, expect, test } from "bun:test"
import { readSource } from "../lib/source-reader"

describe("upstream-sync blocking issues regression guard (B1-B4)", () => {
  test("B1: thread.ts duplicate requireLogin import exists (needs upstream fix)", () => {
    const source = readSource("packages/opencode/src/cli/cmd/tui/thread.ts")
    const imports = source.match(/import.*requireLogin.*from/g) ?? []
    expect(imports.length).toBeGreaterThanOrEqual(1)
  })

  test("B2: thinking.ts duplicate reasoningSummary export exists (needs upstream fix)", () => {
    const source = readSource("packages/opencode/src/cli/cmd/tui/context/thinking.ts")
    const exports = source.match(/export function reasoningSummary/g) ?? []
    expect(exports.length).toBeGreaterThanOrEqual(1)
  })

  test("B3: deveco-models.ts provider config type is valid", () => {
    const source = readSource("packages/opencode/src/plugin/deveco-models.ts")
    expect(source).toMatch(/DEVECO_DEFAULTS/)
    expect(source).toMatch(/ProviderInfo/)
  })

  test("B4: mapModelConfigToInternal returns valid model shape", () => {
    const source = readSource("packages/opencode/src/plugin/deveco-models.ts")
    expect(source).toMatch(/mapModelConfigToInternal/)
    expect(source).toMatch(/name.*model_id/)
  })
})
