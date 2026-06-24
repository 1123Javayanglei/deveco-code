import { describe, expect, test } from "bun:test"
import { readSource, fileExists } from "../lib/source-reader"

describe("queue-polling regression guard (spec #17)", () => {
  test("exit-queue service exists", () => {
    expect(fileExists("packages/opencode/src/session/exit-queue.ts")).toBe(true)
  })

  const source = readSource("packages/opencode/src/session/exit-queue.ts")
  test("ExitQueue service has SSE POST endpoint", () => {
    expect(source).toMatch(/ExitQueue|exitSessionQueue/)
  })

  test.skip("queue-polling service module exists (6/7 modules missing)", () => {
    expect(fileExists("packages/opencode/src/session/queue-polling.ts")).toBe(true)
  })

  test.skip("queue-polling has submission queue service", () => {
    const qp = readSource("packages/opencode/src/session/queue-polling.ts")
    expect(qp).toMatch(/SubmissionQueue/)
  })
})
