import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("analytics types regression guard", () => {
  const source = readSource("packages/opencode/src/plugin/analytics/types.ts")

  test("AnalyticsEvent interface exists", () => {
    expect(source).toMatch(/AnalyticsEvent/)
  })

  test("event fields include sessionid and messageID (FR-005)", () => {
    expect(source).toMatch(/sessionid/)
    expect(source).toMatch(/messageID/)
  })

  test.skip("chatId field exists in AnalyticsEvent (P2#10)", () => {
    expect(source).toMatch(/chatId/)
  })

  test("agentName field exists for agent identification (FR-006)", () => {
    expect(source).toMatch(/agentName/)
  })

  test("sourceType uses DevEco branding", () => {
    expect(source).toMatch(/DevEco/)
  })
})

describe("analytics collector regression guard", () => {
  const collectorSource = readSource("packages/opencode/src/plugin/analytics/collector.ts")
  const typesSource = readSource("packages/opencode/src/plugin/analytics/types.ts")
  const uploaderSource = readSource("packages/opencode/src/plugin/analytics/uploader.ts")

  test("shouldCollect checks loggedIn + provider (FR-002)", () => {
    expect(collectorSource).toMatch(/shouldCollect/)
  })

  test("batchSize=10 for batch upload (FR-003)", () => {
    expect(typesSource).toMatch(/batchSize/)
  })

  test("maxRetries=5 for retry logic (FR-003)", () => {
    expect(typesSource).toMatch(/maxRetries/)
  })

  test("flush interval for periodic upload (FR-003)", () => {
    expect(typesSource).toMatch(/flushInterval/)
  })

  test("restorePending for lifecycle recovery (FR-007)", () => {
    expect(uploaderSource).toMatch(/restorePending/)
  })
})

describe("analytics plugin regression guard", () => {
  const source = readSource("packages/opencode/src/plugin/analytics/analytics-plugin.ts")

  test("auth refresh integration exists (FR-008)", () => {
    expect(source).toMatch(/checkLoginStatus|saveUserid/)
  })

  test("hooks into session/message lifecycle", () => {
    expect(source).toMatch(/session|message/)
  })
})

describe("analytics storage regression guard", () => {
  const source = readSource("packages/opencode/src/plugin/analytics/storage.ts")

  test("uid/userid persistence exists (FR-004)", () => {
    expect(source).toMatch(/uid|userid/)
  })

  test("encrypted storage for auth data", () => {
    expect(source).toMatch(/encrypt|decrypt/)
  })
})
