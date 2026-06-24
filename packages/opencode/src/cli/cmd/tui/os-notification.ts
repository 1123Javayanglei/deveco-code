import { execFile } from "node:child_process"
import { platform as osPlatform } from "node:os"
import { which } from "@/util/which"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "tui.os-notification" })

type Platform = "darwin" | "win32" | "unsupported"

function detectPlatform(): Platform {
  const detected = osPlatform()
  if (detected === "darwin" || detected === "win32") return detected
  return "unsupported"
}

function createCommandFinder(commandName: string): () => string | null {
  let cached: string | null | undefined

  return () => {
    if (cached !== undefined) return cached
    try {
      cached = which(commandName)
    } catch {
      cached = null
    }
    return cached
  }
}

function escapeAppleScriptText(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function escapePowerShellSingleQuotedText(input: string): string {
  return input.replace(/'/g, "''")
}

function buildWindowsToastScript(title: string, message: string): string {
  const psTitle = escapePowerShellSingleQuotedText(title)
  const psMessage = escapePowerShellSingleQuotedText(message)

  return `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$Template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$RawXml = [xml] $Template.GetXml()
($RawXml.toast.visual.binding.text | Where-Object {$_.id -eq '1'}).AppendChild($RawXml.CreateTextNode('${psTitle}')) | Out-Null
($RawXml.toast.visual.binding.text | Where-Object {$_.id -eq '2'}).AppendChild($RawXml.CreateTextNode('${psMessage}')) | Out-Null
$SerializedXml = New-Object Windows.Data.Xml.Dom.XmlDocument
$SerializedXml.LoadXml($RawXml.OuterXml)
$Toast = [Windows.UI.Notifications.ToastNotification]::new($SerializedXml)
$Notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('DevEcoCode')
$Notifier.Show($Toast)
`.trim().replace(/\n/g, "; ")
}

const getCmuxPath = createCommandFinder("cmux")
const getOsascriptPath = createCommandFinder("osascript")
const getTerminalNotifierPath = createCommandFinder("terminal-notifier")
const getPowershellPath = createCommandFinder("powershell")

function runCommand(commandPath: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(commandPath, [...args], { windowsHide: true, timeout: 5000 }, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function sendMacos(title: string, message: string): Promise<void> {
  const cmuxPath = getCmuxPath()
  if (cmuxPath) {
    try {
      await runCommand(cmuxPath, ["notify", "--title", title, "--body", message])
      return
    } catch (error) {
      log.debug("cmux notify failed, trying terminal-notifier", { error })
    }
  }

  const terminalNotifierPath = getTerminalNotifierPath()
  if (terminalNotifierPath) {
    const bundleId = process.env.__CFBundleIdentifier
    const args = bundleId
      ? ["-title", title, "-message", message, "-activate", bundleId]
      : ["-title", title, "-message", message]
    try {
      await runCommand(terminalNotifierPath, args)
      return
    } catch (error) {
      log.debug("terminal-notifier failed, trying osascript", { error })
    }
  }

  const osascriptPath = getOsascriptPath()
  if (!osascriptPath) return

  const escapedTitle = escapeAppleScriptText(title)
  const escapedMessage = escapeAppleScriptText(message)
  const appleScript = `display notification "${escapedMessage}" with title "${escapedTitle}"`
  await runCommand(osascriptPath, ["-e", appleScript])
}

async function sendWindows(title: string, message: string): Promise<void> {
  const powershellPath = getPowershellPath()
  if (!powershellPath) return

  const toastScript = buildWindowsToastScript(title, message)
  await runCommand(powershellPath, ["-Command", toastScript])
}

export interface OsNotification {
  send(title: string, message: string): void
  dispose(): void
}

export function createOsNotification(): OsNotification {
  const currentPlatform = detectPlatform()
  let disposed = false

  // Warm up command path cache on init
  if (currentPlatform === "darwin") {
    getCmuxPath()
    getOsascriptPath()
    getTerminalNotifierPath()
  } else if (currentPlatform === "win32") {
    getPowershellPath()
  }

  return {
    send(title: string, message: string) {
      if (disposed || currentPlatform === "unsupported") return

      const sendFn = currentPlatform === "darwin" ? sendMacos : sendWindows
      sendFn(title, message).catch((error) => {
        log.debug("OS notification failed", { error })
      })
    },
    dispose() {
      disposed = true
    },
  }
}
