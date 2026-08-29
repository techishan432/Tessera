import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectEvidence,
  getProvider,
  verifyClaim,
  type Claim,
  type Evidence,
  type LlmProvider,
} from "../lib/ai-verify";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CLAIMANT = "GDQZIUOFLL5OPCYTDJE4YO766AJQYZ3XQQIZ6BO27ADKEE24GMX72LYS";

const prClaim: Claim = {
  type: "pr",
  description: "Merged a pull request adding retry logic to the Soroban RPC client",
  event: "js-soroban-client",
  date: "2026-05-14",
  claimantWallet: CLAIMANT,
};

const prEvidence: Evidence[] = [
  {
    kind: "link",
    url: "https://github.com/stellar/js-soroban-client/pull/24",
    label: "PR: add retry logic to RPC client",
  },
];

/** Emulates a strict LLM: judges from the evidence digest, not vibes. */
function makeJudgeLlm(): LlmProvider {
  return {
    id: "judge",
    model: "judge-1",
    async complete({ prompt }) {
      const merged = /"merged":\s*true/.test(prompt);
      const author = prompt.match(/"author":\s*"([^"]+)"/)?.[1] ?? null;
      const claimedAuthor = "indrajitari";
      if (merged && author === claimedAuthor) {
        return {
          text: '{"confidence":0.95,"citation":"PR #24 is merged; author matches the claimant"}',
          model: "judge-1",
        };
      }
      if (merged && author && author !== claimedAuthor) {
        return {
          text: `{"confidence":0.15,"citation":"PR #24 is merged but authored by ${author}, not the claimant"}`,
          model: "judge-1",
        };
      }
      return {
        text: '{"confidence":0.2,"citation":"no merged PR evidence found"}',
        model: "judge-1",
      };
    },
  };
}

function mockPrApi(author: string, merged: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      if (String(url).includes("api.github.com")) {
        return new Response(
          JSON.stringify({
            title: "Add retry logic to RPC client",
            state: "closed",
            merged,
            merged_at: merged ? "2026-05-14T10:00:00Z" : null,
            user: { login: author },
            additions: 120,
            deletions: 8,
            body: "Adds exponential backoff to failed RPC calls.",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    })
  );
}

describe("evidence collection", () => {
  it("collects live facts for a real GitHub PR link", async () => {
    mockPrApi("indrajitari", true);
    const digest = await collectEvidence(prEvidence);

    expect(digest).toHaveLength(1);
    expect(digest[0].facts).toMatchObject({
      kind: "github_pull_request",
      repo: "stellar/js-soroban-client",
      number: 24,
      merged: true,
      author: "indrajitari",
    });
    expect(digest[0].error).toBeUndefined();
  });

  it("records an error entry for an unreachable source instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );
    const digest = await collectEvidence([
      { kind: "link", url: "https://event.example.org/attendance" },
    ]);

    expect(digest[0].error).toContain("ECONNREFUSED");
  });
});

describe("verifyClaim — approve/reject behavior", () => {
  it("approves a PR claim when live evidence matches the claimant", async () => {
    mockPrApi("indrajitari", true);
    const result = await verifyClaim(prClaim, prEvidence, {
      provider: makeJudgeLlm(),
      threshold: 0.8,
    });

    expect(result.approved).toBe(true);
    expect(result.confidence).toBeCloseTo(0.95);
    expect(result.citation).toMatch(/merged/);
    expect(result.error).toBeUndefined();
  });

  it("rejects a fabricated claim: PR merged by someone else", async () => {
    mockPrApi("not-the-claimant", true);
    const result = await verifyClaim(prClaim, prEvidence, {
      provider: makeJudgeLlm(),
      threshold: 0.8,
    });

    expect(result.approved).toBe(false);
    expect(result.confidence).toBeLessThan(0.8);
    expect(result.citation).toMatch(/not the claimant/);
  });

  it("rejects when the PR was never merged", async () => {
    mockPrApi("indrajitari", false);
    const result = await verifyClaim(prClaim, prEvidence, {
      provider: makeJudgeLlm(),
      threshold: 0.8,
    });

    expect(result.approved).toBe(false);
    expect(result.confidence).toBe(0.2);
  });

  it("auto-approves exactly at the confidence threshold", async () => {
    mockPrApi("indrajitari", true);
    const atThreshold = await verifyClaim(prClaim, prEvidence, {
      provider: makeJudgeLlm(),
      threshold: 0.95,
    });
    expect(atThreshold.approved).toBe(true);

    const justAbove = await verifyClaim(prClaim, prEvidence, {
      provider: makeJudgeLlm(),
      threshold: 0.96,
    });
    expect(justAbove.approved).toBe(false);
  });

  it("flags manual review on unparseable model output", async () => {
    const broken: LlmProvider = {
      id: "broken",
      model: "broken",
      complete: async () => ({ text: "I think this is probably fine?", model: "broken" }),
    };
    const result = await verifyClaim(prClaim, prEvidence, {
      provider: broken,
      skipEvidenceFetch: true,
    });

    expect(result.approved).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.error).toMatch(/unparseable/);
  });

  it("returns a failed result (never throws) when the provider errors", async () => {
    const dead: LlmProvider = {
      id: "dead",
      model: "dead",
      complete: async () => {
        throw new Error("401 invalid api key");
      },
    };
    const result = await verifyClaim(prClaim, prEvidence, {
      provider: dead,
      skipEvidenceFetch: true,
    });

    expect(result.approved).toBe(false);
    expect(result.error).toMatch(/401 invalid api key/);
  });
});

describe("provider selection", () => {
  it("defaults to qwen when LLM_PROVIDER is unset", () => {
    vi.stubEnv("LLM_API_KEY", "sk-test");
    const p = getProvider();
    expect(p.id).toBe("qwen");
    expect(p.model).toBe("qwen3-32b");
  });

  it("respects LLM_MODEL overrides for qwen", () => {
    vi.stubEnv("LLM_PROVIDER", "qwen");
    vi.stubEnv("LLM_API_KEY", "sk-test");
    const p = getProvider({ model: "qwen-plus" });
    expect(p.id).toBe("qwen");
    expect(p.model).toBe("qwen-plus");
  });

  it("supports openai and custom (any OpenAI-compatible endpoint)", () => {
    vi.stubEnv("LLM_API_KEY", "sk-test");
    expect(getProvider({ provider: "openai" }).id).toBe("openai");
    const custom = getProvider({ provider: "custom", baseUrl: "https://gateway.example/v1" });
    expect(custom.id).toBe("custom");
    expect(() => getProvider({ provider: "custom" })).toThrow(/LLM_BASE_URL/);
  });

  it("keeps anthropic for Claude users", () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    vi.stubEnv("LLM_API_KEY", "sk-test");
    expect(getProvider().id).toBe("anthropic");
  });

  it("throws an actionable error for a missing key", () => {
    vi.stubEnv("LLM_PROVIDER", "qwen");
    vi.stubEnv("LLM_API_KEY", "");
    expect(() => getProvider()).toThrow(/LLM_API_KEY/);
  });

  it("throws for an unknown provider and points at the adapter location", () => {
    vi.stubEnv("LLM_PROVIDER", "groq");
    vi.stubEnv("LLM_API_KEY", "sk-test");
    expect(() => getProvider()).toThrow(/providers\//);
  });

  it("openai-compatible adapter posts to /chat/completions and parses the reply", async () => {
    const p = getProvider({
      provider: "custom",
      apiKey: "sk-test",
      baseUrl: "https://gateway.example/v1",
      model: "qwen3-32b",
    });
    let captured: { url?: string; init?: RequestInit } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        captured = { url: String(url), init };
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"confidence":0.9,"citation":"ok"}' } }],
            model: "qwen3-32b",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      })
    );

    const res = await p.complete({
      system: "sys",
      prompt: "prompt",
      maxTokens: 500,
      temperature: 0.1,
    });

    expect(captured.url).toBe("https://gateway.example/v1/chat/completions");
    expect((captured.init!.headers as Record<string, string>).authorization).toBe("Bearer sk-test");
    const body = JSON.parse(captured.init!.body as string);
    expect(body.model).toBe("qwen3-32b");
    expect(body.messages).toHaveLength(2);
    expect(res.text).toContain('"confidence":0.9');
    expect(res.model).toBe("qwen3-32b");
  });
});

describe("live provider smoke (skipped unless LLM_API_KEY is set)", () => {
  it("returns a well-formed verdict from the real model", async () => {
    if (!process.env.LLM_API_KEY) return;
    const result = await verifyClaim(
      {
        type: "talk",
        description: "Gave a lightning talk on Soroban smart contracts",
        event: "GDG DevFest Kolkata",
        date: "2026-04-11",
        claimantWallet: CLAIMANT,
      },
      [{ kind: "link", url: "https://devfest.withgoogle.com/" , label: "event page"}],
      { threshold: 0.8 }
    );
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.citation.length).toBeGreaterThan(0);
  }, 60_000);
});
