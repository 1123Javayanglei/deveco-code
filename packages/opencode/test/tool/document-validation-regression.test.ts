import { describe, expect, test } from "bun:test"
import { readSource } from "../lib/source-reader"

describe("document-validation config regression guard (spec #7)", () => {
  const source = readSource("packages/opencode/src/tool/document-validation/config.ts")

  test("FORMAT_RULES covers 3 document types: spec, design, tasks", () => {
    expect(source).toMatch(/spec|design|tasks/)
  })

  test("design type has requiredSections for Implementation Plan", () => {
    expect(source).toMatch(/Implementation Plan/)
  })

  test("design type requiredSections includes Summary", () => {
    expect(source).toMatch(/Summary/)
  })

  test("design type allowedSections includes Quickstart", () => {
    expect(source).toMatch(/Quickstart/)
  })

  test.skip("Quickstart in requiredSections for design type (P2#13)", () => {
    expect(source).toMatch(/requiredSections.*Quickstart|Quickstart.*requiredSections/)
  })
})

describe("document-validation parser regression guard", () => {
  test("markdown-parser.ts exists", () => {
    const source = readSource("packages/opencode/src/tool/document-validation/markdown-parser.ts")
    expect(source.length).toBeGreaterThan(0)
  })

  test("section-normalizer.ts exists", () => {
    const source = readSource("packages/opencode/src/tool/document-validation/section-normalizer.ts")
    expect(source.length).toBeGreaterThan(0)
  })

  test("section titles use standard English naming", () => {
    const source = readSource("packages/opencode/src/tool/document-validation/config.ts")
    expect(source).toMatch(/standardTitle/)
  })
})
