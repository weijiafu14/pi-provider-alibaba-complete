/**
 * Pi provider plugin for Alibaba Cloud DashScope.
 *
 * Registers OpenAI-compatible providers for:
 *   - Coding Plan (international + Chinese)
 *   - Token Plan (international + Chinese)
 *   - API / Pay-as-you-go (international + Chinese)
 *
 * Uses the documented `createProvider` API so each provider supports dynamic
 * model discovery via /v1/models, with static fallbacks when discovery fails.
 *
 * Auth: resolved via `envApiKeyAuth` so stored credentials from /login take
 * precedence, falling back to the configured environment variables.
 *
 * Usage:
 *   export ALIBABA_CODING_API_KEY="..."
 *   export ALIBABA_TOKEN_PLAN_API_KEY="..."
 *   export ALIBABA_API_KEY="..."
 *   pi -e /path/to/pi-provider-alibaba
 *   # then /model -> alibaba-coding-intl/qwen3-8b ...
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  createProvider,
  envApiKeyAuth,
  openAICompletionsApi,
  type Model,
  type RefreshModelsContext,
} from "@earendil-works/pi-ai/compat";

const API = "openai-completions" as const;

// ── Coding Plan ──────────────────────────────────────────────────────────────

const CODING_INTL_BASE_URL = "https://coding-intl.dashscope.aliyuncs.com/v1";
const CODING_CN_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1";

const CODING_FALLBACK_MODELS: Array<Pick<
  Model<typeof API>,
  "id" | "name" | "reasoning" | "input" | "cost" | "contextWindow" | "maxTokens"
>> = [
  {
    id: "qwen3-8b",
    name: "Qwen3 8B (Coding)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "qwen3-14b",
    name: "Qwen3 14B (Coding)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "qwen3-32b",
    name: "Qwen3 32B (Coding)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
];

// ── Token Plan ───────────────────────────────────────────────────────────────

const TOKEN_INTL_BASE_URL =
  "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";
const TOKEN_CN_BASE_URL =
  "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1";

const TOKEN_FALLBACK_MODELS: Array<Pick<
  Model<typeof API>,
  "id" | "name" | "reasoning" | "input" | "cost" | "contextWindow" | "maxTokens"
>> = [
  {
    id: "qwen3.8-max-preview",
    name: "Qwen3.8 Max Preview (Token)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "qwen3.7-max",
    name: "Qwen3.7 Max (Token)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "qwen3.7-plus",
    name: "Qwen3.7 Plus (Token)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
];

// ── API / Pay-as-you-go ──────────────────────────────────────────────────────

const API_INTL_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const API_CN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

const API_FALLBACK_MODELS: Array<Pick<
  Model<typeof API>,
  "id" | "name" | "reasoning" | "input" | "cost" | "contextWindow" | "maxTokens"
>> = [
  {
    id: "qwen3-8b",
    name: "Qwen3 8B (API)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "qwen3-14b",
    name: "Qwen3 14B (API)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "qwen3-32b",
    name: "Qwen3 32B (API)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "qwen3.7-max",
    name: "Qwen3.7 Max (API)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  },
];

// ── Model discovery ───────────────────────────────────────────────────────────

interface AlibabaModel {
  id: string;
  name?: string;
  object?: string;
}

function mapToModel(
  providerId: string,
  baseUrl: string,
  m: AlibabaModel,
): Model<typeof API> {
  const id = m.id || m.object || "unknown";
  return {
    id,
    name: m.name || id,
    api: API,
    provider: providerId,
    baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  };
}

function createFallbackModels(
  providerId: string,
  baseUrl: string,
  models: Array<Pick<
    Model<typeof API>,
    "id" | "name" | "reasoning" | "input" | "cost" | "contextWindow" | "maxTokens"
  >>,
): Model<typeof API>[] {
  return models.map((m) => ({
    ...m,
    api: API,
    provider: providerId,
    baseUrl,
  }));
}

async function discoverModels(
  baseUrl: string,
  authHeader: string,
  signal?: AbortSignal,
): Promise<AlibabaModel[]> {
  const response = await fetch(`${baseUrl}/models`, {
    signal,
    headers: {
      Accept: "application/json",
      Authorization: authHeader,
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as { data?: AlibabaModel[] };
  const models = payload.data ?? [];
  if (models.length === 0) {
    throw new Error("models endpoint returned no data");
  }
  return models;
}

function getAuthHeader(
  credential: RefreshModelsContext["credential"],
  envVars: string[],
): string | undefined {
  if (credential?.type === "api_key" && credential.key) {
    return `Bearer ${credential.key}`;
  }
  for (const name of envVars) {
    const value = process.env[name];
    if (typeof value === "string" && value.length > 0) {
      return `Bearer ${value}`;
    }
  }
  return undefined;
}

// ── Provider registration ─────────────────────────────────────────────────────

interface ProviderDefinition {
  id: string;
  name: string;
  baseUrl: string;
  envVars: string[];
  fallback: Array<Pick<
    Model<typeof API>,
    "id" | "name" | "reasoning" | "input" | "cost" | "contextWindow" | "maxTokens"
  >>;
}

function registerProvider(
  pi: ExtensionAPI,
  definition: ProviderDefinition,
): void {
  const fallback = createFallbackModels(
    definition.id,
    definition.baseUrl,
    definition.fallback,
  );

  const provider = createProvider({
    id: definition.id,
    name: definition.name,
    baseUrl: definition.baseUrl,
    auth: {
      apiKey: envApiKeyAuth(`${definition.name} API key`, definition.envVars),
    },
    models: fallback,
    api: openAICompletionsApi(),
    fetchModels: async (context: RefreshModelsContext) => {
      const authHeader = getAuthHeader(context.credential, definition.envVars);
      if (!authHeader) {
        throw new Error(
          `no API key configured for ${definition.id} (set one of ${definition.envVars.join(", ")})`,
        );
      }
      const models = await discoverModels(
        definition.baseUrl,
        authHeader,
        context.signal,
      );
      return models.map((m) => mapToModel(definition.id, definition.baseUrl, m));
    },
  });

  pi.registerProvider(provider);
}

export default function (pi: ExtensionAPI) {
  // Coding Plan
  registerProvider(pi, {
    id: "alibaba-coding-intl",
    name: "Alibaba Coding Plan (Intl)",
    baseUrl: CODING_INTL_BASE_URL,
    envVars: ["ALIBABA_CODING_API_KEY"],
    fallback: CODING_FALLBACK_MODELS,
  });

  registerProvider(pi, {
    id: "alibaba-coding-cn",
    name: "Alibaba Coding Plan (CN)",
    baseUrl: CODING_CN_BASE_URL,
    envVars: ["ALIBABA_CODING_API_KEY"],
    fallback: CODING_FALLBACK_MODELS,
  });

  // Token Plan
  registerProvider(pi, {
    id: "alibaba-token-intl",
    name: "Alibaba Token Plan (Intl)",
    baseUrl: TOKEN_INTL_BASE_URL,
    envVars: ["ALIBABA_TOKEN_PLAN_API_KEY"],
    fallback: TOKEN_FALLBACK_MODELS,
  });

  registerProvider(pi, {
    id: "alibaba-token-cn",
    name: "Alibaba Token Plan (CN)",
    baseUrl: TOKEN_CN_BASE_URL,
    envVars: ["ALIBABA_TOKEN_PLAN_API_KEY"],
    fallback: TOKEN_FALLBACK_MODELS,
  });

  // API / Pay-as-you-go
  registerProvider(pi, {
    id: "alibaba-api-intl",
    name: "Alibaba DashScope API (Intl)",
    baseUrl: API_INTL_BASE_URL,
    envVars: ["ALIBABA_API_KEY", "DASHSCOPE_API_KEY"],
    fallback: API_FALLBACK_MODELS,
  });

  registerProvider(pi, {
    id: "alibaba-api-cn",
    name: "Alibaba DashScope API (CN)",
    baseUrl: API_CN_BASE_URL,
    envVars: ["ALIBABA_API_KEY", "DASHSCOPE_API_KEY"],
    fallback: API_FALLBACK_MODELS,
  });
}
