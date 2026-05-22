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

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { detectApiLevel } from './detect-sdk.mjs';

const API_CONFIGS = {
  17: { sdkVersion: '5.0.5(17)', modelVersion: '5.0.5' },
  18: { sdkVersion: '5.0.6(18)', modelVersion: '5.0.6' },
  19: { sdkVersion: '5.0.7(19)', modelVersion: '5.0.7' },
  20: { sdkVersion: '6.0.0(20)', modelVersion: '6.0.0' },
  21: { sdkVersion: '6.0.1(21)', modelVersion: '6.0.1' },
  22: { sdkVersion: '6.0.2(22)', modelVersion: '6.0.2' },
};

const REQUIRED_FILES = [
  'build-profile.json5',
  'AppScope/resources/base/media/layered_image.json',
  'AppScope/resources/base/media/background.png',
  'AppScope/resources/base/media/foreground.png',
  'entry/src/main/resources/base/media/layered_image.json',
  'entry/src/main/resources/base/media/background.png',
  'entry/src/main/resources/base/media/foreground.png',
];

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    values.set(key, value);
    index += 1;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const templateDir = values.get('template-dir') ??
    path.resolve(scriptDir, '../../deveco-create-project/application');
  const projectPath = values.get('project-path');
  const bundleNameRaw = values.get('bundle-name');
  let appName = values.get('app-name');
  const apiLevelRaw = values.get('api-level');
  const apiLevel = apiLevelRaw ? Number(apiLevelRaw) : undefined;
  const onConflictRaw = values.get('on-conflict') ?? 'error';

  let onConflict = { kind: 'error' };
  if (onConflictRaw === 'error') {
    onConflict = { kind: 'error' };
  } else if (onConflictRaw === 'overwrite') {
    onConflict = { kind: 'overwrite' };
  } else if (onConflictRaw.startsWith('rename:')) {
    const renameTo = onConflictRaw.slice('rename:'.length).trim();
    if (!renameTo) {
      throw new Error('--on-conflict rename:<NewName> requires a non-empty name');
    }
    onConflict = { kind: 'rename', renameTo };
    appName = renameTo;
  } else {
    throw new Error(`Unsupported --on-conflict value: ${onConflictRaw}`);
  }

  const bundleName = bundleNameRaw ?? (appName
    ? `com.example.${appName.toLowerCase()}`
    : undefined);

  if (!projectPath) {
    throw new Error('Missing required argument --project-path');
  }
  if (!appName) {
    throw new Error('Missing required argument --app-name');
  }
  if (!bundleName) {
    throw new Error('Missing required argument --bundle-name');
  }
  if (apiLevelRaw && (apiLevel === undefined || !Number.isInteger(apiLevel) || !API_CONFIGS[apiLevel])) {
    throw new Error(`Unsupported apiLevel: ${apiLevelRaw}`);
  }

  return {
    projectPath: path.resolve(projectPath),
    appName,
    bundleName,
    apiLevel,
    templateDir: path.resolve(templateDir),
    onConflict,
  };
}

async function resolve(args) {
  if (args.apiLevel) {
    return {
      apiLevel: args.apiLevel,
      source: 'user_input',
    };
  }
  return detectApiLevel();
}

function copyDirectoryContents(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
      continue;
    }
    if (fs.existsSync(targetPath)) {
      continue;
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function replaceInFile(filePath, pairs) {
  const original = fs.readFileSync(filePath, 'utf-8');
  let next = original;
  for (const [from, to] of pairs) {
    next = next.replaceAll(from, to);
  }
  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf-8');
  }
}

function updateApiLevel(targetRoot, apiLevel) {
  if (apiLevel === 22) {
    return;
  }
  const config = API_CONFIGS[apiLevel];
  replaceInFile(path.join(targetRoot, 'build-profile.json5'), [
    ['6.0.2(22)', config.sdkVersion],
  ]);
  replaceInFile(path.join(targetRoot, 'hvigor/hvigor-config.json5'), [
    ['6.0.2', config.modelVersion],
  ]);
}

function verifyFiles(targetRoot) {
  return REQUIRED_FILES.filter((relativePath) => !fs.existsSync(path.join(targetRoot, relativePath)));
}

function detectExistingProject(targetRoot) {
  if (!fs.existsSync(targetRoot)) {
    return { exists: false };
  }
  const stat = fs.statSync(targetRoot);
  if (!stat.isDirectory()) {
    return { exists: true, isProject: false, isEmpty: false, isFile: true };
  }
  const entries = fs.readdirSync(targetRoot);
  if (entries.length === 0) {
    return { exists: true, isProject: false, isEmpty: true, isFile: false };
  }
  const isProject = fs.existsSync(path.join(targetRoot, 'build-profile.json5'));
  return { exists: true, isProject, isEmpty: false, isFile: false };
}

function emitConflictError(targetRoot, info) {
  const payload = {
    code: 'PROJECT_EXISTS',
    message: info.isProject
      ? `A HarmonyOS project already exists at "${targetRoot}".`
      : info.isFile
        ? `A file (not a directory) already exists at "${targetRoot}".`
        : `The directory "${targetRoot}" already exists and is not empty.`,
    targetRoot,
    isProject: !!info.isProject,
    isEmpty: !!info.isEmpty,
    isFile: !!info.isFile,
    hint: 'Re-run with --on-conflict overwrite to replace it, or --on-conflict rename:<NewName> to create under a different name. Ask the user before overwriting.',
  };
  console.error(JSON.stringify(payload, null, 2));
}

function removeDirectory(targetRoot) {
  fs.rmSync(targetRoot, { recursive: true, force: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resolved = await resolve(args);
  if (!fs.existsSync(args.templateDir)) {
    throw new Error(`Template directory not found: ${args.templateDir}`);
  }

  fs.mkdirSync(args.projectPath, { recursive: true });
  const targetRoot = path.join(args.projectPath, args.appName);

  const existing = detectExistingProject(targetRoot);
  if (existing.exists && !existing.isEmpty) {
    if (args.onConflict.kind === 'error') {
      emitConflictError(targetRoot, existing);
      process.exit(2);
    }
    if (args.onConflict.kind === 'overwrite') {
      removeDirectory(targetRoot);
    }
  }

  copyDirectoryContents(args.templateDir, targetRoot);

  replaceInFile(path.join(targetRoot, 'AppScope/resources/base/element/string.json'), [
    ['MyApplication', args.appName],
  ]);
  replaceInFile(path.join(targetRoot, 'AppScope/app.json5'), [
    ['com.example.myapplication', args.bundleName],
  ]);
  updateApiLevel(targetRoot, resolved.apiLevel);

  const missingFiles = verifyFiles(targetRoot);
  if (missingFiles.length > 0) {
    throw new Error(`Template copy incomplete. Missing files: ${missingFiles.join(', ')}`);
  }

  console.log(JSON.stringify({
    projectRoot: targetRoot,
    appName: args.appName,
    bundleName: args.bundleName,
    apiLevel: resolved.apiLevel,
    source: resolved.source,
    detectedFrom: resolved.detectedFrom,
    devecoHome: resolved.devecoHome,
    verified: true,
    onConflict: args.onConflict.kind,
  }, null, 2));
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
