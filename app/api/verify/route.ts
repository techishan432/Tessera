import { NextResponse } from "next/server";
import { getClaim, putClaim } from "@/lib/store";
import { verifyClaim } from "@/lib/ai-verify";
import type { Claim } from "@/lib/ai-verify";

export const dynamic = "force-dynamic";

/**
 * Run a claim through the AI verification module. The result is stored on
 * the claim; approval remains the organizer's call on the dashboard (AI
 * verdict is advisory + auto-approve flag).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const claimId = (body as { claimId?: string } | null)?.claimId;
  if (!claimId) return NextResponse.json({ error: "claimId is required" }, { status: 400 });

  const claim = await getClaim(claimId);
  if (!claim) return NextResponse.json({ error: "claim not found" }, { status: 404 });
  if (claim.status === "minted" || claim.status === "minting") {
    return NextResponse.json({ error: "claim already minted" }, { status: 409 });
  }

  const input: Claim = {
    type: claim.type,
    description: claim.description,
    event: claim.event,
    date: claim.date,
    claimantWallet: claim.claimantWallet,
  };

  try {
    const result = await verifyClaim(input, claim.evidence);
    claim.verification = result;
    // Auto-approve at/above the configured threshold; below it the claim is
    // flagged for manual organizer review.
    claim.status = result.approved ? "approved" : "verified";
    await putClaim(claim);
    return NextResponse.json({ claim, verification: result });
  } catch (e) {
    return NextResponse.json(
      { error: `verification failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
