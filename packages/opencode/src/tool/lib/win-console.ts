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
import path from "node:path"

/**
 * Windows console window suppression utility.
 *
 * The native NAPI bridge (napi_bridge.node) spawns child processes (hvigor, hdc)
 * without setting CREATE_NO_WINDOW. On a GUI process (Electron sidecar) that has
 * no console of its own, Windows creates a visible console window for every
 * such child process.
 *
 * This module calls `AllocConsole()` to create a console for the current process
 * and immediately hides it with `ShowWindow(GetConsoleWindow(), SW_HIDE)`.
 * Once the current process owns a (hidden) console, all child processes spawned
 * by the native bridge will inherit it instead of creating their own visible
 * console windows.
 *
 * The koffi FFI library is loaded from its prebuilt `.node` binary. The binary
 * is resolved through multiple strategies to work in dev, npm, and Electron
 * packaged environments. If the binary cannot be found, the function is a
 * silent no-op.
 */

const SW_HIDE = 0
let initialized = false

type KoffiModule = {
  load: (name: string) => {
    func: (
      convention: string,
      name: string,
      ret: string,
      params: string[],
    ) => (...args: unknown[]) => unknown
  }
}

/**
 * Resolves the path to the koffi prebuilt `.node` binary.
 * Returns `undefined` if not found.
 */
function resolveKoffiBinary(): string | undefined {
  const require = createRequire(import.meta.url)

  // 1. Try standard require resolution (works in npm global installs)
  try {
    const resolved = require.resolve("@koromix/koffi-win32-x64/win32_x64/koffi.node")
    if (fs.existsSync(resolved)) return resolved
  } catch {}

  // 2. Search the Bun .bun cache (dev mode with Bun)
  const relPath = path.join("node_modules", "@koromix", "koffi-win32-x64", "win32_x64", "koffi.node")

  // Walk up from this file to find node_modules
  let dir = __dirname
  for (let i = 0; i < 20; i++) {
    const nodeModules = path.join(dir, "node_modules")
    if (fs.existsSync(nodeModules)) {
      // Check standard path
      const std = path.join(nodeModules, relPath)
      if (fs.existsSync(std)) return std

      // Check .bun cache
      const bunCache = path.join(nodeModules, ".bun")
      if (fs.existsSync(bunCache)) {
        try {
          for (const entry of fs.readdirSync(bunCache)) {
            if (entry.startsWith("@koromix+koffi-win32-x64")) {
              const nodeFile = path.join(
                bunCache,
                entry,
                "node_modules",
                "@koromix",
                "koffi-win32-x64",
                "win32_x64",
                "koffi.node",
              )
              if (fs.existsSync(nodeFile)) return nodeFile
            }
          }
        } catch {}
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // 3. Electron packaged app: check process.resourcesPath
  const electronResources = (process as unknown as { resourcesPath?: string }).resourcesPath
  if (electronResources) {
    const nodeFile = path.join(electronResources, "vendor", "koffi", "win32_x64", "koffi.node")
    if (fs.existsSync(nodeFile)) return nodeFile
  }

  // 4. Next to the binary (legacy standalone mode)
  const execDir = path.dirname(process.execPath)
  const legacyPaths = [
    path.join(execDir, "vendor", "koffi", "win32_x64", "koffi.node"),
    path.join(execDir, "..", "vendor", "koffi", "win32_x64", "koffi.node"),
  ]
  for (const p of legacyPaths) {
    if (fs.existsSync(p)) return p
  }

  return undefined
}

function suppressWithKoffi(): boolean {
  try {
    const require = createRequire(import.meta.url)

    const nodePath = resolveKoffiBinary()
    if (!nodePath) return false

    const mod = require(nodePath) as KoffiModule
    const koffi = (mod as { default?: KoffiModule }).default ?? mod
    if (!koffi || typeof koffi.load !== "function") return false

    const kernel32 = koffi.load("kernel32.dll")
    const user32 = koffi.load("user32.dll")

    const AllocConsole = kernel32.func("__stdcall", "AllocConsole", "bool", [])
    const GetConsoleWindow = kernel32.func("__stdcall", "GetConsoleWindow", "void *", [])
    const ShowWindow = user32.func("__stdcall", "ShowWindow", "bool", ["void *", "int"])

    // AllocConsole creates a console for this process if it doesn't have one.
    // Returns false if the process already has a console (e.g. running in a terminal).
    // Either way, we get the console window handle and hide it.
    AllocConsole()

    const hwnd = GetConsoleWindow()
    if (hwnd) {
      ShowWindow(hwnd, SW_HIDE)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Ensures that the current process has a hidden console so that child processes
 * spawned by native code (which cannot be modified to pass CREATE_NO_WINDOW)
 * will inherit the hidden console rather than creating visible console windows.
 *
 * Call this once before invoking native bridge operations that spawn processes.
 * Safe to call multiple times – subsequent calls are no-ops.
 */
export async function ensureHiddenConsole(): Promise<void> {
  if (initialized) return
  if (process.platform !== "win32") return
  initialized = true

  suppressWithKoffi()
}
