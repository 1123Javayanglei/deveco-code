<<<<<<< HEAD
import { listAdapters } from "@/control-plane/adapters"
=======
import { listAdaptors } from "@/control-plane/adaptors"
>>>>>>> 430d158d0
import { Workspace } from "@/control-plane/workspace"
import * as InstanceState from "@/effect/instance-state"
import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { CreatePayload, SessionRestorePayload } from "../groups/workspace"

export const workspaceHandlers = HttpApiBuilder.group(InstanceHttpApi, "workspace", (handlers) =>
  Effect.gen(function* () {
    const workspace = yield* Workspace.Service

<<<<<<< HEAD
    const adapters = Effect.fn("WorkspaceHttpApi.adapters")(function* () {
      const instance = yield* InstanceState.context
      return yield* Effect.promise(() => listAdapters(instance.project.id))
=======
    const adaptors = Effect.fn("WorkspaceHttpApi.adaptors")(function* () {
      const instance = yield* InstanceState.context
      return yield* Effect.promise(() => listAdaptors(instance.project.id))
>>>>>>> 430d158d0
    })

    const list = Effect.fn("WorkspaceHttpApi.list")(function* () {
      return yield* workspace.list((yield* InstanceState.context).project)
    })

    const create = Effect.fn("WorkspaceHttpApi.create")(function* (ctx: { payload: typeof CreatePayload.Type }) {
      const instance = yield* InstanceState.context
      return yield* workspace
        .create({
          ...ctx.payload,
<<<<<<< HEAD
          extra: ctx.payload.extra ?? null,
=======
>>>>>>> 430d158d0
          projectID: instance.project.id,
        })
        .pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
    })

    const status = Effect.fn("WorkspaceHttpApi.status")(function* () {
      const ids = new Set((yield* workspace.list((yield* InstanceState.context).project)).map((item) => item.id))
      return (yield* workspace.status()).filter((item) => ids.has(item.workspaceID))
    })

    const remove = Effect.fn("WorkspaceHttpApi.remove")(function* (ctx: { params: { id: Workspace.Info["id"] } }) {
      return yield* workspace.remove(ctx.params.id)
    })

    const sessionRestore = Effect.fn("WorkspaceHttpApi.sessionRestore")(function* (ctx: {
      params: { id: Workspace.Info["id"] }
      payload: typeof SessionRestorePayload.Type
    }) {
      return yield* workspace
        .sessionRestore({
          workspaceID: ctx.params.id,
          sessionID: ctx.payload.sessionID,
        })
        .pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
    })

    return handlers
<<<<<<< HEAD
      .handle("adapters", adapters)
=======
      .handle("adaptors", adaptors)
>>>>>>> 430d158d0
      .handle("list", list)
      .handle("create", create)
      .handle("status", status)
      .handle("remove", remove)
      .handle("sessionRestore", sessionRestore)
  }),
)
