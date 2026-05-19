import { describe, expect, test } from "bun:test"
import { normalizeSectionTitle, matchesSection, matchesFieldLabel } from "@/tool/document-validation/section-normalizer"

describe("normalizeSectionTitle", () => {
  test("removes bold markers", () => {
    expect(normalizeSectionTitle("**Title**")).toBe("Title")
  })

  test("converts fullwidth spaces", () => {
    expect(normalizeSectionTitle("Title　with　spaces")).toBe("Title with spaces")
  })

  test("converts fullwidth colons", () => {
    expect(normalizeSectionTitle("Title：value")).toBe("Title:value")
  })

  test("collapses multiple spaces", () => {
    expect(normalizeSectionTitle("Title    with   spaces")).toBe("Title with spaces")
  })

  test("trims whitespace", () => {
    expect(normalizeSectionTitle("  Title  ")).toBe("Title")
  })
})

describe("matchesSection", () => {
  test("matches exact title", () => {
    expect(matchesSection("Requirements", ["Requirements"])).toBeTrue()
  })

  test("matches case-insensitively", () => {
    expect(matchesSection("requirements", ["Requirements"])).toBeTrue()
  })

  test("matches after normalization", () => {
    expect(matchesSection("**Requirements**", ["Requirements"])).toBeTrue()
  })

  test("returns false for non-match", () => {
    expect(matchesSection("Other", ["Requirements"])).toBeFalse()
  })
})

describe("matchesFieldLabel", () => {
  test("matches simple label", () => {
    expect(matchesFieldLabel("Status: Draft", ["Status"])).toBeTrue()
  })

  test("matches with dash prefix", () => {
    expect(matchesFieldLabel("- Status: Draft", ["Status"])).toBeTrue()
  })

  test("matches with star prefix", () => {
    expect(matchesFieldLabel("* Status: Draft", ["Status"])).toBeTrue()
  })

  test("matches with bold markers", () => {
    expect(matchesFieldLabel("**Status**: Draft", ["Status"])).toBeTrue()
  })

  test("does not match without colon", () => {
    expect(matchesFieldLabel("Status Draft", ["Status"])).toBeFalse()
  })
})
