import https from "https"
import http from "http"
import { DEVECO_TMS_URL, DEVECO_PRIVACY_ID, DEVECO_TERMS_ID, KV_DEVECO_CODE_PRIVACY_ACCEPTED } from "@/cli/deveco-legal"
import { devecoAuth } from "@/plugin/deveco"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "deveco-agreement" })

// ============ Data Models ============

export enum AgreementStatus {
  COMPLIANT = "compliant",
  NEED_SIGN = "need_sign",
  NEED_RE_SIGN = "need_re_sign",
  NETWORK_ERROR = "network_error",
}

export interface SignInfo {
  isAgree: boolean
  version: number
  agrType: string
}

export interface VersionInfo {
  newestVersion: number
  agrType: string
}

export interface AgreementQueryResult {
  status: AgreementStatus
  signInfo: SignInfo | null
  versionInfo: VersionInfo | null
  error?: string
}

export interface AgreementSignResult {
  success: boolean
  isUpload: boolean
  error?: string
  refreshedToken?: boolean
}

export interface AgreementCheckResult {
  privacyStatus: AgreementStatus
  termsStatus: AgreementStatus
  overallStatus: AgreementStatus
  canEnter: boolean
  hasLocalCache: boolean
}

// ============ TMS HTTP Request ============

const SESSION_TIMEOUT = "SESSION_TIMEOUT"
const INVALID_SESSION = "INVALID_SESSION"
const KEY_ERROR = "error"
const ERROR_CODE = "errorCode"

interface TmsRequestBody {
  nsp_svc: string
  access_token: string
  request: string
}

async function tmsPost(body: TmsRequestBody): Promise<string> {
  const parsedUrl = new URL(DEVECO_TMS_URL)
  const isHttps = parsedUrl.protocol === "https:"
  const httpModule = isHttps ? https : http

  const requestBody = JSON.stringify(body)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Content-Length": String(Buffer.byteLength(requestBody)),
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "accept-language": "zh-CN",
  }

  return new Promise((resolve, reject) => {
    const options: http.RequestOptions | https.RequestOptions = {
      method: "POST",
      headers,
      timeout: 20000,
    }

    const req = httpModule.request(DEVECO_TMS_URL, options, (res) => {
      let data = ""
      res.on("data", (chunk: Buffer | string) => {
        data += chunk
      })
      res.on("end", () => {
        resolve(data)
      })
    })

    req.on("error", (err: Error) => {
      reject(err)
    })
    req.on("timeout", () => {
      req.destroy()
      reject(new Error("TMS request timeout"))
    })

    req.write(requestBody)
    req.end()
  })
}

// ============ Session Timeout Retry ============

async function handleSessionTimeoutAndRetry<T>(
  rawResponse: string,
  retryApiCall: (accessToken: string) => Promise<string>,
  accessToken: string,
  parseResponse: (raw: string) => T,
): Promise<{ result: T; refreshedToken: boolean }> {
  let resJson: Record<string, unknown>
  try {
    resJson = JSON.parse(rawResponse) as Record<string, unknown>
  } catch {
    return { result: parseResponse(rawResponse), refreshedToken: false }
  }

  if (resJson[KEY_ERROR] === SESSION_TIMEOUT || resJson[KEY_ERROR] === INVALID_SESSION) {
    log.info("session timeout detected, refreshing token")
    const newTokens = await devecoAuth.refreshToken()
    if (!newTokens?.accessToken) {
      log.warn("token refresh failed, cannot retry")
      return { result: parseResponse(rawResponse), refreshedToken: false }
    }

    const retryRaw = await retryApiCall(newTokens.accessToken)
    return { result: parseResponse(retryRaw), refreshedToken: true }
  }

  return { result: parseResponse(rawResponse), refreshedToken: false }
}

// ============ AgreementService ============

class AgreementService {
  /**
   * 查询单个协议的签署状态
   */
  async queryAgreement(accessToken: string, agrId: string): Promise<AgreementQueryResult> {
    const requestBody: string = JSON.stringify({
      obtainVersion: true,
      agrInfo: [
        {
          agrType: agrId,
          country: "CN",
          signType: 0,
          branchId: 0,
        },
      ],
    })

    const tmsBody: TmsRequestBody = {
      nsp_svc: "as.user.query",
      access_token: accessToken,
      request: requestBody,
    }

    try {
      const rawResponse = await tmsPost(tmsBody)

      const { result } = await handleSessionTimeoutAndRetry(
        rawResponse,
        async (newToken: string) => {
          const retryBody: TmsRequestBody = {
            nsp_svc: "as.user.query",
            access_token: newToken,
            request: requestBody,
          }
          return tmsPost(retryBody)
        },
        accessToken,
        (raw: string) => this.parseQueryResponse(raw),
      )

      return result
    } catch (err) {
      log.warn(`query agreement exception: ${err instanceof Error ? err.message : String(err)}`)
      return {
        status: AgreementStatus.NETWORK_ERROR,
        signInfo: null,
        versionInfo: null,
        error: err instanceof Error ? err.message : "Network error",
      }
    }
  }

  private parseQueryResponse(raw: string): AgreementQueryResult {
    try {
      const resJson = JSON.parse(raw) as Record<string, unknown>

      if (resJson[KEY_ERROR] === SESSION_TIMEOUT || resJson[KEY_ERROR] === INVALID_SESSION) {
        return {
          status: AgreementStatus.NEED_SIGN,
          signInfo: null,
          versionInfo: null,
          error: resJson[KEY_ERROR] as string,
        }
      }

      const errorCode = resJson[ERROR_CODE] as number | undefined
      if (errorCode === 0) {
        const signArr = resJson.signInfo as Array<Record<string, unknown>> | undefined
        if (!signArr || signArr.length === 0) {
          return {
            status: AgreementStatus.NEED_SIGN,
            signInfo: null,
            versionInfo: null,
          }
        }

        const firstSign = signArr[0]
        const isAgree = firstSign.isAgree as boolean
        if (!isAgree) {
          return {
            status: AgreementStatus.NEED_SIGN,
            signInfo: {
              isAgree: false,
              version: (firstSign.version as number) ?? 0,
              agrType: (firstSign.agrType as string) ?? "",
            },
            versionInfo: null,
          }
        }

        const versionArr = resJson.versionInfo as Array<Record<string, unknown>> | undefined
        if (!versionArr || versionArr.length === 0) {
          return {
            status: AgreementStatus.COMPLIANT,
            signInfo: {
              isAgree: true,
              version: (firstSign.version as number) ?? 0,
              agrType: (firstSign.agrType as string) ?? "",
            },
            versionInfo: null,
          }
        }

        const firstVersion = versionArr[0]
        const newestVersion = firstVersion.newestVersion as number
        const signedVersion = firstSign.version as number

        const signInfo: SignInfo = {
          isAgree: true,
          version: signedVersion,
          agrType: (firstSign.agrType as string) ?? "",
        }
        const versionInfo: VersionInfo = {
          newestVersion,
          agrType: (firstVersion.agrType as string) ?? "",
        }

        if (compareAgreementVersion(newestVersion, signedVersion)) {
          return { status: AgreementStatus.COMPLIANT, signInfo, versionInfo }
        } else {
          return { status: AgreementStatus.NEED_RE_SIGN, signInfo, versionInfo }
        }
      }

      return {
        status: AgreementStatus.NEED_SIGN,
        signInfo: null,
        versionInfo: null,
        error: `errorCode=${errorCode}`,
      }
    } catch {
      return {
        status: AgreementStatus.NEED_SIGN,
        signInfo: null,
        versionInfo: null,
        error: "Failed to parse query response",
      }
    }
  }

  /**
   * 签署两个协议（隐私+用户协议）
   */
  async signAgreement(accessToken: string, isRetry: boolean): Promise<AgreementSignResult> {
    const requestBody: string = JSON.stringify({
      signInfo: [
        {
          agrType: DEVECO_PRIVACY_ID,
          country: "CN",
          language: "zh_CN",
          isAgree: true,
        },
        {
          agrType: DEVECO_TERMS_ID,
          country: "CN",
          language: "zh_CN",
          isAgree: true,
        },
      ],
    })

    const tmsBody: TmsRequestBody = {
      nsp_svc: "as.user.sign",
      access_token: accessToken,
      request: requestBody,
    }

    try {
      const rawResponse = await tmsPost(tmsBody)

      const { result, refreshedToken } = await handleSessionTimeoutAndRetry(
        rawResponse,
        async (newToken: string) => {
          const retryBody: TmsRequestBody = {
            nsp_svc: "as.user.sign",
            access_token: newToken,
            request: requestBody,
          }
          return tmsPost(retryBody)
        },
        accessToken,
        (raw: string) => this.parseSignResponse(raw),
      )

      return { ...result, refreshedToken }
    } catch (err) {
      log.warn(`sign agreement exception: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        isUpload: false,
        error: err instanceof Error ? err.message : "Network error",
      }
    }
  }

  private parseSignResponse(raw: string): AgreementSignResult {
    try {
      const resJson = JSON.parse(raw) as Record<string, unknown>

      if (resJson[KEY_ERROR] === SESSION_TIMEOUT || resJson[KEY_ERROR] === INVALID_SESSION) {
        return {
          success: false,
          isUpload: false,
          error: resJson[KEY_ERROR] as string,
        }
      }

      const errorCode = resJson[ERROR_CODE] as number | undefined
      if (errorCode === 0) {
        return { success: true, isUpload: true }
      }

      return {
        success: false,
        isUpload: false,
        error: `errorCode=${errorCode}`,
      }
    } catch {
      return {
        success: false,
        isUpload: false,
        error: "Failed to parse sign response",
      }
    }
  }

  /**
   * 综合检查两个协议的签署状态
   */
  async checkAllAgreements(
    accessToken: string,
    kvStore: { get: (key: string, defaultValue: unknown) => unknown },
  ): Promise<AgreementCheckResult> {
    const privacyResult = await this.queryAgreement(accessToken, DEVECO_PRIVACY_ID)
    const termsResult = await this.queryAgreement(accessToken, DEVECO_TERMS_ID)

    const privacyStatus = privacyResult.status
    const termsStatus = termsResult.status

    const hasLocalCache = kvStore.get(KV_DEVECO_CODE_PRIVACY_ACCEPTED, false) === true

    // Both COMPLIANT → can enter
    if (privacyStatus === AgreementStatus.COMPLIANT && termsStatus === AgreementStatus.COMPLIANT) {
      return {
        privacyStatus,
        termsStatus,
        overallStatus: AgreementStatus.COMPLIANT,
        canEnter: true,
        hasLocalCache,
      }
    }

    // Both NETWORK_ERROR → check local cache for fallback
    if (privacyStatus === AgreementStatus.NETWORK_ERROR && termsStatus === AgreementStatus.NETWORK_ERROR) {
      return {
        privacyStatus,
        termsStatus,
        overallStatus: AgreementStatus.NETWORK_ERROR,
        canEnter: hasLocalCache,
        hasLocalCache,
      }
    }

    // Any NEED_SIGN / NEED_RE_SIGN → cannot enter
    const anyNeedSign =
      privacyStatus === AgreementStatus.NEED_SIGN || termsStatus === AgreementStatus.NEED_SIGN ||
      privacyStatus === AgreementStatus.NEED_RE_SIGN || termsStatus === AgreementStatus.NEED_RE_SIGN

    if (anyNeedSign) {
      const overallStatus = (privacyStatus === AgreementStatus.NEED_RE_SIGN || termsStatus === AgreementStatus.NEED_RE_SIGN)
        ? AgreementStatus.NEED_RE_SIGN
        : AgreementStatus.NEED_SIGN
      return {
        privacyStatus,
        termsStatus,
        overallStatus,
        canEnter: false,
        hasLocalCache,
      }
    }

    // Mixed: one NETWORK_ERROR, one COMPLIANT → fallback to local cache
    const anyNetworkError =
      privacyStatus === AgreementStatus.NETWORK_ERROR || termsStatus === AgreementStatus.NETWORK_ERROR

    if (anyNetworkError) {
      return {
        privacyStatus,
        termsStatus,
        overallStatus: AgreementStatus.NETWORK_ERROR,
        canEnter: hasLocalCache,
        hasLocalCache,
      }
    }

    // Default: treat as need sign
    return {
      privacyStatus,
      termsStatus,
      overallStatus: AgreementStatus.NEED_SIGN,
      canEnter: false,
      hasLocalCache,
    }
  }
}

// ============ Version Comparison ============

function compareAgreementVersion(newestVersion: number, signedVersion: number): boolean {
  return signedVersion >= newestVersion
}

// ============ Export ============

export const agreementService = new AgreementService()
export { compareAgreementVersion }