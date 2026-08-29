import { promises as fs } from "fs";
import path from "path";
import type { ClaimType, Evidence, VerificationResult } from "./ai-verify";

/**
 * Claim store for the POC: a JSON file on local disk (gitignored `data/`).
 * Swap for a durable backend (Vercel KV / Postgres) for multi-instance
 * hosting — the API surface below is all the routes use.
 */

export type ClaimStatus =
  | "pending"
  | "verified"
  | "approved"
  | "rejected"
  | "minting"
  | "minted"
  | "failed";

export interface StoredClaim {
  id: string;
  type: ClaimType;
  description: string;
  event: string;
  date: string;
  claimantWallet: string;
  issuerOrg: string;
  evidence: Evidence[];
  status: ClaimStatus;
  createdAt: string;
  verification?: VerificationResult;
  credential?: { tokenId: number; cid: string; txHash: string };
  /** Full badge metadata as minted (served for local: CIDs and as fallback). */
  metadata?: Record<string, unknown>;
  error?: string;
}

const FILE = path.join(process.cwd(), "data", "claims.json");

let cache: StoredClaim[] | null = null;

async function load(): Promise<StoredClaim[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    cache = JSON.parse(raw) as StoredClaim[];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(list: StoredClaim[]): Promise<void> {
  cache = list;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2));
  await fs.rename(tmp, FILE);
}

export async function listClaims(status?: ClaimStatus): Promise<StoredClaim[]> {
  const all = await load();
  const filtered = status ? all.filter((c) => c.status === status) : all;
  return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getClaim(id: string): Promise<StoredClaim | null> {
  const all = await load();
  return all.find((c) => c.id === id) ?? null;
}

export async function putClaim(claim: StoredClaim): Promise<StoredClaim> {
  const all = await load();
  const idx = all.findIndex((c) => c.id === claim.id);
  if (idx === -1) all.push(claim);
  else all[idx] = claim;
  await persist(all);
  return claim;
}

export async function createClaim(input: {
  type: ClaimType;
  description: string;
  event: string;
  date: string;
  claimantWallet: string;
  issuerOrg: string;
  evidence: Evidence[];
}): Promise<StoredClaim> {
  const claim: StoredClaim = {
    ...input,
    id: `claim_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await putClaim(claim);
  return claim;
}
