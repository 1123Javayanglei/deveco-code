import path from "path"
import { appendFile, mkdir, rename, rm, stat } from "fs/promises"

export function readText(filePath: string) {
  return Bun.file(filePath).text()
}

export function readJson<T>(filePath: string) {
  return Bun.file(filePath).json() as Promise<T>
}

/**
 * Walk up the directory tree from `start`, yielding the path to each `target`
 * (file or directory) found along the way. Stops at `stop` or the filesystem root.
 *
 * Used by TUI features like custom theme discovery (searching for `.deveco` dirs).
 */
export async function* up(options: { targets: string[]; start: string; stop?: string }) {
  const { targets, start, stop } = options
  let current = start
  while (true) {
    for (const target of targets) {
      const search = path.join(current, target)
      try {
        await stat(search)
        yield search
      } catch {
        // ENOENT or other — target not present at this level
      }
    }
    if (stop === current) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
}

export async function writeText(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await Bun.write(filePath, content)
}

export async function appendText(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(filePath, content)
}

export async function writeJsonAtomic(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`
  await Bun.write(temporary, JSON.stringify(value)).catch(async (error) => {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  })
  await rename(temporary, filePath).catch(async (error) => {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  })
}
