# pi-provider-alibaba-complete

Alibaba Cloud Model Studio provider for [Pi](https://pi.dev/) and hosts that
implement the Pi extension ABI, including
[DeepSeek Harness through pi2dsh](https://github.com/weijiafu14/pi2dsh).

It supports all six route families exposed by Alibaba:

- Coding Plan: China and international;
- Token Plan: China and international;
- pay-as-you-go DashScope API: China and international.

The provider owns authentication, dynamic `/models` discovery, the
OpenAI-compatible transport, and model-specific request compatibility. It does
not proxy requests through another service.

## Why this package exists

The original `pi-provider-alibaba@1.0.1` correctly implemented the route and
transport layer, but marked every dynamically discovered model as
`reasoning: false`, text-only, 128K context and 8K output. That made native Pi
and downstream hosts hide reasoning controls even for models that support
them.

This maintained package keeps the original provider architecture and adds the
missing capability projection:

- Alibaba-compatible `system` role instead of OpenAI `developer`;
- top-level `enable_thinking` and `reasoning_effort`;
- model-specific reasoning levels;
- current context, output, and image capabilities for known model families;
- filtering of image/audio/video-only entries from the chat catalog;
- contract and request-body tests.

## Install in Pi

Do not install this package together with `pi-provider-alibaba`: both register
the same provider IDs.

```sh
pi install npm:pi-provider-alibaba-complete
```

Set the credential belonging to the product you purchased, restart Pi, then
select the matching provider and model:

```sh
# Token Plan
export ALIBABA_TOKEN_PLAN_API_KEY='<your-token-plan-key>'

# Coding Plan
export ALIBABA_CODING_API_KEY='<your-coding-plan-key>'

# Pay-as-you-go DashScope API
export ALIBABA_API_KEY='<your-api-key>'
```

China and international routes use different endpoints. A key that can list
models on the wrong route can still fail the real completion request, so always
select the route matching the key's product and region.

## Install in DeepSeek Harness

```sh
dsh plugin --profile web add pi2dsh
dsh plugin --profile web add pi-provider-alibaba-complete

export ALIBABA_TOKEN_PLAN_API_KEY='<your-token-plan-key>'
NODE_USE_ENV_PROXY=1 dsh web
```

The `NODE_USE_ENV_PROXY=1` prefix is needed only when your network requires the
Node process to use `HTTP_PROXY` / `HTTPS_PROXY`.

The models appear as native DSH routes, including groups such as
`Alibaba Token Plan (CN)`. The DSH model picker reads the provider's Pi metadata
and exposes only meaningful reasoning levels.

## Reasoning controls

| Model family | Selectable levels | Alibaba wire format |
| --- | --- | --- |
| DeepSeek V4 Pro / Flash | Off, High, Max | `enable_thinking` + `reasoning_effort` |
| dated DeepSeek V4 variants | Off, Low, High, Max | `enable_thinking` + `reasoning_effort` |
| Qwen 3.8 Max | Off, Low, Medium, XHigh | `enable_thinking` + `reasoning_effort` |
| Qwen 3.6 / 3.7 hybrid models | Off, High | `enable_thinking` |
| always-thinking models | their real non-disableable level | no fake Off control |

Unknown models stay conservative until their protocol is known. The provider
does not guess a reasoning format which a newly released model might reject.

## Verification

```sh
npm install
npm run verify
```

The release was additionally verified against a real China Token Plan:

- native Pi with DeepSeek V4 reasoning enabled;
- raw DeepSeek V4 `high` and `off` requests;
- raw Qwen 3.8 Max `medium` request;
- DeepSeek Harness model picker showing Off / High / Max;
- two complete DSH agent loops across a process restart, including tool call,
  tool result, second model request, and final answer;
- all main DSH requests carried `enable_thinking: true`,
  `reasoning_effort: "high"`, and a `system` message;
- the credential appeared in zero persisted test files.

## Upstream

Based on [`dinhe/pi-provider-alibaba`](https://gitlab.com/dinhe/pi-provider-alibaba).
The reasoning and capability fix is also submitted upstream so the ecosystem
can converge on one package.

## License

MIT
