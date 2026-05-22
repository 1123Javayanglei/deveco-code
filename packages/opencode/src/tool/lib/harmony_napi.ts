/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from "fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "path"
import { findDevEcoHome } from "./env"
import * as Log from "@opencode-ai/core/util/log"
import { DEVECO_PROVIDER_CONFIG } from "@/plugin/deveco-models"
import { devecoAuth, ACCESS_TOKEN_EXPIRES_MS } from "@/plugin/deveco"

function addon() {
  const execDir = path.dirname(process.execPath)
  // 1. vendor directory (npm / production mode)
  const vendorMarker = path.join(execDir, "..", "vendor", "mcp-bridge-native", "package.json")
  if (fs.existsSync(vendorMarker)) {
    const r = createRequire(vendorMarker)
    return r("./napi_bridge.node") as typeof import("@deveco-codegenie/mcp-bridge")
  }
  // 2. next to binary (legacy standalone mode)
  const legacyMarker = path.join(execDir, "mcp-bridge-native", "package.json")
  if (fs.existsSync(legacyMarker)) {
    const r = createRequire(legacyMarker)
    return r("./napi_bridge.node") as typeof import("@deveco-codegenie/mcp-bridge")
  }
  // 3. node_modules (dev mode)
  return createRequire(import.meta.url)("@deveco-codegenie/mcp-bridge")
}

const bridge = addon()
const log = Log.create({ service: "harmony-napi" })

let gate: Promise<void> = Promise.resolve()
let bound = ""

export async function resolveUIVerifyParams(directory?: string) {
  // path 1: config agent model
  try {
    const { Effect, Option } = await import("effect")
    const { AppRuntime } = await import("@/effect/app-runtime")
    const { Config } = await import("@/config/config")
    const { Provider } = await import("@/provider/provider")
    const { InstanceStore } = await import("@/project/instance-store")
    // Run config + provider lookup in a single Effect with InstanceRef injected,
    // so per-instance services (Config, Provider) can access the instance context.
    const path1Effect = Effect.gen(function* () {
      const config = yield* Config.Service
      const cfg = yield* config.get()
      const modelStr = cfg.agent?.["ui_verification"]?.model
      if (!modelStr) {
        log.info("ui_verification: no agent model configured, falling through")
        return null
      }
      const { providerID, modelID } = Provider.parseModel(modelStr)
      const svc = yield* Provider.Service
      const provider = yield* Effect.option(svc.getProvider(providerID))
      const model = yield* Effect.option(svc.getModel(providerID, modelID))
      if (Option.isSome(provider) && Option.isSome(model)) {
        const baseURL = (provider.value.options?.baseURL as string | undefined) ?? model.value.api.url ?? null
        const apiKey = provider.value.key ?? (provider.value.options?.apiKey as string | undefined) ?? null
        const modelName = model.value.api.id ?? null
        log.info("ui_verification: resolved from config", { baseURL, modelName })
        return { baseURL, apiKey, modelName }
      }
      log.warn("ui_verification: config model not found in provider registry", { modelStr, providerID, modelID })
      return null
    })
    const result = directory
      ? await AppRuntime.runPromise(Effect.gen(function* () {
          const store = yield* InstanceStore.Service
          return yield* store.provide({ directory }, path1Effect)
        }))
      : await AppRuntime.runPromise(path1Effect)
    if (result) return result
  } catch (err) {
    log.warn("ui_verification: config path failed", { err: String(err) })
  }

  // fallback 1: 环境变量
  if (process.env.UI_VERIFY_BASE_URL && process.env.UI_VERIFY_API_KEY && process.env.UI_VERIFY_MODEL_NAME) {
    log.info("ui_verification: resolved from env vars", { baseURL: process.env.UI_VERIFY_BASE_URL, modelName: process.env.UI_VERIFY_MODEL_NAME })
    return {
      baseURL: process.env.UI_VERIFY_BASE_URL ?? null,
      apiKey: process.env.UI_VERIFY_API_KEY ?? null,
      modelName: process.env.UI_VERIFY_MODEL_NAME ?? null,
    }
  }

  // fallback 2: deveco 登录态内置模型
  try {
    const { Effect } = await import("effect")
    const { AppRuntime } = await import("@/effect/app-runtime")
    const { Auth } = await import("@/auth")
    const getAuth = () => AppRuntime.runPromise(Effect.gen(function* () { const svc = yield* Auth.Service; return yield* svc.get("deveco") })).catch((err) => { log.warn("ui_verification: Auth.Service.get failed", { err: String(err) }); return undefined })
    let auth = await getAuth()
    if (auth instanceof Auth.Oauth && auth.access) {
      if (!auth.access || auth.expires < Date.now()) {
        log.info("ui_verification: token expired, attempting refresh")
        const tokens = await devecoAuth.refreshToken()
        if (tokens) {
          await AppRuntime.runPromise(Effect.gen(function* () {
            const svc = yield* Auth.Service
            yield* svc.set("deveco", new Auth.Oauth({
              type: "oauth",
              access: tokens.accessToken,
              refresh: tokens.refreshToken,
              expires: Date.now() + ACCESS_TOKEN_EXPIRES_MS,
            }))
          }))
          auth = await getAuth()
          log.info("ui_verification: token refreshed successfully")
        } else {
          log.warn("ui_verification: token refresh failed (devecoAuth.refreshToken returned null)")
        }
      }
      if (auth instanceof Auth.Oauth && auth.access && auth.expires > Date.now()) {
        log.info("ui_verification: resolved from deveco login", { modelName: "Qwen2.5-VL-72B" })
        return {
          baseURL: DEVECO_PROVIDER_CONFIG.api + "/no-stream",
          apiKey: auth.access,
          modelName: "Qwen2.5-VL-72B",
        }
      }
    } else {
      log.warn("ui_verification: auth is not OAuth-like or missing", { hasAuth: !!auth })
    }
  } catch (err) {
    log.warn("ui_verification: deveco login path failed", { err: String(err) })
  }

  log.warn("ui_verification: all paths failed, returning null params")
  return {
    baseURL: null,
    apiKey: null,
    modelName: null,
  }
}

async function runInit(worktree: string) {
  const devecoHome = await findDevEcoHome()
  if (!devecoHome) {
    throw new Error("DevEco Studio not found. Please set DEVECO_HOME to your DevEco installation directory.")
  }
  const logDir = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share', 'deveco'), 'log', 'deveco-mcp')
  fs.mkdirSync(logDir, { recursive: true })
  const { baseURL, apiKey, modelName } = await resolveUIVerifyParams(worktree)
  log.info("ui_verification model", { baseURL, modelName })
  await bridge.init(logDir, worktree, devecoHome, baseURL, apiKey, modelName)
}

/** Re-runs native bridge init when worktree changes or deveco token expires. */
export async function ensureInitialized(worktree: string): Promise<void> {
  gate = gate.then(async () => {
    if (bound === worktree) {
      const { Effect } = await import("effect")
      const { AppRuntime } = await import("@/effect/app-runtime")
      const { Auth } = await import("@/auth")
      const auth = await AppRuntime.runPromise(Effect.gen(function* () { const svc = yield* Auth.Service; return yield* svc.get("deveco") })).catch(() => undefined)
      if (!(auth instanceof Auth.Oauth) || auth.expires > Date.now()) return
    }
    bound = worktree
    await runInit(worktree)
  })
  await gate
}

export async function callHarmonyNapiTool(params: {
  worktree: string
  toolName: string
  args: Record<string, unknown>
}): Promise<unknown> {
  await ensureInitialized(params.worktree)
  const resultJson = await bridge.callTool(params.toolName, JSON.stringify(params.args))
  return JSON.parse(resultJson as string)
}

export async function listTools(worktree: string): Promise<unknown> {
  await ensureInitialized(worktree)
  return JSON.parse(bridge.listTools())
}

export async function callTool(
  worktree: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return callHarmonyNapiTool({ worktree, toolName, args })
}

export async function napiBridgeStop(): Promise<void> {
  try {
    await bridge?.stop?.();
  } catch (error) {

  }
}
