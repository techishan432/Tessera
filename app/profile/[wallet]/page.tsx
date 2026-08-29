import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readCredentials } from "@/lib/stellar";
import { getClaim } from "@/lib/store";
import { ProfileClient, type ProfileCredential } from "@/components/profile/profile-client";

const G_ADDRESS = /^G[A-Z2-7]{55}$/;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wallet: string }>;
}): Promise<Metadata> {
  const { wallet } = await params;
  if (!G_ADDRESS.test(wallet)) return { title: "Profile not found" };
  const short = wallet.slice(0, 6) + "…" + wallet.slice(-4);
  let count = 0;
  try {
    count = (await readCredentials(wallet)).length;
  } catch {
    // leave 0 — the page handles the error state
  }
  return {
    title: `${short}'s Tessera — ${count} credential${count === 1 ? "" : "s"}`,
    description: `Soulbound credentials issued to ${short} on Stellar — a portable, verifiable record of community contribution.`,
    openGraph: {
      title: `${short}'s Tessera`,
      description: `${count} soulbound credential${count === 1 ? "" : "s"} on Stellar — proof of community contribution.`,
      type: "profile",
    },
  };
}

async function fetchMetadata(cid: string): Promise<Record<string, unknown> | null> {
  if (cid.startsWith("local:")) {
    const claim = await getClaim(cid.slice("local:".length));
    return (claim?.metadata as Record<string, unknown> | undefined) ?? null;
  }
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
  ];
  for (const url of gateways) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      // try next gateway
    }
  }
  return null;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  const normalized = wallet.toUpperCase();
  if (!G_ADDRESS.test(normalized)) notFound();

  let credentials: ProfileCredential[] = [];
  let error: string | null = null;
  try {
    const onchain = await readCredentials(normalized);
    credentials = await Promise.all(
      onchain.map(async (c, i) => {
        const metadata = await fetchMetadata(c.cid);
        return {
          key: `${c.cid}-${i}`,
          tokenId: c.id,
          holder: c.holder,
          issuer: c.issuer,
          cid: c.cid,
          issuedAt: c.issuedAt,
          orgName: c.orgName,
          typeLabel: (metadata?.type as string) ?? "contribution",
          date: (metadata?.date as string) ?? new Date(c.issuedAt * 1000).toISOString().slice(0, 10),
          description: (metadata?.description as string) ?? "A verified community contribution.",
          metadata,
        };
      })
    );
  } catch (e) {
    error = (e as Error).message;
  }

  return <ProfileClient wallet={normalized} credentials={credentials} error={error ?? undefined} />;
}
