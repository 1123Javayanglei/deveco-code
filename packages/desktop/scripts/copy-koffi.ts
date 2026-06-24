#!/usr/bin/env bun
/**
 * Copies the koffi prebuilt .node binary to resources/vendor/koffi/ for
 * inclusion in the Electron app's extraResources.
 *
 * Only the win32-x64 binary is needed (the console suppression utility is
 * Windows-only).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const desktopDir = path.resolve(__dirname, "..")
const rootDir = path.resolve(desktopDir, "../..")

const destDir = path.join(desktopDir, "resources", "vendor", "koffi", "win32_x64")
const destFile = path.join(destDir, "koffi.node")

// Search for the koffi binary in the Bun .bun cache
const bunCache = path.join(rootDir, "node_modules", ".bun")
let srcFile: string | null = null

if (fs.existsSync(bunCache)) {
  for (const entry of fs.readdirSync(bunCache)) {
    if (entry.startsWith("@koromix+koffi-win32-x64")) {
      const candidate = path.join(
        bunCache,
        entry,
        "node_modules",
        "@koromix",
        "koffi-win32-x64",
        "win32_x64",
        "koffi.node",
      )
      if (fs.existsSync(candidate)) {
        srcFile = candidate
        break
      }
    }
  }
}

// Also check standard node_modules location
if (!srcFile) {
  const stdPath = path.join(rootDir, "node_modules", "@koromix", "koffi-win32-x64", "win32_x64", "koffi.node")
  if (fs.existsSync(stdPath)) {
    srcFile = stdPath
  }
}

if (!srcFile) {
  console.warn("[copy-koffi] koffi binary not found, skipping (non-Windows or not installed)")
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })
fs.copyFileSync(srcFile, destFile)
console.log(`[copy-koffi] Copied ${path.relative(rootDir, srcFile)} -> ${path.relative(desktopDir, destFile)}`)
