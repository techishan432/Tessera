import { NextResponse } from "next/server";
import { createClaim, listClaims, type ClaimStatus, type StoredClaim } from "@/lib/store";
import type { ClaimType, Evidence } from "@/lib/ai-verify";

export const dynamic = "force-dynamic";

const CLAIM_TYPES: ClaimType[] = ["mentoring", "talk", "pr", "other"];
const G_ADDRESS = /^G[A-Z2-7]{55}$/;

function validate(body: unknown): { ok: true; input: NewClaimInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (!CLAIM_TYPES.includes(b.type as ClaimType)) {
    return { ok: false, error: `type must be one of ${CLAIM_TYPES.join(", ")}` };
  }
  for (const field of ["description", "event", "date", "claimantWallet", "issuerOrg"] as const) {
    if (typeof b[field] !== "string" || !(b[field] as string).trim()) {
      return { ok: false, error: `${field} is required` };
    }
  }
  if (!G_ADDRESS.test(b.claimantWallet as string)) {
    return { ok: false, error: "claimantWallet must be a valid Stellar G address" };
  }
  const evidence = b.evidence;
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return { ok: false, error: "evidence must be a non-empty array" };
  }
  const badEvidence = evidence.findIndex(
    (e: unknown) =>
      typeof e !== "object" ||
      e === null ||
      typeof (e as Evidence).url !== "string" ||
      !/^(link|attachment)$/.test((e as Evidence).kind ?? "link")
  );
  if (badEvidence !== -1) {
    return { ok: false, error: `evidence[${badEvidence}] must have kind (link|attachment) and url` };
  }
  return {
    ok: true,
    input: {
      type: b.type as ClaimType,
      description: (b.description as string).trim(),
      event: (b.event as string).trim(),
      date: (b.date as string).trim(),
      claimantWallet: (b.claimantWallet as string).trim().toUpperCase(),
      issuerOrg: (b.issuerOrg as string).trim(),
      evidence: evidence as Evidence[],
    },
  };
}

interface NewClaimInput {
  type: ClaimType;
  description: string;
  event: string;
  date: string;
  claimantWallet: string;
  issuerOrg: string;
  evidence: Evidence[];
}

/** List claims (optionally ?status=). */
export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") as ClaimStatus | null;
  const claims = await listClaims(status ?? undefined);
  return NextResponse.json({ claims });
}

/** Submit a contribution claim (organizer on behalf of a member, or a member). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const check = validate(body);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
  const claim = await createClaim(check.input);
  return NextResponse.json({ claim }, { status: 201 });
}

export type { StoredClaim };
