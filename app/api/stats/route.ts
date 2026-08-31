import { NextResponse } from "next/server";
import { listClaims } from "@/lib/store";
import { bootstrapDemoClaims } from "@/lib/demo-claims";
import { readIssuers, readTokenCount } from "@/lib/stellar";

export const dynamic = "force-dynamic";

/** Live stats for the landing page (on-chain counter + registry + claims). */
export async function GET() {
  try {
    await bootstrapDemoClaims();
    const [tokenCount, issuers, claims] = await Promise.all([
      readTokenCount(),
      readIssuers(),
      listClaims(),
    ]);
    const members = new Set(claims.map((c) => c.claimantWallet)).size;
    return NextResponse.json({
      credentialsIssued: tokenCount,
      activeOrgs: issuers.length,
      members,
    });
  } catch (e) {
    // Landing page must never fail on a stats error — fall back to zeros.
    return NextResponse.json({
      credentialsIssued: 0,
      activeOrgs: 3,
      members: 0,
      error: (e as Error).message,
    });
  }
}
