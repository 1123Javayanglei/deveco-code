import path from "path"
import { Effect } from "effect"
import { Agent } from "@/agent/agent"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { InstanceState } from "@/effect/instance-state"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { PartID } from "./schema"
import { MessageV2 } from "./message-v2"
import * as Session from "./session"
import PROMPT_PLAN from "./prompt/plan.txt"
import BUILD_SWITCH from "./prompt/build-switch.txt"
import PLAN_MODE from "./prompt/plan-mode.txt"

const WRITE_EDIT_TOOLS = new Set(["write", "edit"])
const BUILD_TOOLS = new Set(["build_project", "codegenie-mcp_build_project"])
const DEFAULT_SCHEME_ONE_LENGTH_GUARD_MS = 45_000
const DEFAULT_SCHEME_THREE_PRE_WRITE_TOOL_CHOICE_TURNS = 5
const DEFAULT_SCHEME_THREE_PRE_WRITE_STALL_MS = 45_000

function appendSyntheticReminder(
  userMessage: MessageV2.WithParts,
  text: string,
  metadata?: Record<string, unknown>,
) {
  userMessage.parts.push({
    id: PartID.ascending(),
    messageID: userMessage.info.id,
    sessionID: userMessage.info.sessionID,
    type: "text",
    text,
    synthetic: true,
    metadata,
  })
}

function completedToolNames(msg: MessageV2.WithParts): string[] {
  const names: string[] = []
  for (const part of msg.parts) {
    if (part.type !== "tool") continue
    if (part.state.status !== "completed") continue
    names.push(part.tool)
  }
  return names
}

function completedBuildAgentMessages(messages: readonly MessageV2.WithParts[]): MessageV2.WithParts[] {
  return messages.filter(
    (msg) =>
      msg.info.role === "assistant" &&
      msg.info.agent === "build" &&
      msg.info.time.completed !== undefined,
  )
}

function messageModelMs(msg: MessageV2.WithParts): number {
  if (msg.info.role !== "assistant") return 0
  const created = msg.info.time.created
  const completed = msg.info.time.completed
  if (created === undefined || completed === undefined) return 0

  let toolMs = 0
  for (const part of msg.parts) {
    if (part.type !== "tool") continue
    if (part.state.status !== "completed") continue
    const start = part.state.time.start
    const end = part.state.time.end
    if (start !== undefined && end !== undefined) toolMs += end - start
  }
  return Math.max(0, completed - created - toolMs)
}

function envInt(name: string, fallback: number, min = 1): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < min) return fallback
  return parsed
}

function envMs(name: string, fallback: number, min = 1000): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < min) return fallback
  return parsed
}

function sessionHasWriteOrEdit(messages: readonly MessageV2.WithParts[]): boolean {
  return completedBuildAgentMessages(messages).some((msg) =>
    completedToolNames(msg).some((name) => WRITE_EDIT_TOOLS.has(name)),
  )
}

function writesSinceLastBuild(messages: readonly MessageV2.WithParts[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.info.role !== "assistant" || msg.info.agent !== "build") continue
    if (msg.info.time.completed === undefined) continue
    const names = completedToolNames(msg)
    if (names.some((name) => BUILD_TOOLS.has(name))) return false
    if (names.some((name) => WRITE_EDIT_TOOLS.has(name))) return true
  }
  return false
}

function preWriteStats(messages: readonly MessageV2.WithParts[]) {
  if (sessionHasWriteOrEdit(messages)) {
    return {
      preWriteTurns: 0,
      preWriteModelMs: 0,
      lastPreWriteTurnModelMs: 0,
      lastPreWriteTurnHadBuild: false,
    }
  }

  let preWriteTurns = 0
  let preWriteModelMs = 0
  let lastPreWriteTurnModelMs = 0
  let lastPreWriteTurnHadBuild = false
  for (const msg of completedBuildAgentMessages(messages)) {
    const names = completedToolNames(msg)
    if (names.some((name) => WRITE_EDIT_TOOLS.has(name))) break
    preWriteTurns++
    const modelMs = messageModelMs(msg)
    preWriteModelMs += modelMs
    lastPreWriteTurnModelMs = modelMs
    lastPreWriteTurnHadBuild = names.some((name) => BUILD_TOOLS.has(name))
  }
  return {
    preWriteTurns,
    preWriteModelMs,
    lastPreWriteTurnModelMs,
    lastPreWriteTurnHadBuild,
  }
}

function shouldFusePreWriteStall(messages: readonly MessageV2.WithParts[]): boolean {
  if (sessionHasWriteOrEdit(messages)) return false
  const stats = preWriteStats(messages)
  if (stats.lastPreWriteTurnHadBuild) return false
  return stats.lastPreWriteTurnModelMs >= envMs("SCHEME3_PRE_WRITE_STALL_MS", DEFAULT_SCHEME_THREE_PRE_WRITE_STALL_MS)
}

/** Scheme 3 gate: before first write, force tool-calls after threshold or heavy no-deliverable pre-write turns. */
export function shouldRequireDeliverableToolChoice(input: {
  agentName: string
  messages: readonly MessageV2.WithParts[]
}): boolean {
  if (input.agentName !== "build") return false
  if (sessionHasWriteOrEdit(input.messages)) return false
  const stats = preWriteStats(input.messages)
  if (stats.preWriteTurns >= envInt("SCHEME3_PRE_WRITE_TOOL_CHOICE_TURNS", DEFAULT_SCHEME_THREE_PRE_WRITE_TOOL_CHOICE_TURNS))
    return true
  if (shouldFusePreWriteStall(input.messages)) return true
  return false
}

function lastPostWriteNoToolLongTurn(messages: readonly MessageV2.WithParts[]): boolean {
  if (!sessionHasWriteOrEdit(messages)) return false
  const completed = completedBuildAgentMessages(messages)
  const last = completed[completed.length - 1]
  if (!last) return false
  const names = completedToolNames(last)
  if (names.length > 0) return false
  return messageModelMs(last) >= DEFAULT_SCHEME_ONE_LENGTH_GUARD_MS
}

export const apply = Effect.fn("SessionReminders.apply")(function* (input: {
  messages: MessageV2.WithParts[]
  agent: Agent.Info
  session: Session.Info
}) {
  const flags = yield* RuntimeFlags.Service
  const fsys = yield* AppFileSystem.Service
  const sessions = yield* Session.Service
  const userMessage = input.messages.findLast((msg) => msg.info.role === "user")
  if (!userMessage) return input.messages

  // Scheme 1 (completion-safe): ensure write batches are followed by build, and guard long no-tool stalls.
  if (input.agent.name === "build") {
    if (writesSinceLastBuild(input.messages)) {
      appendSyntheticReminder(
        userMessage,
        "<system-reminder>\nYou wrote/edited files but have not called `build_project` yet. Run `build_project` before further read/search, unless you are patching lines from the latest compile ERROR.\n</system-reminder>",
        { reminder: "scheme1_build_before_read" },
      )
    }
    if (lastPostWriteNoToolLongTurn(input.messages)) {
      appendSyntheticReminder(
        userMessage,
        "<system-reminder>\nThe last build turn spent too long with no tool output after code changes. In this turn, avoid planning-only text and call tools directly (`build_project` first, then targeted `edit`/`write` if needed).\n</system-reminder>",
        { reminder: "scheme1_length_guard" },
      )
    }
  }

  if (!flags.experimentalPlanMode) {
    if (input.agent.name === "plan") {
      userMessage.parts.push({
        id: PartID.ascending(),
        messageID: userMessage.info.id,
        sessionID: userMessage.info.sessionID,
        type: "text",
        text: PROMPT_PLAN,
        synthetic: true,
      })
    }
    const wasPlan = input.messages.some((msg) => msg.info.role === "assistant" && msg.info.agent === "plan")
    if (wasPlan && input.agent.name === "build") {
      userMessage.parts.push({
        id: PartID.ascending(),
        messageID: userMessage.info.id,
        sessionID: userMessage.info.sessionID,
        type: "text",
        text: BUILD_SWITCH,
        synthetic: true,
      })
    }
    return input.messages
  }

  const assistantMessage = input.messages.findLast((msg) => msg.info.role === "assistant")
  if (input.agent.name !== "plan" && assistantMessage?.info.agent === "plan") {
    const ctx = yield* InstanceState.context
    const plan = Session.plan(input.session, ctx)
    const exists = yield* fsys.existsSafe(plan)
    const part = yield* sessions.updatePart({
      id: PartID.ascending(),
      messageID: userMessage.info.id,
      sessionID: userMessage.info.sessionID,
      type: "text",
      text: exists
        ? `${BUILD_SWITCH}\n\nA plan file exists at ${plan}. You should execute on the plan defined within it`
        : BUILD_SWITCH,
      synthetic: true,
    })
    userMessage.parts.push(part)
    return input.messages
  }

  if (input.agent.name !== "plan" || assistantMessage?.info.agent === "plan") return input.messages

  const ctx = yield* InstanceState.context
  const plan = Session.plan(input.session, ctx)
  const exists = yield* fsys.existsSafe(plan)
  if (!exists) yield* fsys.ensureDir(path.dirname(plan)).pipe(Effect.catch(Effect.die))
  const part = yield* sessions.updatePart({
    id: PartID.ascending(),
    messageID: userMessage.info.id,
    sessionID: userMessage.info.sessionID,
    type: "text",
    text: PLAN_MODE.replace("${planInfo}", () =>
      exists
        ? `A plan file already exists at ${plan}. You can read it and make incremental edits using the edit tool.`
        : `No plan file exists yet. You should create your plan at ${plan} using the write tool.`,
    ),
    synthetic: true,
  })
  userMessage.parts.push(part)
  return input.messages
})

export * as SessionReminders from "./reminders"
