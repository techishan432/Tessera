import { NextResponse } from "next/server";
import { getClaim } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Badge metadata for a claim. Serves the same document that was pinned to
 * IPFS at mint time — used for `local:` CIDs (when Pinata is not configured)
 * and as a fallback gateway for the profile page.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const claim = await getClaim(id);
  if (!claim?.metadata) {
    return NextResponse.json({ error: "metadata not found" }, { status: 404 });
  }
  return NextResponse.json(claim.metadata);
}
