import assert from "node:assert/strict";
import test from "node:test";

import {
  isAlibabaChatModel,
  resolveAlibabaModelCapabilities,
} from "../src/model-capabilities.js";

test("DeepSeek V4 uses Alibaba's enable_thinking wire format and real efforts", () => {
  const model = resolveAlibabaModelCapabilities("deepseek-v4-pro");

  assert.equal(model.reasoning, true);
  assert.deepEqual(model.input, ["text"]);
  assert.deepEqual(model.thinkingLevelMap, {
    minimal: null,
    low: null,
    medium: null,
    high: "high",
    xhigh: null,
    max: "max",
  });
  assert.equal(model.compat.thinkingFormat, "qwen");
  assert.equal(model.compat.supportsReasoningEffort, true);
  assert.equal(model.compat.supportsDeveloperRole, false);
  assert.equal(model.compat.maxTokensField, "max_tokens");
});

test("dated DeepSeek V4 variants expose their distinct low effort", () => {
  const model = resolveAlibabaModelCapabilities("deepseek-v4-pro-0813");

  assert.equal(model.thinkingLevelMap?.low, "low");
  assert.equal(model.thinkingLevelMap?.medium, null);
  assert.equal(model.thinkingLevelMap?.high, "high");
  assert.equal(model.thinkingLevelMap?.max, "max");
});

test("Qwen 3.8 Max exposes only its three distinct reasoning efforts", () => {
  const model = resolveAlibabaModelCapabilities("qwen3.8-max");

  assert.equal(model.reasoning, true);
  assert.deepEqual(model.input, ["text", "image"]);
  assert.deepEqual(model.thinkingLevelMap, {
    minimal: null,
    low: "low",
    medium: "medium",
    high: null,
    xhigh: "xhigh",
    max: null,
  });
  assert.equal(model.compat.thinkingFormat, "qwen");
  assert.equal(model.compat.supportsReasoningEffort, true);
});

test("hybrid Qwen models expose off/high without fake duplicate levels", () => {
  const model = resolveAlibabaModelCapabilities("qwen3.7-plus");

  assert.equal(model.reasoning, true);
  assert.deepEqual(model.input, ["text", "image"]);
  assert.equal(model.thinkingLevelMap?.high, "high");
  assert.equal(model.thinkingLevelMap?.low, null);
  assert.equal(model.compat.supportsReasoningEffort, false);
});

test("always-thinking models do not advertise an off switch", () => {
  const kimi = resolveAlibabaModelCapabilities("kimi/kimi-k3");
  const r1 = resolveAlibabaModelCapabilities("deepseek-r1");

  assert.equal(kimi.thinkingLevelMap?.off, null);
  assert.equal(kimi.thinkingLevelMap?.max, "max");
  assert.equal(r1.thinkingLevelMap?.off, null);
  assert.equal(r1.thinkingLevelMap?.high, "high");
});

test("unknown models stay conservative but still inherit gateway compat", () => {
  const text = resolveAlibabaModelCapabilities("future-chat-model");
  const vision = resolveAlibabaModelCapabilities("future-vl-model");

  assert.equal(text.reasoning, false);
  assert.equal(text.thinkingLevelMap, undefined);
  assert.deepEqual(text.input, ["text"]);
  assert.deepEqual(vision.input, ["text", "image"]);
  assert.equal(text.compat.supportsDeveloperRole, false);
  assert.equal(text.compat.supportsStore, false);
  assert.equal(text.compat.supportsStrictMode, false);
});

test("mixed Alibaba catalogs retain chat models and reject media-only entries", () => {
  assert.equal(isAlibabaChatModel("deepseek-v4-pro"), true);
  assert.equal(isAlibabaChatModel("qwen3.8-max"), true);
  assert.equal(isAlibabaChatModel("qwen-audio-3.0-realtime-plus"), false);
  assert.equal(isAlibabaChatModel("wan2.7-image-pro"), false);
  assert.equal(isAlibabaChatModel("text-embedding-v4"), false);
});
