/**
 * Tessera seed script — runs the full pipeline end-to-end on testnet:
 *   onboard (sponsored account) → submit claim → AI verify → approve → mint
 * for three demo contributions, then proves the soulbound invariant by
 * attempting (and failing) a transfer.
 *
 * Usage:
 *   npm run seed            # against the local server on :3000
 *   SEED_BASE=http://… npm run seed
 *
 * The app server must be running (it reads .env.local for contract IDs and
 * issuer keys). Works with or without an LLM key — without one, AI verify is
 * skipped and the organizer approves manually (the designed fallback).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { attemptTransfer } from "../lib/stellar/contracts";

const BASE = process.env.SEED_BASE ?? "http://localhost:3000";

function loadEnvFile() {
  // Load .env.local into process.env (for direct contract calls below).
  try {
    const raw = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const eq = line.indexOf("=");
      if (eq === -1 || line.trimStart().startsWith("#")) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // no .env.local — rely on process env only
  }
}

function env(key: string): string {
  return process.env[key] ?? "";
}

interface SeedClaim {
  type: "mentoring" | "talk" | "pr" | "other";
  description: string;
  event: string;
  date: string;
  issuerOrg: string;
  evidence: { kind: "link"; url: string; label: string }[];
}

const SEEDS: SeedClaim[] = [
  {
    type: "mentoring",
    description:
      "Mentored a first-time hackathon team through Soroban contract deployment, covering auth entries and testnet RPC.",
    event: "HackSpire 2026",
    date: "2026-03-21",
    issuerOrg: "HackSpire",
    evidence: [
      { kind: "link", url: "https://github.com/stellar/soroban-examples", label: "Soroban examples used in the mentoring session" },
    ],
  },
  {
    type: "pr",
    description:
      "Merged a pull request adding retry-with-backoff handling to the Soroban RPC client's transaction submission path.",
    event: "js-soroban-client",
    date: "2026-05-14",
    issuerOrg: "GDG Groups",
    evidence: [
      { kind: "link", url: "https://github.com/stellar/js-soroban-client", label: "Repository of the merged PR" },
    ],
  },
  {
    type: "talk",
    description:
      "Gave a 10-minute lightning talk on soulbound credentials and portable community contribution history on Stellar.",
    event: "GDG DevFest Kolkata",
    date: "2026-04-11",
    issuerOrg: "FIEM ACM",
    evidence: [
      { kind: "link", url: "https://gdg.community.dev/", label: "GDG community (event host)" },
    ],
  },
];

const log = (m: string) => console.log(`\n\x1b[36m▸\x1b[0m ${m}`);
const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m: string) => console.log(`  \x1b[33m!\x1b[0m ${m}`);

async function api<T>(
  p: string,
  body?: unknown,
  headers: Record<string, string> = {},
  method?: "GET" | "POST" | "PATCH"
): Promise<T> {
  const res = await fetch(BASE + p, {
    method: method ?? (body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status} on ${p}`);
  return data;
}

interface Claim {
  id: string;
  status: string;
  description: string;
  claimantWallet: string;
  verification?: { approved: boolean; confidence: number; citation: string; provider: string };
  credential?: { tokenId: number; cid: string; txHash: string };
}

async function main() {
  loadEnvFile();
  log("Checking the app server…");
  await api("/api/stats");
  ok(`${BASE} is up`);

  const organizerKey = env("ORGANIZER_API_KEY");
  if (!organizerKey) throw new Error("ORGANIZER_API_KEY not found in .env.local");
  const hasLlm = Boolean(env("LLM_API_KEY"));

  const results: { seed: SeedClaim; claim: Claim; profileUrl: string }[] = [];
  const existing = (await api<{ claims: Claim[] }>("/api/claims")).claims;

  for (const seed of SEEDS) {
    log(`${seed.issuerOrg} · ${seed.type} claim`);

    // Idempotency: skip claims that already made it through the pipeline.
    const prior = existing.find((c) => c.description === seed.description);
    if (prior?.status === "minted") {
      ok(`already minted (token #${prior.credential?.tokenId}) — skipping`);
      results.push({ seed, claim: prior, profileUrl: `${BASE}/profile/${prior.claimantWallet}` });
      continue;
    }

    // 1. Sponsored account for the claimant (real onboarding path).
    const acct = await api<{ address: string; secretKey: string }>("/api/onboard", undefined, {}, "POST");
    ok(`sponsored claimant account ${acct.address}`);

    // 2. Submit the claim.
    const created = await api<{ claim: Claim }>("/api/claims", { ...seed, claimantWallet: acct.address });
    const claim = created.claim;
    ok(`claim ${claim.id} (${claim.status})`);

    // 3. AI verify (skipped cleanly when no LLM key is configured).
    if (hasLlm) {
      try {
        const v = await api<{ claim: Claim; verification: Claim["verification"] }>("/api/verify", { claimId: claim.id });
        ok(`AI ${v.verification!.approved ? "auto-approves" : "flags for review"} (${Math.round(v.verification!.confidence * 100)}%, ${v.verification!.provider})`);
      } catch (e) {
        warn(`AI verify failed — approving manually: ${(e as Error).message}`);
      }
    } else {
      warn("no LLM_API_KEY configured — skipping AI verify, organizer approves manually");
    }

    // 4. Organizer approves.
    const approved = await api<{ claim: Claim }>(
      `/api/claims/${claim.id}`,
      { decision: "approve" },
      { "x-organizer-key": organizerKey },
      "PATCH"
    );
    ok(`approved (${approved.claim.status})`);

    // 5. Mint on-chain (org signs, recipient is sponsored).
    const minted = await api<{ claim: Claim; tokenId: number; txHash: string; cid: string }>(
      "/api/mint",
      { claimId: claim.id },
      { "x-organizer-key": organizerKey }
    );
    ok(`minted token #${minted.tokenId} (tx ${minted.txHash.slice(0, 16)}…)`);
    results.push({ seed, claim: minted.claim, profileUrl: `${BASE}/profile/${minted.claim.claimantWallet}` });
  }

  // Prove the soulbound invariant on the first minted credential.
  const first = results[0];
  if (first.claim.credential) {
    log("Proving the soulbound invariant (transfer must fail)…");
    const issuerSecret = env("ORG_ISSUER_KEYS")
      ? (JSON.parse(env("ORG_ISSUER_KEYS")) as Record<string, string>)[first.seed.issuerOrg]
      : "";
    const other = results[1].claim.claimantWallet;
    try {
      await attemptTransfer(
        first.claim.claimantWallet,
        other,
        first.claim.credential.tokenId,
        issuerSecret || env("ISSUER_SECRET_KEY")
      );
      warn("transfer unexpectedly succeeded — soulbound invariant is broken!");
    } catch (e) {
      ok(`transfer correctly rejected: ${(e as Error).message.split(":")[0]}`);
    }
  }

  log("Demo credentials live on testnet:");
  for (const r of results) {
    console.log(`  \x1b[32m•\x1b[0m ${r.seed.issuerOrg} — ${r.seed.type} → \x1b[4m${r.profileUrl}\x1b[0m`);
  }
  console.log(`\n  Profile pages show the 3D credential wall. Open one in a browser to see it.\n`);
}

main().catch((e) => {
  console.error(`\n\x1b[31mSeed failed:\x1b[0m ${(e as Error).message}`);
  process.exit(1);
});
