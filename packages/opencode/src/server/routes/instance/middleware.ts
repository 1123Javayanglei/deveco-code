import type { MiddlewareHandler } from "hono"
import { Instance } from "@/project/instance"
<<<<<<< HEAD
import { getBootstrapRunEffect } from "@/effect/app-runtime"
=======
import { InstanceBootstrap } from "@/project/bootstrap"
import { AppRuntime } from "@/effect/app-runtime"
>>>>>>> 430d158d0
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import { WorkspaceID } from "@/control-plane/schema"

export function InstanceMiddleware(workspaceID?: WorkspaceID): MiddlewareHandler {
  return async (c, next) => {
    const raw = c.req.query("directory") || c.req.header("x-opencode-directory") || process.cwd()
    const directory = AppFileSystem.resolve(
      (() => {
        try {
          return decodeURIComponent(raw)
        } catch {
          return raw
        }
      })(),
    )

    return WorkspaceContext.provide({
      workspaceID,
      async fn() {
        return Instance.provide({
          directory,
          init: await getBootstrapRunEffect(),
          async fn() {
            return next()
          },
        })
      },
    })
  }
}
