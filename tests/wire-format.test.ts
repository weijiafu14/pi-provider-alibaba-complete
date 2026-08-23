import assert from "node:assert/strict";
import test from "node:test";

import {
  openAICompletionsApi,
  type Context,
  type Model,
  type SimpleStreamOptions,
} from "@earendil-works/pi-ai/compat";

import { resolveAlibabaModelCapabilities } from "../src/model-capabilities.js";

type RequestPayload = Record<string, unknown>;

function modelFor(id: string): Model<"openai-completions"> {
  return {
    id,
    name: id,
    api: "openai-completions",
    provider: "alibaba-token-cn",
    baseUrl: "https://example.invalid/compatible-mode/v1",
    ...resolveAlibabaModelCapabilities(id),
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  };
}

const context: Context = {
  systemPrompt: "Keep the reply short.",
  messages: [{ role: "user", content: "Hello", timestamp: 1 }],
};

const sse = [
  'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1,"model":"test","choices":[{"index":0,"delta":{"role":"assistant","content":"ok"},"finish_reason":null}]}',
  "",
  'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1,"model":"test","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
  "",
  "data: [DONE]",
  "",
].join("\n");

async function capturePayload(
  id: string,
  options: Pick<SimpleStreamOptions, "reasoning">,
): Promise<RequestPayload> {
  let payload: RequestPayload | undefined;
  const fetch: typeof globalThis.fetch = async (_input, init) => {
    payload = JSON.parse(String(init?.body)) as RequestPayload;
    return new Response(sse, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };

  const stream = openAICompletionsApi().streamSimple(modelFor(id), context, {
    ...options,
    apiKey: "test-key",
    fetch,
    maxRetries: 0,
  });
  for await (const event of stream) {
    if (event.type === "error") {
      throw new Error(event.error.errorMessage);
    }
  }

  assert.ok(payload);
  return payload;
}

test("selected reasoning effort becomes Alibaba enable_thinking + reasoning_effort", async () => {
  const payload = await capturePayload("deepseek-v4-pro", {
    reasoning: "high",
  });
  const messages = payload.messages as Array<{ role: string }>;

  assert.equal(payload.enable_thinking, true);
  assert.equal(payload.reasoning_effort, "high");
  assert.equal(messages[0]?.role, "system");
  assert.equal("store" in payload, false);
  assert.equal("max_completion_tokens" in payload, false);
  assert.equal(typeof payload.max_tokens, "number");
});

test("off disables thinking and omits reasoning_effort", async () => {
  const payload = await capturePayload("deepseek-v4-pro", {});

  assert.equal(payload.enable_thinking, false);
  assert.equal("reasoning_effort" in payload, false);
});

test("Qwen effort mapping reaches the wire without aliases", async () => {
  const payload = await capturePayload("qwen3.8-max", {
    reasoning: "medium",
  });

  assert.equal(payload.enable_thinking, true);
  assert.equal(payload.reasoning_effort, "medium");
});
