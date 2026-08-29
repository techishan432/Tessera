"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { CopyButton } from "../ui/copy-button";
import { CredentialCard2D } from "./credential-card-2d";
import type { WallCredential } from "../3d/credential-wall-scene";

const WallScene = dynamic(() => import("../3d/credential-wall-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center text-sm text-muted">
      <span className="animate-pulse">Loading credential wall…</span>
    </div>
  ),
});

export interface ProfileCredential extends WallCredential {
  tokenId: number;
  issuer: string;
  cid: string;
  issuedAt: number;
  metadata: Record<string, unknown> | null;
}

const TYPE_LABEL: Record<string, string> = {
  mentoring: "Mentoring",
  talk: "Talk",
  pr: "Open-source PR",
  other: "Contribution",
};

const CREDENTIAL_CONTRACT_ID =
  "CBU3BDDRG5Z6XOS5JID7FZBOQJE7PZCUUIYZGWTZGS3AGEUPU4RYTF64";

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const cb = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, [query]);
  return matches;
}

export function ProfileClient({
  wallet,
  credentials,
  error,
}: {
  wallet: string;
  credentials: ProfileCredential[];
  error?: string;
}) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useMedia("(min-width: 768px)");
  const [selected, setSelected] = useState<number | null>(null);
  const use3D = isDesktop && !reducedMotion && credentials.length > 0;

  const short = wallet.slice(0, 6) + "…" + wallet.slice(-4);
  const wallItems: WallCredential[] = useMemo(
    () =>
      credentials.map((c, i) => ({
        key: c.cid + i,
        orgName: c.orgName,
        typeLabel: TYPE_LABEL[(c.metadata?.type as string) ?? "other"] ?? TYPE_LABEL.other,
        date: (c.metadata?.date as string) ?? new Date(c.issuedAt * 1000).toISOString().slice(0, 10),
        description:
          (c.metadata?.description as string) ?? "A verified community contribution.",
      })),
    [credentials]
  );

  const sel = selected !== null ? credentials[selected] : null;

  const orgs = useMemo(
    () => new Set(credentials.map((c) => c.orgName)).size,
    [credentials]
  );
  const firstIssued = useMemo(() => {
    if (!credentials.length) return null;
    const ts = Math.min(...credentials.map((c) => c.issuedAt));
    return new Date(ts * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [credentials]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 pb-24 pt-24">
      {/* header */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="mb-2 font-mono text-xs tracking-wider text-muted">{short}</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            The tessera of <span className="bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">{short}</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            {credentials.length === 0
              ? "No credentials yet — this wallet hasn't been issued one."
              : `${credentials.length} soulbound credential${credentials.length === 1 ? "" : "s"}, verifiable on Stellar.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/${wallet}`} label="share" />
          <Link
            href="/onboard"
            className="rounded-full border border-line px-4 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground"
          >
            Get your own →
          </Link>
        </div>
      </motion.header>

      {/* stats row */}
      {credentials.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 grid grid-cols-3 gap-3"
        >
          {[
            [String(credentials.length), "credentials"],
            [String(orgs), orgs === 1 ? "issuing org" : "issuing orgs"],
            [firstIssued ?? "—", "first issued"],
          ].map(([v, l]) => (
            <div key={l} className="glass rounded-2xl px-4 py-3 text-center">
              <p className="truncate font-mono text-sm font-semibold">{v}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{l}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* verification strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface/60 px-5 py-3.5 text-xs text-muted"
      >
        <span className="flex items-center gap-2 font-medium text-foreground/80">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-good">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Verifiable on Soroban testnet
        </span>
        <span className="font-mono">{CREDENTIAL_CONTRACT_ID.slice(0, 12)}…{CREDENTIAL_CONTRACT_ID.slice(-6)}</span>
        <span className="text-muted/60">·</span>
        <span>every credential here was signed by a registered pilot org and cannot be transferred</span>
      </motion.div>

      {error && (
        <div className="mb-6 rounded-xl border border-bad/30 bg-[#ff6b6b14] px-4 py-3 text-sm text-bad">
          Could not read this wallet&apos;s credentials on-chain: {error}
        </div>
      )}

      {credentials.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass flex flex-col items-center gap-6 rounded-3xl px-8 py-20 text-center"
        >
          <span className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-gradient-to-br from-primary to-gold" />
          <div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">No credentials yet</h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
              When an authorized org mints a credential to this wallet, it
              appears here — non-transferable, signed on-chain, and public.
            </p>
          </div>
          <ol className="grid w-full max-w-md gap-3 text-left sm:grid-cols-3">
            {[
              ["1", "Contribute", "Mentor, ship a PR, give a talk."],
              ["2", "Get verified", "The org checks your evidence."],
              ["3", "Watch it land", "It mints here, on-chain."],
            ].map(([n, t, b]) => (
              <li key={n} className="rounded-2xl border border-line bg-background/50 p-4">
                <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft font-mono text-xs text-primary">
                  {n}
                </span>
                <p className="text-xs font-medium">{t}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{b}</p>
              </li>
            ))}
          </ol>
          <Link
            href="/onboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/85"
          >
            Start with onboarding →
          </Link>
        </motion.div>
      ) : use3D ? (
        <>
          <div className="relative h-[560px] w-full overflow-hidden rounded-3xl border border-line [background:var(--wall-bg)]">
            <WallScene
              credentials={wallItems}
              selected={selected}
              onSelect={(i) => setSelected((s) => (s === i ? null : i))}
            />
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-muted/60">
              Click a card to flip
            </p>
          </div>

          {/* detail panel */}
          <motion.div
            key={sel?.key ?? "empty"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass mt-6 rounded-2xl p-6"
          >
            {sel ? (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 max-w-2xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{sel.orgName}</Badge>
                    <Badge tone="gold">
                      {TYPE_LABEL[(sel.metadata?.type as string) ?? "other"] ?? TYPE_LABEL.other}
                    </Badge>
                    <Badge tone="muted">token #{sel.tokenId}</Badge>
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {(sel.metadata?.description as string) ?? "Verified community contribution"}
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">
                    {(sel.metadata?.event as string) ?? ""} ·{" "}
                    {(sel.metadata?.date as string) ?? new Date(sel.issuedAt * 1000).toISOString().slice(0, 10)}
                  </p>
                  {sel.metadata?.verification != null && (
                    <p className="mt-3 border-l-2 border-gold/40 pl-3 text-xs italic text-muted">
                      “{(sel.metadata.verification as { citation?: string }).citation}”
                    </p>
                  )}
                </div>
                <EvidenceLinks evidence={(sel.metadata?.evidence as { url: string; label?: string }[]) ?? []} />
              </div>
            ) : (
              <p className="text-sm text-muted">Select a credential on the wall to inspect its metadata and evidence.</p>
            )}
          </motion.div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wallItems.map((c, i) => (
              <CredentialCard2D
                key={c.key}
                credential={c}
                index={i}
                selected={selected === i}
                onSelect={() => setSelected((s) => (s === i ? null : i))}
              />
            ))}
          </div>
          {sel && (
            <motion.div
              key={sel.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass mt-6 rounded-2xl p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 max-w-2xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{sel.orgName}</Badge>
                    <Badge tone="muted">token #{sel.tokenId}</Badge>
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {(sel.metadata?.description as string) ?? "Verified community contribution"}
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">
                    {(sel.metadata?.event as string) ?? ""} ·{" "}
                    {(sel.metadata?.date as string) ?? new Date(sel.issuedAt * 1000).toISOString().slice(0, 10)}
                  </p>
                  {sel.metadata?.verification != null && (
                    <p className="mt-3 border-l-2 border-gold/40 pl-3 text-xs italic text-muted">
                      “{(sel.metadata.verification as { citation?: string }).citation}”
                    </p>
                  )}
                </div>
                <EvidenceLinks evidence={(sel.metadata?.evidence as { url: string; label?: string }[]) ?? []} />
              </div>
            </motion.div>
          )}
        </>
      )}

      <p className="mt-16 text-center text-xs text-muted/60">
        Credentials are soulbound — they cannot be transferred, traded, or
        deleted except by the holder or the issuing org.
      </p>
    </div>
  );
}

function EvidenceLinks({ evidence }: { evidence: { url: string; label?: string }[] }) {
  if (!evidence.length) return null;
  return (
    <div className="flex flex-col items-end gap-2">
      {evidence.map((e, i) => (
        <a
          key={i}
          href={e.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          {e.label ?? "Evidence"} ↗
        </a>
      ))}
    </div>
  );
}
