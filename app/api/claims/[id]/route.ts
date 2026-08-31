import { NextResponse } from "next/server";
import { getClaim, putClaim } from "@/lib/store";
import { bootstrapDemoClaims } from "@/lib/demo-claims";
import { requireOrganizer } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Get a single claim. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await bootstrapDemoClaims();
  const { id } = await ctx.params;
  const claim = await getClaim(id);
  if (!claim) return NextResponse.json({ error: "claim not found" }, { status: 404 });
  return NextResponse.json({ claim });
}

/** Organizer decision: approve or reject a (verified) claim. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authError = requireOrganizer(req);
  if (authError) return authError;
  const { id } = await ctx.params;

  const claim = await getClaim(id);
  if (!claim) return NextResponse.json({ error: "claim not found" }, { status: 404 });
  if (claim.status === "minted" || claim.status === "minting") {
    return NextResponse.json({ error: "claim already minted" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const decision = (body as { decision?: string } | null)?.decision;
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json(
      { error: 'decision must be "approve" or "reject"' },
      { status: 400 }
    );
  }

  claim.status = decision === "approve" ? "approved" : "rejected";
  claim.error = undefined;
  await putClaim(claim);
  return NextResponse.json({ claim });
}
