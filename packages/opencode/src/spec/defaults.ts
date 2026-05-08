import path from "path"
import { Effect } from "effect"
import type { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Global } from "@opencode-ai/core/global"
import * as Log from "@opencode-ai/core/util/log"

type EmbeddedSpecFile = string | { encoding: "base64"; content: string } | Record<string, EmbeddedSpecFile>

declare const CODEGENIE_DEFAULT_SPEC_RESOURCES: Record<string, EmbeddedSpecFile> | undefined

export namespace Defaults {
  const log = Log.create({ service: "spec-defaults" })

  export const ensure = Effect.fn("Spec.Defaults.ensure")(function* (version: string, fsys: AppFileSystem.Interface) {
    const configDir = Global.Path.config
    const specDir = path.join(configDir, "specs")
    const versionFile = path.join(specDir, ".version")

    const current = yield* Effect.gen(function* () {
      const exists = yield* fsys.existsSafe(versionFile)
      if (!exists) return ""
      const buf = yield* fsys.readFile(versionFile)
      return new TextDecoder().decode(buf)
    }).pipe(Effect.catch(() => Effect.succeed("")))
    if (current === version && current !== "local") {
      return { configDir, specDir }
    }

    log.info("extracting default spec resources", { version })

    yield* Effect.tryPromise(() =>
      import("fs/promises").then((fs) => fs.rm(path.join(configDir, "commands"), { recursive: true, force: true })),
    ).pipe(Effect.catch(() => Effect.void))
    yield* Effect.tryPromise(() =>
      import("fs/promises").then((fs) => fs.rm(path.join(specDir, "templates"), { recursive: true, force: true })),
    ).pipe(Effect.catch(() => Effect.void))
    yield* Effect.tryPromise(() =>
      import("fs/promises").then((fs) => fs.rm(path.join(configDir, "agents"), { recursive: true, force: true })),
    ).pipe(Effect.catch(() => Effect.void))

    const data = typeof CODEGENIE_DEFAULT_SPEC_RESOURCES !== "undefined" ? CODEGENIE_DEFAULT_SPEC_RESOURCES : {}
    for (const [name, content] of Object.entries(data)) {
      if (typeof content === "string") {
        if (name === "spec.md") {
          yield* fsys.writeWithDirs(path.join(configDir, "agents", name), content)
        }
      } else if (typeof content === "object" && !("encoding" in content)) {
        const targetDir = name === "commands" 
          ? path.join(configDir, "commands") 
          : name === "templates" 
            ? path.join(specDir, "templates") 
            : path.join(specDir, name)
        for (const [fileName, fileContent] of Object.entries(content as Record<string, EmbeddedSpecFile>)) {
          if (typeof fileContent === "string") {
            yield* fsys.writeWithDirs(path.join(targetDir, fileName), fileContent)
          } else if (typeof fileContent === "object" && "encoding" in fileContent) {
            yield* fsys.writeWithDirs(
              path.join(targetDir, fileName),
              Uint8Array.from(Buffer.from(fileContent.content, fileContent.encoding)),
            )
          }
        }
      }
    }

    yield* fsys.writeWithDirs(versionFile, version)

    return { configDir, specDir }
  })
}
