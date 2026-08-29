import { AnthropicProvider } from "./providers/anthropic";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

export interface LlmRequest {
  system: string;
  prompt: string;
  maxTokens: number;
  temperature?: number;
}

export interface LlmResponse {
  text: string;
  model: string;
}

/**
 * Provider-agnostic LLM interface. All non-Claude providers go through the
 * OpenAI-compatible /chat/completions adapter, so any gateway (Qwen via
 * DashScope, OpenAI, vLLM, LiteLLM, Ollama, …) works via env config alone.
 */
export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  complete(req: LlmRequest): Promise<LlmResponse>;
}

const DEFAULTS = {
  qwen: {
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    model: "qwen3-32b",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  anthropic: { model: "claude-sonnet-4-20250514" },
  custom: { model: "qwen3-32b" },
} as const;

/**
 * Selects the active provider from env:
 *   LLM_PROVIDER   qwen (default) | openai | anthropic | custom
 *   LLM_API_KEY    key for the provider
 *   LLM_MODEL      model id override (e.g. qwen3-32b, qwen-plus, gpt-4o-mini)
 *   LLM_BASE_URL   endpoint override (DashScope CN, self-hosted, or required
 *                  for LLM_PROVIDER=custom)
 */
export function getProvider(
  overrides: { provider?: string; apiKey?: string; model?: string; baseUrl?: string } = {}
): LlmProvider {
  const id = (overrides.provider ?? process.env.LLM_PROVIDER ?? "qwen").toLowerCase();
  const apiKey = overrides.apiKey ?? process.env.LLM_API_KEY;
  const model = overrides.model ?? process.env.LLM_MODEL ?? undefined;
  const baseUrl = overrides.baseUrl ?? process.env.LLM_BASE_URL ?? undefined;

  if (!apiKey) {
    throw new Error(`LLM_API_KEY is not set (required for provider "${id}"). Add it to .env.local.`);
  }

  switch (id) {
    case "qwen":
      return new OpenAICompatibleProvider(
        "qwen",
        apiKey,
        model ?? DEFAULTS.qwen.model,
        baseUrl ?? DEFAULTS.qwen.baseUrl,
        DEFAULTS.qwen.model
      );
    case "openai":
      return new OpenAICompatibleProvider(
        "openai",
        apiKey,
        model ?? DEFAULTS.openai.model,
        baseUrl ?? DEFAULTS.openai.baseUrl,
        DEFAULTS.openai.model
      );
    case "anthropic":
      return new AnthropicProvider(apiKey, model ?? DEFAULTS.anthropic.model);
    case "custom": {
      if (!baseUrl) {
        throw new Error("LLM_PROVIDER=custom requires LLM_BASE_URL (an OpenAI-compatible /v1 endpoint).");
      }
      return new OpenAICompatibleProvider(
        "custom",
        apiKey,
        model ?? DEFAULTS.custom.model,
        baseUrl,
        DEFAULTS.custom.model
      );
    }
    default:
      throw new Error(
        `Unknown LLM_PROVIDER "${id}". Supported: qwen, openai, anthropic, custom. ` +
          `Add an adapter in lib/ai-verify/providers/ to support more.`
      );
  }
}
