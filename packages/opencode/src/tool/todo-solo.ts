import { Effect } from "effect"
import { MessageV2 } from "../session/message-v2"
import type { MessageID } from "../session/schema"

export const SOLO_TODO_REJECT =
  "REJECTED: your response contained only a `todowrite` call with no other tools. " +
  "This wastes an LLM round (~15-25s). " +
  "Pair `todowrite` with `write`, `edit`, `build_project`, or other delivery tools in the SAME response. " +
  "If there is nothing to deliver this turn, skip `todowrite` — status can be updated next turn."

function todoToolParts(messageID: MessageID) {
  return MessageV2.parts(messageID).filter(
    (part): part is MessageV2.ToolPart => part.type === "tool",
  )
}

function isSoloTodoToolBatch(toolParts: MessageV2.ToolPart[]) {
  return toolParts.length === 1 && toolParts[0]?.tool === "todowrite"
}

/** Wait briefly for sibling tool parts, then report if this turn is todowrite-only. */
export const isSoloTodoBatch = Effect.fn("TodoTool.isSoloBatch")(function* (messageID: MessageID) {
  const waits = [0, 5, 10, 15]
  for (const ms of waits) {
    if (ms > 0) yield* Effect.sleep(`${ms} millis`)
    const toolParts = todoToolParts(messageID)
    if (toolParts.length > 1) return false
    if (toolParts.length === 1 && toolParts[0]?.tool !== "todowrite") return false
  }

  return isSoloTodoToolBatch(todoToolParts(messageID))
})
