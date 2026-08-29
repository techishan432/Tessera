import { NextResponse } from "next/server";
import { createSponsoredAccount } from "@/lib/stellar";

export const dynamic = "force-dynamic";

/**
 * Wallet onboarding for members with no Stellar wallet: generate a fresh
 * account and have the operator/sponsor fund it with the 1 XLM reserve, so
 * the member never needs testnet XLM of their own. The secret key is returned
 * exactly once for import into Freighter (or any Stellar wallet).
 */
export async function POST() {
  try {
    const account = await createSponsoredAccount();
    return NextResponse.json(account, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
