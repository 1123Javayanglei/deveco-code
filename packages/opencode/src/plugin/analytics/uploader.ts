import fs from "fs"
import path from "path"
import type { AnalyticsEvent, AnalyticsConfig, HuaweiTracePayload } from "./types"
import { DEFAULT_CONFIG } from "./types"
import { appendPendingEvent, clearPendingEvents, getPendingEvents } from "./storage"
import { codegenieAuth, ACCESS_TOKEN_EXPIRES_MS, saveAuthToDisk } from "../codegenie"
import { Global } from "@/global"

const ANALYTICS_DIR = path.join(Global.Path.data, "analytics", "log")
const LOG_FILE = path.join(ANALYTICS_DIR, "analytics.log")

interface UploadResult {
  success: boolean
  error?: string
}

interface AuthInfo {
  type: string
  access?: string
  refresh?: string
  expires?: number
  key?: string
}

function readAuthFromDisk(providerID: string): AuthInfo | undefined {
  try {
    const authFilePath = path.join(Global.Path.data, "auth.json")
    if (!fs.existsSync(authFilePath)) return undefined
    const data = JSON.parse(fs.readFileSync(authFilePath, "utf8"))
    return data[providerID]
  } catch {
    return undefined
  }
}

export class AnalyticsUploader {
  private config: AnalyticsConfig
  private eventQueue: AnalyticsEvent[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private isUploading = false
  private retryCount = 0

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async restorePending(): Promise<void> {
    await this.writeLog("[DEBUG] restorePending() called")
    try {
      const pending = await getPendingEvents()
      if (pending.length > 0) {
        this.eventQueue = pending as AnalyticsEvent[]
        await this.writeLog(`[DEBUG] Restored ${pending.length} pending events from disk`)
      } else {
        await this.writeLog("[DEBUG] No pending events to restore")
      }
    } catch (err) {
      await this.writeLog(`[DEBUG] Failed to restore pending events: ${err}`)
    }
  }

  private transformEvent(event: AnalyticsEvent): HuaweiTracePayload {
    return {
      action: event.sourceType,
      countryCode: "CN",
      detail: JSON.stringify(event),
      osArch: event.os_name,
      sid: 10200,
      timestamp: Date.now(),
      uid: event.uid,
      version: event.sourceVersion,
    }
  }

  private async writeLog(message: string): Promise<void> {
    try {
      fs.mkdirSync(ANALYTICS_DIR, { recursive: true })
      const timestamp = new Date().toISOString()
      const line = `[${timestamp}] ${message}\n`
      fs.appendFileSync(LOG_FILE, line, "utf-8")
    } catch {
      // ignore log errors
    }
  }

  async upload(event: AnalyticsEvent): Promise<boolean> {
    await this.writeLog(`[DEBUG] upload() called, enabled=${this.config.enabled}, sessionId=${event.sessionid}`)

    if (!this.config.enabled) {
      await this.writeLog("[DEBUG] Analytics disabled, skipping event")
      return false
    }

    try {
      await appendPendingEvent(event)
      await this.writeLog("[DEBUG] Event persisted to disk")
    } catch (err) {
      await this.writeLog(`[DEBUG] Failed to persist event to disk: ${err}`)
    }

    this.eventQueue.push(event)
    await this.writeLog(`[DEBUG] Event added to queue, queueLength=${this.eventQueue.length}, batchSize=${this.config.batchSize}`)

    if (this.eventQueue.length > this.config.maxQueueSize) {
      const dropped = this.eventQueue.length - this.config.maxQueueSize
      this.eventQueue = this.eventQueue.slice(-this.config.maxQueueSize)
      await this.writeLog(`[DEBUG] Queue full, dropped ${dropped} old events`)
    }

    if (this.eventQueue.length >= this.config.batchSize) {
      await this.writeLog("[DEBUG] Batch size reached, triggering flush")
      await this.flush()
    }

    return true
  }

  async flush(): Promise<UploadResult> {
    await this.writeLog(`[DEBUG] flush() called, isUploading=${this.isUploading}, queueLength=${this.eventQueue.length}`)

    if (this.isUploading || this.eventQueue.length === 0) {
      return { success: true }
    }

    const authInfo = readAuthFromDisk("codegenie")

    let authToken = ""
    let tokenExpires = 0
    let refreshToken = ""

    if (authInfo?.type === "oauth") {
      authToken = authInfo.access || ""
      tokenExpires = authInfo.expires || 0
      refreshToken = authInfo.refresh || ""
    } else if (authInfo?.type === "api") {
      authToken = authInfo.key || ""
    }

    await this.writeLog(`[DEBUG] Auth check: hasAuthInfo=${!!authInfo}, authType=${authInfo?.type}, hasToken=${!!authToken}, tokenPreview=${authToken ? authToken.substring(0, 20) + "..." : "N/A"}, expires=${tokenExpires ? new Date(tokenExpires).toISOString() : "N/A"}`)

    if (!authToken) {
      await this.writeLog("[DEBUG] No Huawei auth token, skipping upload")
      this.eventQueue = []
      this.retryCount = 0
      await clearPendingEvents().catch(() => {})
      return { success: true }
    }

    if (tokenExpires && Date.now() >= tokenExpires) {
      await this.writeLog(`[DEBUG] Token expired at ${new Date(tokenExpires).toISOString()}, attempting refresh...`)

      if (refreshToken) {
        const newTokens = await codegenieAuth.refreshToken()
        if (newTokens) {
          await this.writeLog("[DEBUG] Token refresh successful, updating auth storage...")
          await saveAuthToDisk("codegenie", {
            type: "oauth",
            access: newTokens.accessToken,
            refresh: newTokens.refreshToken,
            expires: Date.now() + ACCESS_TOKEN_EXPIRES_MS,
          })
          authToken = newTokens.accessToken
        } else {
          await this.writeLog("[DEBUG] Token refresh failed, skipping upload")
          this.eventQueue = []
          this.retryCount = 0
          await clearPendingEvents().catch(() => {})
          return { success: true }
        }
      } else {
        await this.writeLog("[DEBUG] No refresh token available, skipping upload")
        this.eventQueue = []
        this.retryCount = 0
        await clearPendingEvents().catch(() => {})
        return { success: true }
      }
    }

    this.isUploading = true

    try {
      const events = [...this.eventQueue]
      const payload = events.map((e) => this.transformEvent(e))

      await this.writeLog(`[DEBUG] Preparing to upload ${events.length} events to ${this.config.endpoint}`)
      await this.writeLog(`[DEBUG] Payload preview (first event): ${JSON.stringify(payload[0]).substring(0, 500)}...`)

      const requestBody = JSON.stringify(payload)
      await this.writeLog(`[DEBUG] Request body length: ${requestBody.length} bytes`)

      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        authorization: authToken,
      }

      await this.writeLog(`[DEBUG] Request headers: Content-Type=application/json, authorization=${authToken.substring(0, 20)}...`)

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: requestBody,
      })

      const responseStatus = response.status
      const responseStatusText = response.statusText
      const responseText = await response.text()

      await this.writeLog(`========== UPLOAD RESPONSE ==========`)
      await this.writeLog(`  Endpoint:  ${this.config.endpoint}`)
      await this.writeLog(`  Status:    ${responseStatus} ${responseStatusText}`)
      await this.writeLog(`  Body:      ${responseText.substring(0, 2000)}`)
      await this.writeLog(`=====================================`)

      if (!response.ok) {
        await this.writeLog(`[DEBUG] Upload failed: HTTP ${responseStatus} - ${responseText}`)

        this.retryCount++
        if (this.retryCount > this.config.maxRetries) {
          await this.writeLog(`[DEBUG] Max retries (${this.config.maxRetries}) exceeded, discarding ${this.eventQueue.length} events`)
          this.eventQueue = []
          this.retryCount = 0
          await clearPendingEvents().catch(() => {})
        }

        return { success: false, error: `HTTP ${response.status}` }
      }

      await this.writeLog(`[DEBUG] Successfully uploaded ${events.length} events`)
      this.eventQueue = []
      this.retryCount = 0
      await clearPendingEvents()

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : "N/A"
      await this.writeLog(`[DEBUG] Upload error: ${errorMessage}`)
      await this.writeLog(`[DEBUG] Error stack: ${errorStack}`)

      this.retryCount++
      if (this.retryCount > this.config.maxRetries) {
        await this.writeLog(`[DEBUG] Max retries (${this.config.maxRetries}) exceeded, discarding ${this.eventQueue.length} events`)
        this.eventQueue = []
        this.retryCount = 0
        await clearPendingEvents().catch(() => {})
      }

      return { success: false, error: errorMessage }
    } finally {
      this.isUploading = false
      await this.writeLog(`[DEBUG] flush() completed, isUploading=${this.isUploading}`)
    }
  }

  getQueueLength(): number {
    return this.eventQueue.length
  }

  clearQueue(): void {
    this.eventQueue = []
    this.retryCount = 0
  }

  startPeriodicFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = setInterval(() => {
      this.writeLog("[DEBUG] Periodic flush triggered").catch(() => {})
      this.flush().catch((err) => this.writeLog(`[DEBUG] Periodic flush error: ${err}`))
    }, this.config.flushInterval)
    this.writeLog(`[DEBUG] Started periodic flush timer, interval=${this.config.flushInterval}ms`).catch(() => {})
  }

  stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
      this.writeLog("[DEBUG] Stopped periodic flush timer").catch(() => {})
    }
  }

  async shutdown(): Promise<void> {
    await this.writeLog(`[DEBUG] shutdown() called, queueLength=${this.eventQueue.length}`)
    this.stopPeriodicFlush()
    if (this.eventQueue.length > 0) {
      await this.writeLog("[DEBUG] Performing final flush before shutdown")
      await this.flush()
    }
  }
}

export const globalUploader = new AnalyticsUploader()

export async function uploadAnalyticsEvent(event: AnalyticsEvent): Promise<boolean> {
  return globalUploader.upload(event)
}

export async function flushAnalyticsEvents(): Promise<UploadResult> {
  return globalUploader.flush()
}

export function clearAnalyticsQueue(): void {
  globalUploader.clearQueue()
}
