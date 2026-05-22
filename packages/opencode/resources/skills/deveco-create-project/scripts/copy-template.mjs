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

function tokenizeArgs(argv) {
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
  return values;
}

function parseOnConflict(raw) {
  if (raw === 'error') {
    return { kind: 'error' };
  }
  if (raw === 'overwrite') {
    return { kind: 'overwrite' };
  }
  if (raw.startsWith('rename:')) {
    const renameTo = raw.slice('rename:'.length).trim();
    if (!renameTo) {
      throw new Error('--on-conflict rename:<NewName> requires a non-empty name');
    }
    return { kind: 'rename', renameTo };
  }
  throw new Error(`Unsupported --on-conflict value: ${raw}`);
}

function parseApiLevel(raw) {
  if (!raw) {
    return undefined;
  }
  const apiLevel = Number(raw);
  if (!Number.isInteger(apiLevel) || !API_CONFIGS[apiLevel]) {
    throw new Error(`Unsupported apiLevel: ${raw}`);
  }
  return apiLevel;
}

function assertRequired(name, value) {
  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }
}

const APP_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,127}$/;
const BUNDLE_SEGMENT_PATTERN = /^[a-z][a-z0-9_]*$/;

function suggestAppName(raw) {
  const ascii = raw
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]+/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim();
  if (!ascii) {
    return '';
  }
  const camel = ascii
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  const trimmed = camel.replace(/^[^A-Za-z]+/, '');
  return trimmed.slice(0, 64) || '';
}

function validateAppName(rawAppName) {
  if (APP_NAME_PATTERN.test(rawAppName)) {
    return null;
  }
  const suggestion = suggestAppName(rawAppName);
  const reasons = [];
  if (/[^\x00-\x7F]/.test(rawAppName)) {
    reasons.push('contains non-ASCII characters (e.g. Chinese)');
  }
  if (/\s/.test(rawAppName)) {
    reasons.push('contains whitespace');
  }
  if (/^[^A-Za-z]/.test(rawAppName)) {
    reasons.push('does not start with an English letter');
  }
  if (/[^A-Za-z0-9_]/.test(rawAppName)) {
    reasons.push('contains characters other than [A-Za-z0-9_]');
  }
  if (rawAppName.length > 128) {
    reasons.push('exceeds 128 characters');
  }
  if (reasons.length === 0) {
    reasons.push('does not match the application name rule');
  }
  return { reasons, suggestion };
}

function validateBundleName(bundleName) {
  if (bundleName.length === 0 || bundleName.length > 128) {
    return { reason: 'bundleName length must be between 1 and 128 characters' };
  }
  const segments = bundleName.split('.');
  if (segments.length < 2) {
    return { reason: 'bundleName must contain at least one dot (e.g. com.example.app)' };
  }
  for (const seg of segments) {
    if (!BUNDLE_SEGMENT_PATTERN.test(seg)) {
      return {
        reason:
          `bundleName segment "${seg}" is invalid; each segment must start with a lowercase letter ` +
          'and contain only [a-z0-9_]',
      };
    }
  }
  return null;
}

function emitInvalidAppName(rawAppName, validation) {
  const payload = {
    code: 'APP_NAME_INVALID',
    message:
      `appName "${rawAppName}" is not a valid application name. ` +
      'It must start with an English letter and contain only [A-Za-z0-9_], length 1-128.',
    rawAppName,
    reasons: validation.reasons,
    suggestion: validation.suggestion || null,
    hint:
      validation.suggestion
        ? `请通过 AskUserQuestion 向用户确认是否使用建议的英文名 "${validation.suggestion}"，或让用户提供一个符合规范的英文 appName，然后用新的 --app-name 重新运行脚本。Never auto-translate without explicit user confirmation.`
        : '请通过 AskUserQuestion 让用户提供一个符合规范的英文 appName（仅 A-Z/a-z/0-9/_，首字符必须是字母），然后用新的 --app-name 重新运行脚本。',
  };
  console.error(JSON.stringify(payload, null, 2));
}

function emitInvalidBundleName(bundleName, reason) {
  const payload = {
    code: 'BUNDLE_NAME_INVALID',
    message: `bundleName "${bundleName}" is invalid: ${reason}`,
    bundleName,
    hint: 'bundleName must be reverse-DNS (e.g. com.example.shoppingcart). 请用合法的 --bundle-name 重新运行脚本。',
  };
  console.error(JSON.stringify(payload, null, 2));
}

function parseArgs(argv) {
  const values = tokenizeArgs(argv);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const templateDir = values.get('template-dir') ??
    path.resolve(scriptDir, '../../deveco-create-project/application');
  const projectPath = values.get('project-path');
  const bundleNameRaw = values.get('bundle-name');
  const onConflict = parseOnConflict(values.get('on-conflict') ?? 'error');
  const appName = onConflict.kind === 'rename' ? onConflict.renameTo : values.get('app-name');
  const apiLevel = parseApiLevel(values.get('api-level'));
  const confirmOverwriteTarget = values.get('confirm-overwrite-target');

  assertRequired('project-path', projectPath);
  assertRequired('app-name', appName);

  const bundleName = bundleNameRaw ?? `com.example.${appName.toLowerCase()}`;

  return {
    projectPath: path.resolve(projectPath),
    appName,
    bundleName,
    apiLevel,
    templateDir: path.resolve(templateDir),
    onConflict,
    confirmOverwriteTarget: confirmOverwriteTarget ? path.resolve(confirmOverwriteTarget) : undefined,
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

const CONFLICT_OPTIONS = [
  {
    value: 'overwrite',
    label: '覆盖现有项目',
    destructive: true,
    hint: 'Re-run the script with --on-conflict overwrite after explicit user confirmation.',
  },
  {
    value: 'rename',
    label: '使用新名称重新创建',
    destructive: false,
    hint: 'Ask the user for a new app name, then re-run with --on-conflict rename:<NewName>.',
  },
  {
    value: 'cancel',
    label: '取消创建',
    destructive: false,
    hint: 'Do not run the script. Report back that the creation was cancelled.',
  },
];

function emitConflictError(targetRoot, info) {
  const payload = {
    code: 'PROJECT_EXISTS',
    message: info.isProject
      ? `A project already exists at "${targetRoot}".`
      : info.isFile
        ? `A file (not a directory) already exists at "${targetRoot}".`
        : `The directory "${targetRoot}" already exists and is not empty.`,
    targetRoot,
    isProject: !!info.isProject,
    isEmpty: !!info.isEmpty,
    isFile: !!info.isFile,
    options: CONFLICT_OPTIONS,
    hint: '检测到目标目录已存在。必须先通过 AskUserQuestion 向用户提供"覆盖 / 重命名 / 取消"三个选项后再决定如何继续。Re-run with --on-conflict overwrite AND --confirm-overwrite-target "<targetRoot>" to replace it (both flags are required), or --on-conflict rename:<NewName> to create under a different name. Never overwrite without explicit user confirmation.',
  };
  console.error(JSON.stringify(payload, null, 2));
}

function emitMissingConfirmation(targetRoot) {
  const payload = {
    code: 'OVERWRITE_CONFIRMATION_REQUIRED',
    message:
      `--on-conflict overwrite must be accompanied by --confirm-overwrite-target "${targetRoot}" matching the exact target path. ` +
      'This guard ensures the user has explicitly confirmed overwriting THIS specific directory.',
    targetRoot,
    hint: '请通过 AskUserQuestion 向用户确认是否覆盖该具体目录。确认后再以 --confirm-overwrite-target "<targetRoot>" 重新运行脚本。Do not retry overwrite without asking the user about THIS exact path.',
  };
  console.error(JSON.stringify(payload, null, 2));
}

function removeDirectory(targetRoot) {
  fs.rmSync(targetRoot, { recursive: true, force: true });
}

function runNameValidations(args) {
  const appNameValidation = validateAppName(args.appName);
  if (appNameValidation) {
    emitInvalidAppName(args.appName, appNameValidation);
    process.exit(4);
  }
  const bundleValidation = validateBundleName(args.bundleName);
  if (bundleValidation) {
    emitInvalidBundleName(args.bundleName, bundleValidation.reason);
    process.exit(5);
  }
}

function handleExistingTarget(args, targetRoot) {
  const existing = detectExistingProject(targetRoot);
  if (!existing.exists || existing.isEmpty) {
    return;
  }
  if (args.onConflict.kind === 'error') {
    emitConflictError(targetRoot, existing);
    process.exit(2);
  }
  if (args.onConflict.kind === 'overwrite') {
    if (!args.confirmOverwriteTarget || args.confirmOverwriteTarget !== targetRoot) {
      emitMissingConfirmation(targetRoot);
      process.exit(3);
    }
    removeDirectory(targetRoot);
  }
}

function applyTemplateReplacements(args, targetRoot) {
  replaceInFile(path.join(targetRoot, 'AppScope/resources/base/element/string.json'), [
    ['MyApplication', args.appName],
  ]);
  replaceInFile(path.join(targetRoot, 'AppScope/app.json5'), [
    ['com.example.myapplication', args.bundleName],
  ]);
}

function emitSuccessReport(args, targetRoot, resolved) {
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  runNameValidations(args);

  const resolved = await resolve(args);
  if (!fs.existsSync(args.templateDir)) {
    throw new Error(`Template directory not found: ${args.templateDir}`);
  }

  fs.mkdirSync(args.projectPath, { recursive: true });
  const targetRoot = path.join(args.projectPath, args.appName);
  handleExistingTarget(args, targetRoot);

  copyDirectoryContents(args.templateDir, targetRoot);
  applyTemplateReplacements(args, targetRoot);
  updateApiLevel(targetRoot, resolved.apiLevel);

  const missingFiles = verifyFiles(targetRoot);
  if (missingFiles.length > 0) {
    throw new Error(`Template copy incomplete. Missing files: ${missingFiles.join(', ')}`);
  }

  emitSuccessReport(args, targetRoot, resolved);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
