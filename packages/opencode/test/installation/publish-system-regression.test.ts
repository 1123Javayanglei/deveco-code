import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("publish-system regression guard", () => {
  const source = readSource("packages/opencode/src/installation/index.ts")

  test("installation check exists", () => {
    expect(source.length).toBeGreaterThan(0)
  })

  test("version check integration", () => {
    expect(source).toMatch(/InstallationVersion|InstallationChannel/)
  })

  test("channel-based UA string", () => {
    expect(source).toMatch(/InstallationChannel/)
  })
})

describe("postinstall script regression guard", () => {
  test("postinstall script exists", () => {
    expect(fileExists("packages/opencode/script/postinstall.ts")).toBe(true)
  })
})

describe("build script regression guard", () => {
  test("build.ts exists", () => {
    expect(fileExists("packages/opencode/script/build.ts")).toBe(true)
  })

  test.skip("build.ts includes vendor cache copying for ripgrep (P1#8)", () => {
    const source = readSource("packages/opencode/script/build.ts")
    expect(source).toMatch(/ripgrep|vendor/)
  })

  test.skip("build.ts includes mcp-bridge vendor copying (P1#8)", () => {
    const source = readSource("packages/opencode/script/build.ts")
    expect(source).toMatch(/mcp-bridge|napi/)
  })
})
