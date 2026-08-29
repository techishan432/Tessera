import type { LlmProvider, LlmRequest, LlmResponse } from "../provider";

/**
 * One adapter to rule them all: any OpenAI-compatible /chat/completions
 * endpoint. Covers Qwen via DashScope (compatible-mode), OpenAI, and any
 * self-hosted gateway (vLLM, LiteLLM, Ollama, …) pointed at via LLM_BASE_URL.
 */
export class OpenAICompatibleProvider implements LlmProvider {
  readonly id: string;
  readonly model: string;

  constructor(
    id: string,
    private apiKey: string,
    model: string,
    private baseUrl: string,
    defaultModel: string
  ) {
    this.id = id;
    this.model = model || defaultModel;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: req.temperature ?? 0.1,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${this.id} API ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error(`${this.id} API returned no message content`);
    return { text, model: data.model ?? this.model };
  }
}
