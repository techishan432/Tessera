export type ClaimType = "mentoring" | "talk" | "pr" | "other";

export interface Claim {
  type: ClaimType;
  description: string;
  event: string;
  /** ISO date (YYYY-MM-DD) of the contribution. */
  date: string;
  /** Claimant's Stellar wallet (G address). */
  claimantWallet: string;
}

export interface Evidence {
  kind: "link" | "attachment";
  url: string;
  label?: string;
}

export interface VerificationResult {
  /** true when confidence >= threshold — auto-approved, else manual review. */
  approved: boolean;
  /** 0..1 — model confidence that the evidence corroborates the claim. */
  confidence: number;
  /** One-line human-readable citation stored with the credential metadata. */
  citation: string;
  provider: string;
  model: string;
  checkedAt: string;
  /** Set when the verification itself failed (provider error, bad output). */
  error?: string;
}
