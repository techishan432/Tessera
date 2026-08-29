import type { LlmProvider, LlmRequest, LlmResponse } from "../provider";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  readonly model: string;

  constructor(private apiKey: string, model?: string) {
    this.model = model || DEFAULT_MODEL;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0.1,
        system: req.system,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      model?: string;
    };
    const text = (data.content ?? [])
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("");
    if (!text) throw new Error("Anthropic API returned no text content");
    return { text, model: data.model ?? this.model };
  }
}
