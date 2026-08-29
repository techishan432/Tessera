import { NextResponse } from "next/server";
import {
  addIssuer,
  issuerKeyForOrg,
  readIssuers,
  removeIssuer,
} from "@/lib/stellar";
import { requireOrganizer } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Public read of registered org issuers. */
export async function GET() {
  try {
    const issuers = await readIssuers();
    return NextResponse.json({ issuers });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/** Organizer: register an org's signing address in the registry. */
export async function POST(req: Request) {
  const authError = requireOrganizer(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null) as
    | { address?: string; orgName?: string }
    | null;
  const address = body?.address?.trim().toUpperCase();
  const orgName = body?.orgName?.trim();
  if (!address || !orgName) {
    return NextResponse.json(
      { error: "address and orgName are required" },
      { status: 400 }
    );
  }

  // The org must have a signing key configured so it can actually mint.
  try {
    issuerKeyForOrg(orgName);
  } catch {
    return NextResponse.json(
      {
        error: `No issuer key configured for "${orgName}" in ORG_ISSUER_KEYS — register the key first.`,
      },
      { status: 400 }
    );
  }

  const adminSecret = process.env.ISSUER_SECRET_KEY;
  if (!adminSecret) {
    return NextResponse.json({ error: "ISSUER_SECRET_KEY not set" }, { status: 500 });
  }

  try {
    const { txHash } = await addIssuer(adminSecret, address, orgName);
    return NextResponse.json({ ok: true, txHash }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/** Organizer: revoke an org issuer (existing credentials stay valid). */
export async function DELETE(req: Request) {
  const authError = requireOrganizer(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null) as { address?: string } | null;
  const address = body?.address?.trim().toUpperCase();
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const adminSecret = process.env.ISSUER_SECRET_KEY;
  if (!adminSecret) {
    return NextResponse.json({ error: "ISSUER_SECRET_KEY not set" }, { status: 500 });
  }

  try {
    const { txHash } = await removeIssuer(adminSecret, address);
    return NextResponse.json({ ok: true, txHash });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
