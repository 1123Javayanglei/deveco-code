import path from "path"
import fs from "fs/promises"
import fsSync from "fs"
import { fileURLToPath } from "url"
import { Effect } from "effect"
import type { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Global } from "@opencode-ai/core/global"
import * as Log from "@opencode-ai/core/util/log"

type EmbeddedSkillFile = string | { encoding: "base64"; content: string }

declare const DEVECO_DEFAULT_SKILLS: Record<string, Record<string, EmbeddedSkillFile>> | undefined

const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bin']);

function locateDevSkillsDir(): string | undefined {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidate = path.resolve(here, '../../resources/skills');
    if (fsSync.existsSync(candidate) && fsSync.statSync(candidate).isDirectory()) {
      return candidate;
    }
  } catch {
    /* not a file URL or no fs access — fall through */
  }
  return undefined;
}

async function walkSkillFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function recurse(current: string): Promise<void> {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await recurse(full);
      } else if (entry.isFile() && entry.name !== '.DS_Store') {
        out.push(full);
      }
    }
  }
  await recurse(dir);
  return out;
}

async function loadFromDevResources(
  dir: string,
): Promise<Record<string, Record<string, EmbeddedSkillFile>>> {
  const data: Record<string, Record<string, EmbeddedSkillFile>> = {};
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillRoot = path.join(dir, entry.name);
    const files: Record<string, EmbeddedSkillFile> = {};
    for (const file of await walkSkillFiles(skillRoot)) {
      const rel = path.relative(skillRoot, file).replaceAll('\\', '/');
      const ext = path.extname(file).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) {
        const buf = await fs.readFile(file);
        files[rel] = { encoding: 'base64', content: buf.toString('base64') };
      } else {
        files[rel] = await fs.readFile(file, 'utf-8');
      }
    }
    data[entry.name] = files;
  }
  return data;
}

export namespace Defaults {
  const log = Log.create({ service: "skill-defaults" })

  export const ensure = Effect.fn("Skill.Defaults.ensure")(function* (version: string, fsys: AppFileSystem.Interface) {
    const dir = path.join(Global.Path.data, "skills")
    const versionFile = path.join(dir, ".version")

    const embedded = typeof DEVECO_DEFAULT_SKILLS !== "undefined" ? DEVECO_DEFAULT_SKILLS : undefined
    const devSkillsDir = embedded === undefined ? locateDevSkillsDir() : undefined

    // Version match check - skip if already extracted for this version.
    // In dev mode (version === "local"), never trust the cache: we always re-extract
    // so iteration on resources/skills/ files is picked up immediately.
    const current = yield* Effect.gen(function* () {
      const exists = yield* fsys.existsSafe(versionFile)
      if (!exists) return ""
      const buf = yield* fsys.readFile(versionFile)
      return new TextDecoder().decode(buf)
    }).pipe(Effect.catch(() => Effect.succeed("")))
    if (current === version && current !== "local") {
      return dir
    }

    log.info("extracting default skills", { version, source: devSkillsDir ? "dev-resources" : "embedded" })

    // Backup user-installed skills before cleaning built-in skills
    const userSkillBackupDir = path.join(Global.Path.config, "skills")
    yield* Effect.tryPromise(() =>
      fs.readdir(dir, { withFileTypes: true }),
    ).pipe(
      Effect.flatMap((entries) =>
        Effect.forEach(
          entries.filter((e) => e.isDirectory()),
          (entry) =>
            Effect.gen(function* () {
              const subVersionFile = path.join(dir, entry.name, ".version")
              const isBuiltin = yield* fsys.existsSafe(subVersionFile)
              if (isBuiltin) return // skip built-in skills
              // Copy user-installed skill to config directory
              const src = path.join(dir, entry.name)
              const dest = path.join(userSkillBackupDir, entry.name)
              yield* Effect.tryPromise(() =>
                fs.cp(src, dest, { recursive: true }),
              ).pipe(Effect.catch(() => Effect.void))
            }),
          { concurrency: "unbounded" },
        ),
      ),
      Effect.catch(() => Effect.void),
    )

    // Clean up built-in skill subdirectories only, preserving user skills
    const data = embedded ?? (devSkillsDir ? yield* Effect.tryPromise(() => loadFromDevResources(devSkillsDir)).pipe(
      Effect.catch((err) => {
        log.error("failed to load dev resources/skills", { dir: devSkillsDir, err })
        return Effect.succeed({} as Record<string, Record<string, EmbeddedSkillFile>>)
      }),
    ) : {})

    yield* Effect.tryPromise(() =>
      fs.readdir(dir, { withFileTypes: true }),
    ).pipe(
      Effect.flatMap((entries) =>
        Effect.forEach(
          entries.filter((e) => e.isDirectory()),
          (entry) =>
            Effect.gen(function* () {
              const subVersionFile = path.join(dir, entry.name, ".version")
              const isBuiltin = yield* fsys.existsSafe(subVersionFile)
              if (!isBuiltin) return
              yield* Effect.tryPromise(() =>
                fs.rm(path.join(dir, entry.name), { recursive: true, force: true }),
              ).pipe(Effect.catch(() => Effect.void))
            }),
          { concurrency: "unbounded" },
        ),
      ),
      Effect.catch(() => Effect.void),
    )

    // Extract from embedded data (or dev resources fallback)

    for (const [skillName, files] of Object.entries(data)) {
      yield* fsys.writeWithDirs(path.join(dir, skillName, ".version"), skillName)
      for (const [fileName, content] of Object.entries(files)) {
        yield* fsys.writeWithDirs(
          path.join(dir, skillName, fileName),
          typeof content === "string" ? content : Uint8Array.from(Buffer.from(content.content, content.encoding)),
        )
      }
    }

    // Write version marker
    yield* fsys.writeWithDirs(versionFile, version)

    return dir
  })
}
