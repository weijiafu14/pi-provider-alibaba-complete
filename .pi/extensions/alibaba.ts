import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function modelFromEntry(item: { id?: string; name?: string; object?: string }) {
  const id = item.id || item.object || "unknown";
  const name = item.name || id;
  return { id, name, reasoning: false, input: ["text"] as const, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } as const, contextWindow: 128000, maxTokens: 8192 };
}

export default function (pi: ExtensionAPI) {
  // Coding Plan — International
  pi.registerProvider("alibaba-coding-intl", {
    name: "Alibaba Coding Plan (Intl)",
    baseUrl: "https://coding-intl.dashscope.aliyuncs.com/v1",
    apiKey: "$ALIBABA_CODING_API_KEY",
    api: "openai-completions",
    refreshModels({ signal }) {
      return fetch("https://coding-intl.dashscope.aliyuncs.com/v1/models", { signal, headers: { Authorization: `Bearer ${process.env.ALIBABA_CODING_API_KEY || ""}` } })
        .then((r) => r.json())
        .then((payload: { data?: Array<{ id?: string; name?: string; object?: string }> }) => (payload.data || []).map(modelFromEntry))
        .catch(() => []);
    },
  });

  // Coding Plan — Chinese mainland
  pi.registerProvider("alibaba-coding-cn", {
    name: "Alibaba Coding Plan (CN)",
    baseUrl: "https://coding.dashscope.aliyuncs.com/v1",
    apiKey: "$ALIBABA_CODING_API_KEY",
    api: "openai-completions",
    refreshModels({ signal }) {
      return fetch("https://coding.dashscope.aliyuncs.com/v1/models", { signal, headers: { Authorization: `Bearer ${process.env.ALIBABA_CODING_API_KEY || ""}` } })
        .then((r) => r.json())
        .then((payload: { data?: Array<{ id?: string; name?: string; object?: string }> }) => (payload.data || []).map(modelFromEntry))
        .catch(() => []);
    },
  });

  // Token Plan — International (Singapore)
  pi.registerProvider("alibaba-token-intl", {
    name: "Alibaba Token Plan (Intl)",
    baseUrl: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    apiKey: "$ALIBABA_TOKEN_PLAN_API_KEY",
    api: "openai-completions",
    refreshModels({ signal }) {
      return fetch("https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/models", { signal, headers: { Authorization: `Bearer ${process.env.ALIBABA_TOKEN_PLAN_API_KEY || ""}` } })
        .then((r) => r.json())
        .then((payload: { data?: Array<{ id?: string; name?: string; object?: string }> }) => (payload.data || []).map(modelFromEntry))
        .catch(() => []);
    },
  });

  // Token Plan — Chinese mainland (Beijing)
  pi.registerProvider("alibaba-token-cn", {
    name: "Alibaba Token Plan (CN)",
    baseUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    apiKey: "$ALIBABA_TOKEN_PLAN_API_KEY",
    api: "openai-completions",
    refreshModels({ signal }) {
      return fetch("https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/models", { signal, headers: { Authorization: `Bearer ${process.env.ALIBABA_TOKEN_PLAN_API_KEY || ""}` } })
        .then((r) => r.json())
        .then((payload: { data?: Array<{ id?: string; name?: string; object?: string }> }) => (payload.data || []).map(modelFromEntry))
        .catch(() => []);
    },
  });

  // API / Pay-as-you-go — International
  pi.registerProvider("alibaba-api-intl", {
    name: "Alibaba DashScope API (Intl)",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    apiKey: "$ALIBABA_API_KEY",
    api: "openai-completions",
    refreshModels({ signal }) {
      return fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models", { signal, headers: { Authorization: `Bearer ${process.env.ALIBABA_API_KEY || process.env.DASHSCOPE_API_KEY || ""}` } })
        .then((r) => r.json())
        .then((payload: { data?: Array<{ id?: string; name?: string; object?: string }> }) => (payload.data || []).map(modelFromEntry))
        .catch(() => []);
    },
  });

  // API / Pay-as-you-go — Chinese mainland
  pi.registerProvider("alibaba-api-cn", {
    name: "Alibaba DashScope API (CN)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: "$ALIBABA_API_KEY",
    api: "openai-completions",
    refreshModels({ signal }) {
      return fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/models", { signal, headers: { Authorization: `Bearer ${process.env.ALIBABA_API_KEY || process.env.DASHSCOPE_API_KEY || ""}` } })
        .then((r) => r.json())
        .then((payload: { data?: Array<{ id?: string; name?: string; object?: string }> }) => (payload.data || []).map(modelFromEntry))
        .catch(() => []);
    },
  });
}
