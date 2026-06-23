import { Effect } from "effect"
import { MessageV2 } from "../session/message-v2"
import type { MessageID } from "../session/schema"

/**
 * Rejection message returned when a todowrite call is the only tool in a turn.
 *
 * Models frequently emit a standalone `todowrite` call to update task progress
 * without pairing it with any delivery tool (write, edit, build_project, etc.).
 * Each such round-trip wastes ~15–25s of LLM time. This text is fed back to
 * the model so it learns to either pair todowrite with a delivery tool or
 * skip the status update entirely.
 */
export const SOLO_TODO_REJECT = [
  "REJECTED: your response contained only a `todowrite` call with no other tools.",
  "This wastes an LLM round (~15-25s).",
  "Pair `todowrite` with `write`, `edit`, `build_project`, or other delivery tools in the SAME response.",
  "If there is nothing to deliver this turn, skip `todowrite` — status can be updated next turn.",
].join("\n")

/**
 * Polling intervals (ms) for the solo-todowrite detection loop.
 *
 * When the model emits multiple tool calls in parallel, the AI SDK may not
 * have written all `tool-input-start` parts to the database by the time
 * `todowrite.execute()` runs. We poll with increasing delays to give sibling
 * tool parts a chance to appear before concluding this is a solo call.
 *
 * Total worst-case wait: sum(waits) = 0 + 10 + 30 + 60 = 100ms.
 */
const POLL_WAITS = [0, 10, 30, 60]

/**
 * Determine whether the current assistant message contains only a `todowrite`
 * tool call with no sibling delivery tools.
 *
 * Returns `true` when the message has exactly one tool part and that part is
 * `todowrite`. Returns `false` as soon as any sibling tool part is observed.
 *
 * The check is repeated across several polling intervals to handle the race
 * where parallel tool calls have not all been persisted yet.
 */
export function isSoloTodoBatch(messageID: MessageID) {
  return Effect.gen(function* () {
    for (const ms of POLL_WAITS) {
      if (ms > 0) yield* Effect.sleep(`${ms} millis`)

      const parts = MessageV2.parts(messageID)
      const toolParts = parts.filter((p): p is MessageV2.ToolPart => p.type === "tool")

      // More than one tool part → not solo, short-circuit immediately.
      if (toolParts.length > 1) return false

      // Exactly one tool part and it is NOT todowrite → not solo.
      if (toolParts.length === 1 && toolParts[0].tool !== "todowrite") return false

      // Zero tool parts (shouldn't happen, but treat as not-solo to be safe).
      if (toolParts.length === 0) return false

      // Exactly one tool part and it IS todowrite → candidate solo.
      // Continue polling to give sibling parts a chance to appear.
    }

    // All polling rounds confirmed: single todowrite only.
    return true
  })
}
