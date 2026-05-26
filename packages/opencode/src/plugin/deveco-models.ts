import { Schema } from "effect"
import { Model as ModelSchema, type Info as ProviderInfo } from "../config/provider"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import * as Log from "@opencode-ai/core/util/log"

type Model = Schema.Schema.Type<typeof ModelSchema>
type ModelsMap = Record<string, Model>

// ============ Constants ============

const DEVECO_BASE_URL = "https://cn.devecostudio.huawei.com"

// ============ Default (fallback) config ============

export const DEVECO_DEFAULT_PROVIDER_CONFIG: ProviderInfo = {
  name: "DevEco Code",
  npm: "@ai-sdk/openai-compatible",
  api: `${DEVECO_BASE_URL}/sse/codeGenie/maas/v2`,
  env: [],
  models: {
    "glm-5": {
      name: "glm-5",
      reasoning: true,
      tool_call: true,
      limit: { context: 202752, output: 131072 },
    },
    "deepseek-v3.2": {
      name: "deepseek-v3.2",
      tool_call: true,
      limit: { context: 131072, output: 65536 },
    },
  },
}

// ============ Backward-compatible alias ============

/** @deprecated Use getDevecoProviderConfig() for dynamic model fetching */
export const DEVECO_PROVIDER_CONFIG = DEVECO_DEFAULT_PROVIDER_CONFIG

// ============ API response schema ============

const ModelConfigSchema = Schema.Struct({
  id: Schema.Number,
  model_id: Schema.String,
  thinking_mode: Schema.optional(Schema.String),
  input_modalities: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  context_window: Schema.optional(Schema.Number),
  output: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  tool_choice: Schema.optional(Schema.String),
  tool_call_mode: Schema.optional(Schema.String),
})

const InnerModelSchema = Schema.Struct({
  protocol: Schema.String,
  group_name: Schema.String,
  group_name_cn: Schema.optional(Schema.String),
  model_configs: Schema.Array(ModelConfigSchema),
})

const ApiResponseSchema = Schema.Struct({
  code: Schema.Number,
  body: Schema.Struct({
    version: Schema.optional(Schema.Number),
    small_model: Schema.optional(Schema.String),
    inner_models: Schema.Array(InnerModelSchema),
  }),
})

const decodeResponse = Schema.decodeUnknownSync(ApiResponseSchema)

// ============ Static provider fields ============

const STATIC_PROVIDER_FIELDS = {
  name: "DevEco Code",
  npm: "@ai-sdk/openai-compatible",
  api: `${DEVECO_BASE_URL}/sse/codeGenie/maas/v2`,
  env: [] as string[],
}

const DEVECO_DEFAULT_SMALL_MODEL = "deepseek-v3.2"

// ============ Cache ============

let cachedConfig: ProviderInfo | null = null
let cachedSmallModel: string | null = null

// ============ Mapping logic ============

function parseOutputLimit(output: string | number | undefined): number | undefined {
  if (output == null) return undefined
  if (typeof output === "number") return output
  const num = parseInt(output, 10)
  return isNaN(num) ? undefined : num
}

function mapModelConfigToInternal(config: Schema.Schema.Type<typeof ModelConfigSchema>): ModelsMap {
  const key = config.model_id

  const limit: { context?: number; output?: number } = {}
  if (config.context_window) {
    limit.context = config.context_window
  }
  const outputLimit = parseOutputLimit(config.output)
  if (outputLimit) {
    limit.output = outputLimit
  }

  const model = {
    name: key,
    ...(config.thinking_mode === "on" ? { reasoning: true } : {}),
    ...(config.tool_call_mode === "tool_calls" ? { tool_call: true } : {}),
    ...(Object.keys(limit).length > 0 ? { limit } : {}),
    ...(config.input_modalities && config.input_modalities.length > 0
      ? { modalities: { input: config.input_modalities } }
      : {}),
  } as Model

  return { [key]: model }
}

// ============ API fetch ============

const API_ENDPOINT = `${DEVECO_BASE_URL}/codeGenie/modelConfig?localVersion=0&pluginVersion=CLI.${InstallationVersion}`

async function fetchModelsFromAPI(accessToken: string): Promise<{ models: ModelsMap; smallModel: string | undefined }> {
  log.info("Fetching models from API", {
    url: API_ENDPOINT,
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken.substring(0, 10)}...`,
      "Content-Type": "application/json",
    },
  })

  const response = await fetch(API_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(5000),
  })

  log.info("API response", {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    log.error("API request failed", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      body,
    })
    throw new Error(`API returned ${response.status}: ${body}`)
  }

  const raw = await response.json()
  log.info("API response body", { body: JSON.stringify(raw).substring(0, 2000) })
  const data = decodeResponse(raw)

  if (data.code !== 200) {
    throw new Error(`API returned code ${data.code}`)
  }

  const models: ModelsMap = {}

  for (const group of data.body.inner_models) {
    for (const config of group.model_configs) {
      const mapped = mapModelConfigToInternal(config)
      Object.assign(models, mapped)
    }
  }

  log.info("Assembled models config", { models: JSON.stringify(models, null, 2) })

  return { models, smallModel: data.body.small_model } as { models: ModelsMap; smallModel: string | undefined }
}

// ============ Public API ============

const log = Log.create({ service: "deveco-models" })

export async function getDevecoProviderConfig(accessToken: string): Promise<ProviderInfo> {
  // Return cached config if already fetched
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    const { models, smallModel } = await fetchModelsFromAPI(accessToken)

    // If API returns empty models, fall back to defaults
    if (!models || Object.keys(models).length === 0) {
      log.warn("API returned empty models, using defaults")
      cachedSmallModel = DEVECO_DEFAULT_SMALL_MODEL
      return DEVECO_DEFAULT_PROVIDER_CONFIG
    }

    const config: ProviderInfo = {
      ...STATIC_PROVIDER_FIELDS,
      models,
    }

    cachedConfig = config

    if (smallModel) {
      cachedSmallModel = smallModel
      log.info("Small model from API", { smallModel })
    }

    return config
  } catch (err) {
    log.warn("Failed to fetch models from API, using defaults", { error: String(err) })
    cachedSmallModel = DEVECO_DEFAULT_SMALL_MODEL
    return DEVECO_DEFAULT_PROVIDER_CONFIG
  }
}

export async function getSmallModel(accessToken: string): Promise<string | undefined> {
  // Trigger a fetch if not yet cached
  if (!cachedSmallModel) {
    await getDevecoProviderConfig(accessToken).catch(() => {})
  }
  return cachedSmallModel ?? undefined
}
