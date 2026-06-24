import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("arkts-check-tool regression guard", () => {
  const source = readSource("packages/opencode/src/tool/arkts_check.ts")

  test("ArktsCheckTool export exists", () => {
    expect(source).toMatch(/ArktsCheckTool/)
  })

  test("tool definition uses Tool.define", () => {
    expect(source).toMatch(/Tool\.define/)
  })

  test("ensureScriptOnDisk for embedded script extraction", () => {
    expect(source).toMatch(/ensureScriptOnDisk/)
  })

  test("DevEco Home dependency via findDevEcoHome", () => {
    expect(source).toMatch(/findDevEcoHome/)
  })

  test("nodePath for DevEco node binary", () => {
    expect(source).toMatch(/nodePath/)
  })

  test("JSON diagnostic output parsing", () => {
    expect(source).toMatch(/JSON\.parse|errors|warnings/)
  })
})

describe("arkts-check embedded script regression guard", () => {
  test("arkts-check.cjs script file exists", () => {
    expect(fileExists("packages/opencode/src/tool/arkts-check.cjs")).toBe(true)
  })

  test("arkts-check.txt prompt template exists", () => {
    expect(fileExists("packages/opencode/src/tool/arkts-check.txt")).toBe(true)
  })
})
