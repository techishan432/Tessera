import { NextResponse } from "next/server";
import { getClaim, putClaim } from "@/lib/store";
import { requireOrganizer } from "@/lib/auth";
import { ensureAccount, mintCredential } from "@/lib/stellar";
import { pinJson, pinataConfigured } from "@/lib/ipfs";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  mentoring: "Mentoring",
  talk: "Talk",
  pr: "Open-source contribution",
  other: "Community contribution",
};

/**
 * Mint a soulbound credential for an approved claim (organizer-only):
 *  1. ensure the recipient account exists (sponsored — no XLM needed)
 *  2. pin the badge metadata JSON to IPFS (or keep it local when Pinata is
 *     unconfigured — stored on the claim, served via /api/claims/[id]/metadata)
 *  3. call credential-contract.mint() signed by the pilot org's key
 */
export async function POST(req: Request) {
  const authError = requireOrganizer(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const claimId = (body as { claimId?: string } | null)?.claimId;
  if (!claimId) return NextResponse.json({ error: "claimId is required" }, { status: 400 });

  const claim = await getClaim(claimId);
  if (!claim) return NextResponse.json({ error: "claim not found" }, { status: 404 });
  // "failed" is accepted so the organizer can retry after a mint error.
  if (claim.status !== "approved" && claim.status !== "failed") {
    return NextResponse.json(
      { error: `claim must be approved (or a failed retry) before minting (status: ${claim.status})` },
      { status: 409 }
    );
  }

  claim.status = "minting";
  await putClaim(claim);

  try {
    // 1. Sponsored recipient account.
    const { created } = await ensureAccount(claim.claimantWallet);

    // 2. Metadata to IPFS (or local fallback).
    const metadata: Record<string, unknown> = {
      standard: "tessera-credential/1",
      name: `${claim.issuerOrg} · ${TYPE_LABEL[claim.type] ?? claim.type}`,
      type: claim.type,
      description: claim.description,
      event: claim.event,
      date: claim.date,
      claimant: claim.claimantWallet,
      issuer: { org: claim.issuerOrg },
      evidence: claim.evidence,
      verification: claim.verification
        ? {
            approved: claim.verification.approved,
            confidence: claim.verification.confidence,
            citation: claim.verification.citation,
            provider: claim.verification.provider,
            checkedAt: claim.verification.checkedAt,
          }
        : undefined,
      issuedBy: "Tessera",
    };

    let cid: string;
    if (pinataConfigured()) {
      const pinned = await pinJson(metadata, `tessera-${claim.id}`);
      cid = pinned.cid;
    } else {
      cid = `local:${claim.id}`;
    }
    claim.metadata = metadata;

    // 3. Mint on-chain, signed by the org's issuer key.
    const { tokenId, txHash } = await mintCredential(
      claim.issuerOrg,
      claim.claimantWallet,
      cid
    );

    claim.status = "minted";
    claim.credential = { tokenId, cid, txHash };
    claim.error = undefined;
    await putClaim(claim);

    return NextResponse.json({
      claim,
      recipientCreated: created,
      txHash,
      tokenId,
      cid,
    });
  } catch (e) {
    claim.status = "failed";
    claim.error = (e as Error).message;
    await putClaim(claim);
    return NextResponse.json(
      { error: claim.error, claim },
      { status: 500 }
    );
  }
}
