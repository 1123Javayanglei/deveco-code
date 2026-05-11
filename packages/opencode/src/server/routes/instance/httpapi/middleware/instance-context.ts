<<<<<<< HEAD
import { WorkspaceRef } from "@/effect/instance-ref"
import { InstanceBootstrap } from "@/project/bootstrap"
import { InstanceStore } from "@/project/instance-store"
=======
import { InstanceRef, WorkspaceRef } from "@/effect/instance-ref"
import { AppRuntime } from "@/effect/app-runtime"
import { InstanceBootstrap } from "@/project/bootstrap"
import { Instance } from "@/project/instance"
import type { InstanceContext } from "@/project/instance"
import { Filesystem } from "@/util/filesystem"
>>>>>>> 430d158d0
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { HttpApiMiddleware } from "effect/unstable/httpapi"
import { WorkspaceRouteContext } from "./workspace-routing"

export class InstanceContextMiddleware extends HttpApiMiddleware.Service<
  InstanceContextMiddleware,
  {
    requires: WorkspaceRouteContext
  }
>()("@opencode/ExperimentalHttpApiInstanceContext") {}

function decode(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
}

<<<<<<< HEAD
function provideInstanceContext<E>(
  effect: Effect.Effect<HttpServerResponse.HttpServerResponse, E>,
  store: InstanceStore.Interface,
  bootstrap: InstanceBootstrap.Interface,
): Effect.Effect<HttpServerResponse.HttpServerResponse, E, WorkspaceRouteContext> {
  return Effect.gen(function* () {
    const route = yield* WorkspaceRouteContext
    return yield* store.provide(
      { directory: decode(route.directory), init: bootstrap.run },
      effect.pipe(Effect.provideService(WorkspaceRef, route.workspaceID)),
=======
function makeInstanceContext(directory: string): Effect.Effect<InstanceContext> {
  return Effect.promise(() =>
    Instance.provide({
      directory: Filesystem.resolve(decode(directory)),
      init: () => AppRuntime.runPromise(InstanceBootstrap),
      fn: () => Instance.current,
    }),
  )
}

function provideInstanceContext<E>(
  effect: Effect.Effect<HttpServerResponse.HttpServerResponse, E>,
): Effect.Effect<HttpServerResponse.HttpServerResponse, E, WorkspaceRouteContext> {
  return Effect.gen(function* () {
    const route = yield* WorkspaceRouteContext
    const ctx = yield* makeInstanceContext(route.directory)
    return yield* effect.pipe(
      Effect.provideService(InstanceRef, ctx),
      Effect.provideService(WorkspaceRef, route.workspaceID),
>>>>>>> 430d158d0
    )
  })
}

<<<<<<< HEAD
export const instanceContextLayer = Layer.effect(
  InstanceContextMiddleware,
  Effect.gen(function* () {
    const store = yield* InstanceStore.Service
    const bootstrap = yield* InstanceBootstrap.Service
    return InstanceContextMiddleware.of((effect) => provideInstanceContext(effect, store, bootstrap))
  }),
)

export const instanceRouterMiddleware = HttpRouter.middleware()(
  Effect.gen(function* () {
    const store = yield* InstanceStore.Service
    const bootstrap = yield* InstanceBootstrap.Service
    return (effect) => provideInstanceContext(effect, store, bootstrap)
  }),
)
=======
export const instanceContextLayer = Layer.succeed(
  InstanceContextMiddleware,
  InstanceContextMiddleware.of((effect) => provideInstanceContext(effect)),
)

export const instanceRouterMiddleware = HttpRouter.middleware()((effect) => provideInstanceContext(effect))
>>>>>>> 430d158d0
