import { describe, expect, test } from "bun:test"
import { readSource } from "../lib/source-reader"

describe("login-privacy-agreement regression guard (spec #14)", () => {
  const source = readSource("packages/opencode/src/cli/deveco-legal.ts")

  test("AGREEMENT_DEFAULTS defines all 5 config keys", () => {
    expect(source).toMatch(/AGREEMENT_DEFAULTS/)
    expect(source).toMatch(/tms_url/)
    expect(source).toMatch(/privacy_url/)
    expect(source).toMatch(/terms_url/)
    expect(source).toMatch(/privacy_id/)
    expect(source).toMatch(/terms_id/)
  })

  test("resolveAgreementConfig function exists", () => {
    expect(source).toMatch(/resolveAgreementConfig/)
  })

  test("Huawei legal endpoints in defaults", () => {
    expect(source).toMatch(/huawei|dbankcloud/)
  })

  test("KV_DEVECO_CODE_PRIVACY_ACCEPTED key defined", () => {
    expect(source).toMatch(/deveco_code_privacy_accepted/)
  })
})
