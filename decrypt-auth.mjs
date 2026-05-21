#!/usr/bin/env node
/**
 * 解密 auth.json 中加密存储的 accessToken 并输出明文
 *
 * 加密机制: AES-256-GCM 两层密钥体系
 *   KEK (root key) → 解封 DEK (token.dek) → 解密 ciphertext
 *
 * 用法: node decrypt-auth.mjs [auth.json路径] [config目录路径]
 *   默认 auth.json 路径: ~/.local/share/deveco/auth.json
 *   默认 config 目录路径: ~/.config/deveco
 */

import fs from "fs"
import path from "path"
import os from "os"
import crypto from "crypto"

// ---------- 路径解析 ----------

const homeDir = os.homedir()
const defaultDataDir = path.join(homeDir, ".local", "share", "deveco")
const defaultConfigDir = path.join(homeDir, ".config", "deveco")

const authFilePath = process.argv[2] || path.join(defaultDataDir, "auth.json")
const configDir = process.argv[3] || defaultConfigDir
const keyDirPath = path.join(configDir, "keys")
const wrappedDekPath = path.join(configDir, "token.dek")

// ---------- 常量 ----------

const algorithm = "aes-256-gcm"
const kekLength = 32
const dekLength = 32

// ---------- KEK 加载 ----------

function loadRootKey(keyId) {
  const filePath = path.join(keyDirPath, `${keyId}.bin`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`根密钥文件不存在: ${filePath}`)
  }
  const key = fs.readFileSync(filePath)
  if (key.length !== kekLength) {
    throw new Error(`根密钥长度异常: ${key.length} (期望 ${kekLength})`)
  }
  return key
}

// ---------- DEK 解封 ----------

function unwrapDek(wrapped) {
  const kek = loadRootKey(wrapped.kekId)
  const iv = Buffer.from(wrapped.iv, "base64")
  const authTag = Buffer.from(wrapped.authTag, "base64")
  const encryptedDek = Buffer.from(wrapped.encryptedDek, "base64")
  const decipher = crypto.createDecipheriv(algorithm, kek, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encryptedDek), decipher.final()])
}

function loadDek() {
  if (!fs.existsSync(wrappedDekPath)) {
    throw new Error(`DEK 文件不存在: ${wrappedDekPath}`)
  }
  const wrapped = JSON.parse(fs.readFileSync(wrappedDekPath, "utf8"))
  const dek = unwrapDek(wrapped)
  if (dek.length !== dekLength) {
    throw new Error(`DEK 长度异常: ${dek.length} (期望 ${dekLength})`)
  }
  return dek
}

// ---------- 数据解密 ----------

const SENSITIVE_AUTH_KEYS = new Set(["access", "refresh", "key", "token"])

function isEncryptedBlob(value) {
  if (!value || typeof value !== "object") return false
  return (
    value.algorithm === "aes-256-gcm" &&
    typeof value.ciphertext === "string" &&
    typeof value.iv === "string" &&
    typeof value.authTag === "string"
  )
}

function decryptBlob(blob, dek) {
  const iv = Buffer.from(blob.iv, "base64")
  const authTag = Buffer.from(blob.authTag, "base64")
  const ciphertext = Buffer.from(blob.ciphertext, "base64")
  const decipher = crypto.createDecipheriv(algorithm, dek, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

function decryptAuthRecord(record, dek) {
  const result = {}
  for (const [field, value] of Object.entries(record)) {
    if (!SENSITIVE_AUTH_KEYS.has(field)) {
      result[field] = value
      continue
    }
    if (!isEncryptedBlob(value)) {
      result[field] = value
      continue
    }
    try {
      result[field] = decryptBlob(value, dek)
    } catch {
      result[field] = "[解密失败]"
    }
  }
  return result
}

// ---------- 主流程 ----------

function main() {
  // 1. 加载 auth.json
  if (!fs.existsSync(authFilePath)) {
    console.error(`错误: auth.json 不存在: ${authFilePath}`)
    process.exit(1)
  }
  const authData = JSON.parse(fs.readFileSync(authFilePath, "utf8"))

  // 2. 加载 DEK
  const dek = loadDek()

  // 3. 解密所有 provider 记录
  const decrypted = {}
  for (const [provider, info] of Object.entries(authData)) {
    if (!info || typeof info !== "object") {
      decrypted[provider] = info
      continue
    }
    decrypted[provider] = decryptAuthRecord(info, dek)
  }

  // 4. 输出结果
  console.log("=== auth.json 解密结果 ===")
  for (const [provider, info] of Object.entries(decrypted)) {
    console.log(`\n[provider: ${provider}]`)
    for (const [field, value] of Object.entries(info)) {
      const displayValue = typeof value === "string" && value.length > 60
        ? value.substring(0, 60) + "..."
        : value
      console.log(`  ${field}: ${displayValue}`)
    }
  }

  // 5. 特别输出 deveco 的 accessToken (完整)
  if (decrypted.deveco && decrypted.deveco.access) {
    console.log("\n=== deveco accessToken (完整) ===")
    console.log(decrypted.deveco.access)
  }
}

main()