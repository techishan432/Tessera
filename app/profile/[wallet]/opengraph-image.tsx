import { ImageResponse } from "next/og";
import { readCredentials } from "@/lib/stellar";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Tessera credential profile";

export default async function OGImage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  const short = wallet.slice(0, 6) + "…" + wallet.slice(-4);

  let count = 0;
  const orgs: string[] = [];
  try {
    const creds = await readCredentials(wallet);
    count = creds.length;
    for (const c of creds) if (!orgs.includes(c.orgName)) orgs.push(c.orgName);
  } catch {
    // leave defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(ellipse at 30% 20%, #14141f 0%, #08080f 70%)",
          color: "#f4f3fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 18,
              height: 18,
              transform: "rotate(45deg)",
              borderRadius: 3,
              background: "linear-gradient(135deg, #8b7cff, #e6c474)",
            }}
          />
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Tessera</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            {`${count} credential${count === 1 ? "" : "s"}`}
          </div>
          <div
            style={{
              fontSize: 34,
              color: "#9b98ac",
              marginTop: 10,
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            {`soulbound to ${short}`}
          </div>
          {orgs.length > 0 && (
            <div style={{ fontSize: 28, color: "#8b7cff", marginTop: 22, display: "flex" }}>
              {`issued by ${orgs.slice(0, 3).join(" · ")}`}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#9b98ac",
          }}
        >
          <span>Non-transferable · Verifiable on-chain</span>
          <span style={{ fontFamily: "monospace" }}>tessera · stellar soroban testnet</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
