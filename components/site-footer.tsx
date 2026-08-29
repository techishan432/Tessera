"use client";

import Link from "next/link";
import { Badge } from "./ui/badge";
import { CopyButton } from "./ui/copy-button";
import { OrgLogo } from "./org-logo";

const CREDENTIAL_CONTRACT_ID =
  "CBU3BDDRG5Z6XOS5JID7FZBOQJE7PZCUUIYZGWTZGS3AGEUPU4RYTF64";
const REGISTRY_CONTRACT_ID =
  "CD2MLVE5YNLFELC4FKV5NDYFJ3YRN6IQXEQXUNCXTIFZLUUTNFZCK7AH";

const productLinks = [
  { href: "/#how", label: "How it works" },
  { href: "/dashboard", label: "Organizer dashboard" },
  { href: "/onboard", label: "Wallet onboarding" },
  { href: "/profile/GDQZIUOFLL5OPCYTDJE4YO766AJQYZ3XQQIZ6BO27ADKEE24GMX72LYS", label: "Live profile" },
];

const orgLinks = [
  { href: "https://www.acm.org/", label: "FIEM ACM" },
  { href: "https://gdg.community.dev/gdgs/", label: "GDG Groups" },
  { href: "https://hack4bengal.com/", label: "HackSpire" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/30">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
          {/* brand */}
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
              <span className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-gradient-to-br from-primary to-gold" />
              <span className="text-base font-semibold tracking-tight">Tessera</span>
            </Link>
            <p className="mb-5 max-w-xs text-xs leading-relaxed text-muted">
              Soulbound credentials on Stellar for verified real-world community
              contribution — a portable, verifiable Web3 resume.
            </p>
            <Badge tone="good">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />
              Live on Soroban testnet
            </Badge>
          </div>

          {/* product */}
          <nav aria-label="Product">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">Product</p>
            <ul className="space-y-2.5 text-sm">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* pilot orgs */}
          <nav aria-label="Pilot communities">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">Pilot communities</p>
            <ul className="space-y-2.5 text-sm">
              {orgLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 text-muted transition-colors hover:text-foreground"
                  >
                    <OrgLogo name={l.label} size={22} rounded="rounded-md" className="opacity-80 group-hover:opacity-100" />
                    {l.label} <span aria-hidden>↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* verify */}
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">Verify on-chain</p>
            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-background/50 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">credential-contract</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://soroban.testnet.stellar.org/contract/${CREDENTIAL_CONTRACT_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-[11px] text-primary hover:underline"
                  >
                    {CREDENTIAL_CONTRACT_ID}
                  </a>
                  <CopyButton text={CREDENTIAL_CONTRACT_ID} />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-background/50 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">issuer-registry</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://soroban.testnet.stellar.org/contract/${REGISTRY_CONTRACT_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-[11px] text-primary hover:underline"
                  >
                    {REGISTRY_CONTRACT_ID}
                  </a>
                  <CopyButton text={REGISTRY_CONTRACT_ID} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted/70 sm:flex-row">
          <span>© 2026 Tessera · Built on Stellar Soroban</span>
          <span>Credentials are non-transferable by contract design · Testnet build</span>
        </div>
      </div>
    </footer>
  );
}
