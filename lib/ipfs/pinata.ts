/**
 * Pinata IPFS upload for credential metadata JSON. Only the resulting CID is
 * stored on-chain; the profile page fetches the document from a gateway.
 */

const API_BASE = "https://api.pinata.cloud";
const GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/"];

export function pinataConfigured(): boolean {
  return Boolean(process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET);
}

export async function pinJson(
  data: unknown,
  name: string
): Promise<{ cid: string; gateway: string }> {
  const key = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_API_SECRET;
  if (!key || !secret) {
    throw new Error("PINATA_API_KEY / PINATA_API_SECRET are not set");
  }

  const res = await fetch(`${API_BASE}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      api_key: key,
      api_secret: secret,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name,
      metadata: { name, description: "Tessera credential metadata" },
      value: data,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pinata ${res.status}: ${body.slice(0, 300)}`);
  }
  const data2 = (await res.json()) as { IpfsHash?: string };
  if (!data2.IpfsHash) throw new Error("Pinata response missing IpfsHash");
  return { cid: data2.IpfsHash, gateway: GATEWAYS[0] };
}

/** Gateway URLs to try when resolving a CID (profile page). */
export function cidGateways(cid: string): string[] {
  return GATEWAYS.map((g) => `${g}${cid}`);
}
