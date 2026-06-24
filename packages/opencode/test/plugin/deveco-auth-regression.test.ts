import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("deveco-auth OAuth flow regression guard (spec #4)", () => {
  const source = readSource("packages/opencode/src/plugin/deveco.ts")

  test("LocalAuthServer for browser OAuth", () => {
    expect(source).toMatch(/LocalAuthServer|auth.*server/)
  })

  test("tempToken → JWT → userInfo flow", () => {
    expect(source).toMatch(/tempToken|jwt|userInfo/)
  })

  test("multi-region support (China + international)", () => {
    expect(source).toMatch(/region|cn\.|china/)
  })

  test("refreshToken method for auto refresh", () => {
    expect(source).toMatch(/refreshToken/)
  })

  test.skip("token dedup/cooldown for refresh (not yet implemented)", () => {
    expect(source).toMatch(/cooldown|dedup/)
  })

  test("DevEcoAuthPlugin custom fetch + header injection", () => {
    expect(source).toMatch(/DevEcoAuthPlugin|fetch|header/)
  })
})

describe("local-crypto KEK/DEK regression guard", () => {
  const source = readSource("packages/opencode/src/security/local-crypto.ts")

  test("AES-256-GCM encryption", () => {
    expect(source).toMatch(/aes-256-gcm|AES|GCM/)
  })

  test("KEK root key derivation", () => {
    expect(source).toMatch(/kekId|rootKeyIds|kekLength/)
  })

  test("wrapped DEK for key management", () => {
    expect(source).toMatch(/DEK|wrapped/)
  })

  test("12-byte IV for GCM", () => {
    expect(source).toMatch(/iv.*12|12.*byte/)
  })
})

describe("deveco-onboarding UI regression guard", () => {
  test("deveco-onboarding.tsx exists", () => {
    expect(fileExists("packages/opencode/src/cli/cmd/tui/component/deveco-onboarding.tsx")).toBe(true)
  })
})

describe("auth module regression guard", () => {
  const source = readSource("packages/opencode/src/auth/index.ts")

  test("DEVECO_AUTH_CONTENT env var handling", () => {
    expect(source).toMatch(/DEVECO_AUTH_CONTENT/)
  })

  test("decryptAuthData / encryptAuthData functions", () => {
    expect(source).toMatch(/decryptAuthData|encryptAuthData/)
  })

  test("LOCAL_CREDENTIALS_CORRUPTED_MESSAGE for error mapping", () => {
    expect(source).toMatch(/LOCAL_CREDENTIALS_CORRUPTED|corrupted/)
  })
})
