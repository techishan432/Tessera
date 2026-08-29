import { readIssuers, readTokenCount } from "@/lib/stellar";
import { listClaims } from "@/lib/store";

const FALLBACK_WALLET = "GDQZIUOFLL5OPCYTDJE4YO766AJQYZ3XQQIZ6BO27ADKEE24GMX72LYS";

async function fetchStats() {
  try {
    const [credentials, issuers] = await Promise.all([readTokenCount(), readIssuers()]);
    return { credentials, orgs: issuers.length };
  } catch {
    return { credentials: 0, orgs: 3 };
  }
}

/** Most recent minted claim's wallet — the live profile demo target. */
async function liveWallet(): Promise<string> {
  try {
    const claims = await listClaims("minted");
    return claims[0]?.claimantWallet ?? FALLBACK_WALLET;
  } catch {
    return FALLBACK_WALLET;
  }
}

export default async function LandingPage() {
  const { Hero } = await import("@/components/hero");
  const { HowItWorks } = await import("@/components/how-it-works");
  const { StatsStrip } = await import("@/components/stats-strip");
  const { CtaSplit } = await import("@/components/cta-split");
  const { OrgStrip } = await import("@/components/marketing/org-strip");
  const { CredentialAnatomy } = await import("@/components/marketing/credential-anatomy");
  const { Reviews } = await import("@/components/marketing/reviews");
  const { SoulboundSecurity } = await import("@/components/marketing/soulbound-security");
  const { PilotOrgs } = await import("@/components/marketing/pilot-orgs");
  const { Faq } = await import("@/components/marketing/faq");
  const { Roadmap } = await import("@/components/marketing/roadmap");

  const stats = await fetchStats();
  const wallet = await liveWallet();

  return (
    <main>
      <Hero demoWallet={wallet} />
      <OrgStrip />
      <HowItWorks />
      <CredentialAnatomy />
      <StatsStrip credentials={stats.credentials} orgs={stats.orgs} members={stats.credentials} />
      <Reviews />
      <SoulboundSecurity />
      <PilotOrgs />
      <Roadmap />
      <CtaSplit />
      <Faq />
    </main>
  );
}
