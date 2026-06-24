// Internal bridge: lets non-Effect code (async Promise functions that predate
// the Effect migration) call Effect.logInfo/Warning/Error synchronously while
// preserving the service tag via Effect.annotateLogs.
//
// Behavior:
//   - Inside an Effect.gen fiber with Observability installed: annotations
//     land in the file logger at ~/.local/share/deveco/log/deveco.log.
//   - Outside any Effect fiber (e.g. inside a plain async function): the
//     call runs under Effect's default console logger. Output goes to
//     stdout (NOT stderr), which OpenTUI's renderer intercepts — so the
//     log does not leak onto the user's terminal during TUI startup.
//
// Migration target: callers should migrate to yield* Effect.logInfo inside
// Effect.gen whenever possible. This bridge is a stepping stone.

import { Effect, Logger } from "effect"

type Fields = Record<string, unknown>

function annotate(service: string, fields?: Fields) {
  const annotations: Record<string, string> = { service }
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue
      if (value instanceof Error) annotations[key] = value.message
      else if (typeof value === "object") {
        try {
          annotations[key] = JSON.stringify(value)
        } catch {
          annotations[key] = String(value)
        }
      } else annotations[key] = String(value)
    }
  }
  return annotations
}

function run(effect: Effect.Effect<void>): void {
  try {
    Effect.runSync(effect)
  } catch {
    // swallow — logging must never crash the host process
  }
}

export function logBridge(service: string) {
  return {
    debug(message: string, fields?: Fields) {
      run(Effect.logDebug(message).pipe(Effect.annotateLogs(annotate(service, fields))))
    },
    info(message: string, fields?: Fields) {
      run(Effect.logInfo(message).pipe(Effect.annotateLogs(annotate(service, fields))))
    },
    warn(message: string, fields?: Fields) {
      run(Effect.logWarning(message).pipe(Effect.annotateLogs(annotate(service, fields))))
    },
    error(message: string, fields?: Fields) {
      run(Effect.logError(message).pipe(Effect.annotateLogs(annotate(service, fields))))
    },
  }
}

// Suppress unused-import warnings for Logger (kept for future use).
void Logger.make
