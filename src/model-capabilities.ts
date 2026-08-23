export type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export type ThinkingLevelMap = Partial<Record<ThinkingLevel, string | null>>;

export interface AlibabaOpenAICompat {
  supportsDeveloperRole: false;
  supportsStore: false;
  supportsStrictMode: false;
  maxTokensField: "max_tokens";
  supportsLongCacheRetention: false;
  thinkingFormat?: "qwen";
  supportsReasoningEffort?: boolean;
}

export interface AlibabaModelCapabilities {
  reasoning: boolean;
  thinkingLevelMap?: ThinkingLevelMap;
  input: Array<"text" | "image">;
  contextWindow: number;
  maxTokens: number;
  compat: AlibabaOpenAICompat;
}

/** Alibaba's catalog mixes chat, embedding, image, audio, and video models. */
export function isAlibabaChatModel(modelId: string): boolean {
  return !/(?:^|[-/.])(image|audio|video|tts|asr|embed|embedding|vector|rerank|wan|realtime)(?:[-/.]|$)/i.test(
    modelId,
  );
}

/**
 * Every Alibaba OpenAI-compatible endpoint used by this package expects a
 * `system` message, not OpenAI's newer `developer` role. The other switches
 * keep Pi from sending OpenAI-only request fields which these gateways reject.
 */
const BASE_COMPAT: AlibabaOpenAICompat = {
  supportsDeveloperRole: false,
  supportsStore: false,
  supportsStrictMode: false,
  maxTokensField: "max_tokens",
  supportsLongCacheRetention: false,
};

// Qwen 3.8 Max accepts exactly low / medium / xhigh. Pi's aliases are hidden
// so the model picker offers only semantically distinct choices.
const QWEN_38_EFFORT: ThinkingLevelMap = {
  minimal: null,
  low: "low",
  medium: "medium",
  high: null,
  xhigh: "xhigh",
  max: null,
};

// Current unversioned DeepSeek V4 aliases accept high / max. Thinking can also
// be disabled with Alibaba's top-level `enable_thinking` field.
const DEEPSEEK_V4_EFFORT: ThinkingLevelMap = {
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: null,
  max: "max",
};

// The dated V4 variants additionally expose a distinct low effort.
const DEEPSEEK_V4_DATED_EFFORT: ThinkingLevelMap = {
  minimal: null,
  low: "low",
  medium: null,
  high: "high",
  xhigh: null,
  max: "max",
};

// Hybrid models without a real effort scale support only off / on. Pi uses
// "high" for the on state, while the wire only receives enable_thinking=true.
const TOGGLE_ONLY: ThinkingLevelMap = {
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: null,
  max: null,
};

const HIGH_MAX_EFFORT: ThinkingLevelMap = {
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: null,
  max: "max",
};

// These models always think. Hiding off is important: otherwise a host can
// offer a control the upstream model cannot honor.
const ALWAYS_HIGH: ThinkingLevelMap = {
  off: null,
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: null,
  max: null,
};

const ALWAYS_MAX: ThinkingLevelMap = {
  off: null,
  minimal: null,
  low: null,
  medium: null,
  high: null,
  xhigh: null,
  max: "max",
};

function qwenCompat(supportsReasoningEffort: boolean): AlibabaOpenAICompat {
  return {
    ...BASE_COMPAT,
    thinkingFormat: "qwen",
    supportsReasoningEffort,
  };
}

function reasoningModel(
  options: Omit<AlibabaModelCapabilities, "reasoning" | "compat"> & {
    supportsReasoningEffort: boolean;
  },
): AlibabaModelCapabilities {
  const { supportsReasoningEffort, ...rest } = options;
  return {
    ...rest,
    reasoning: true,
    compat: qwenCompat(supportsReasoningEffort),
  };
}

function alwaysThinkingModel(
  options: Omit<AlibabaModelCapabilities, "reasoning" | "compat">,
): AlibabaModelCapabilities {
  return {
    ...options,
    reasoning: true,
    compat: { ...BASE_COMPAT },
  };
}

/**
 * Projects the model id returned by Alibaba's `/models` endpoint into Pi's
 * capability contract. Alibaba returns ids and names only, so the provider
 * must supply this model-specific metadata itself.
 *
 * Unknown models deliberately stay conservative instead of being guessed into
 * a reasoning protocol they may reject. Adding a new model is one table rule
 * plus a contract test.
 */
export function resolveAlibabaModelCapabilities(
  modelId: string,
): AlibabaModelCapabilities {
  const id = modelId.toLowerCase();

  if (/^qwen3[.-]?8-max(?:[-.]|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...QWEN_38_EFFORT },
      input: ["text", "image"],
      contextWindow: 1_000_000,
      maxTokens: 262_144,
      supportsReasoningEffort: true,
    });
  }

  if (/^deepseek-v4-(?:pro-0813|flash-0731)(?:-|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...DEEPSEEK_V4_DATED_EFFORT },
      input: ["text"],
      contextWindow: 1_000_000,
      maxTokens: 393_216,
      supportsReasoningEffort: true,
    });
  }

  if (/^deepseek-v4-(?:pro|flash)(?:-|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...DEEPSEEK_V4_EFFORT },
      input: ["text"],
      contextWindow: 1_000_000,
      maxTokens: 393_216,
      supportsReasoningEffort: true,
    });
  }

  if (/^qwen3[.-]?(?:[67])-(?:max|plus|flash)(?:-|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...TOGGLE_ONLY },
      input: /plus|flash|vl/.test(id) ? ["text", "image"] : ["text"],
      contextWindow: 1_000_000,
      maxTokens: 65_536,
      supportsReasoningEffort: false,
    });
  }

  if (/^qwen3(?:[-.]|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...TOGGLE_ONLY },
      input: /vl|omni|plus|flash/.test(id) ? ["text", "image"] : ["text"],
      contextWindow: 131_072,
      maxTokens: 32_768,
      supportsReasoningEffort: false,
    });
  }

  if (/^deepseek-v3\.(?:1|2)(?:-|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...TOGGLE_ONLY },
      input: ["text"],
      contextWindow: 131_072,
      maxTokens: 65_536,
      supportsReasoningEffort: false,
    });
  }

  if (/^glm-5(?:[.-]|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...HIGH_MAX_EFFORT },
      input: ["text"],
      contextWindow: 1_000_000,
      maxTokens: 131_072,
      supportsReasoningEffort: true,
    });
  }

  if (/^kimi-k2\.6(?:-|$)/.test(id)) {
    return reasoningModel({
      thinkingLevelMap: { ...TOGGLE_ONLY },
      input: ["text", "image"],
      contextWindow: 262_144,
      maxTokens: 16_384,
      supportsReasoningEffort: false,
    });
  }

  if (/^(?:kimi\/kimi-k3|kimi-k3)(?:-|$)/.test(id)) {
    return alwaysThinkingModel({
      thinkingLevelMap: { ...ALWAYS_MAX },
      input: ["text", "image"],
      contextWindow: 1_000_000,
      maxTokens: 131_072,
    });
  }

  if (/^(?:kimi-k2\.7-code|minimax\/minimax-m3|minimax-m3|qwq)(?:-|$)/.test(id)) {
    return alwaysThinkingModel({
      thinkingLevelMap: { ...ALWAYS_HIGH },
      input: /kimi|minimax/.test(id) ? ["text", "image"] : ["text"],
      contextWindow: /minimax/.test(id) ? 512_000 : 262_144,
      maxTokens: 131_072,
    });
  }

  if (/^deepseek-r1(?:-|$)/.test(id)) {
    return alwaysThinkingModel({
      thinkingLevelMap: { ...ALWAYS_HIGH },
      input: ["text"],
      contextWindow: 131_072,
      maxTokens: 32_768,
    });
  }

  return {
    reasoning: false,
    input: /(?:^|[-/.])(vl|vision|omni)(?:[-/.]|$)/.test(id)
      ? ["text", "image"]
      : ["text"],
    contextWindow: 128_000,
    maxTokens: 8_192,
    compat: { ...BASE_COMPAT },
  };
}
