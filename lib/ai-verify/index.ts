import { getProvider, type LlmProvider } from "./provider";
import { collectEvidence, type EvidenceEntry } from "./evidence";
import type { Claim, Evidence, VerificationResult } from "./types";

export type { Claim, Evidence, VerificationResult, ClaimType } from "./types";
export { getProvider } from "./provider";
export type { LlmProvider, LlmRequest, LlmResponse } from "./provider";
export { collectEvidence, type EvidenceEntry } from "./evidence";

const SYSTEM_PROMPT = `You are the verification engine for Tessera, a Stellar-based credential system.
You cross-check a community contribution claim against machine-collected evidence.
Be a STRICT fact-checker. Award high confidence only when the evidence directly and
specifically corroborates the claim: the right person, the right artifact, the right
event/timeframe. A fabricated, mismatched, contradictory, or unavailable source must
yield low confidence. A merged PR whose author does not match the claimant is a
mismatch. A talk that is not attested by the evidence is unproven.
Respond with ONLY minified JSON, no prose, in exactly this shape:
{"confidence":<number between 0 and 1>,"citation":"<one human-readable line citing the decisive evidence>"}
The citation must name the specific source and what it shows.`;

export interface VerifyOptions {
  /** Confidence at/above which the claim auto-approves. Default: env or 0.8. */
  threshold?: number;
  /** Explicit provider (tests, seed scripts). Default: from LLM_PROVIDER env. */
  provider?: LlmProvider;
  /** Skip network evidence collection (tests, offline seed). */
  skipEvidenceFetch?: boolean;
}

/**
 * Verify a contribution claim against its evidence using the configured LLM.
 *
 * Returns approved=true when model confidence >= threshold (auto-approve);
 * below threshold the claim is flagged for manual review by an organizer.
 * System failures never throw — they return a failed result with `error` set.
 */
export async function verifyClaim(
  claim: Claim,
  evidence: Evidence[],
  opts: VerifyOptions = {}
): Promise<VerificationResult> {
  const threshold =
    opts.threshold ??
    Number(process.env.VERIFY_AUTO_APPROVE_THRESHOLD ?? 0.8);
  const provider = opts.provider ?? getProvider();

  let digest: EvidenceEntry[];
  try {
    digest = opts.skipEvidenceFetch ? [] : await collectEvidence(evidence);
  } catch (e) {
    return failedResult(provider, `evidence collection failed: ${(e as Error).message}`);
  }

  let raw: string;
  try {
    const res = await provider.complete({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(claim, evidence, digest),
      maxTokens: 500,
      temperature: 0.1,
    });
    raw = res.text;
  } catch (e) {
    return failedResult(provider, `LLM call failed: ${(e as Error).message}`);
  }

  const parsed = parseLlmJson(raw);
  if (!parsed) {
    return failedResult(provider, `unparseable LLM output: ${raw.slice(0, 200)}`);
  }

  const confidence = clamp01(parsed.confidence);
  return {
    approved: confidence >= threshold,
    confidence,
    citation: parsed.citation || "No citation provided by verification model.",
    provider: provider.id,
    model: provider.model,
    checkedAt: new Date().toISOString(),
  };
}

function buildPrompt(claim: Claim, evidence: Evidence[], digest: EvidenceEntry[]): string {
  return [
    "CLAIM (JSON):",
    JSON.stringify(claim, null, 2),
    "",
    "EVIDENCE SUBMITTED (JSON):",
    JSON.stringify(evidence, null, 2),
    "",
    "EVIDENCE DIGEST — facts collected machine-side (JSON):",
    JSON.stringify(digest, null, 2),
    "",
    "Assess the claim against the digest and return the JSON verdict.",
  ].join("\n");
}

/** Tolerates code fences, surrounding prose, and stray characters. */
function parseLlmJson(raw: string): { confidence: number; citation: string } | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof obj.confidence !== "number" || !Number.isFinite(obj.confidence)) return null;
    const citation =
      typeof obj.citation === "string"
        ? obj.citation
        : typeof obj.reason === "string"
          ? obj.reason
          : "";
    return { confidence: obj.confidence, citation: citation.slice(0, 300) };
  } catch {
    return null;
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function failedResult(provider: LlmProvider, error: string): VerificationResult {
  return {
    approved: false,
    confidence: 0,
    citation: "Verification could not be completed — organizer review required.",
    provider: provider.id,
    model: provider.model,
    checkedAt: new Date().toISOString(),
    error,
  };
}
