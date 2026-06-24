import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("feedback-privacy-commands regression guard", () => {
  const appSource = readSource("packages/opencode/src/cli/cmd/tui/app.tsx")

  test("/feedback command registered", () => {
    expect(appSource).toMatch(/feedback/)
  })

  test("/privacy command registered", () => {
    expect(appSource).toMatch(/privacy/)
  })

  test("feedback URL points to Huawei developer feedback page", () => {
    expect(appSource).toMatch(/DEVECO_FEEDBACK_URL|feedback.*huawei/)
  })
})

describe("dialog-privacy component regression guard", () => {
  test("dialog-privacy.tsx exists", () => {
    expect(fileExists("packages/opencode/src/cli/cmd/tui/component/dialog-privacy.tsx")).toBe(true)
  })

  const source = readSource("packages/opencode/src/cli/cmd/tui/component/dialog-privacy.tsx")
  test("analytics toggle exists", () => {
    expect(source).toMatch(/analytics_enabled|analytics/)
  })
})
