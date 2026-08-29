"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "../ui/badge";
import { ConfidenceMeter } from "../ui/meter";
import { Button } from "../ui/button";
import { CopyButton } from "../ui/copy-button";
import { OrgLogo } from "../org-logo";
import Link from "next/link";

export type ClaimAction = "verify" | "approve" | "reject" | "mint";

export function ClaimCard({
  claim,
  busy,
  onAction,
  justApproved,
}: {
  claim: StoredClaimLocal;
  busy: boolean;
  onAction: (id: string, action: ClaimAction) => void;
  justApproved: boolean;
}) {
  const shortWallet =
    claim.claimantWallet.slice(0, 6) + "…" + claim.claimantWallet.slice(-4);
  const v = claim.verification;

  const actions: { action: ClaimAction; label: string; show: boolean; variant?: "primary" | "gold" | "outline" }[] = [
    { action: "verify", label: "Run AI verify", show: claim.status === "pending", variant: "primary" },
    { action: "approve", label: "Approve", show: claim.status === "pending" || claim.status === "verified", variant: "gold" },
    { action: "reject", label: "Reject", show: claim.status === "pending" || claim.status === "verified", variant: "outline" },
    { action: "mint", label: "Mint credential", show: claim.status === "approved", variant: "primary" },
  ];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group glass relative overflow-hidden rounded-2xl p-5"
    >
      {/* approve pulse */}
      <AnimatePresence>
        {justApproved && (
          <motion.span
            key="pulse"
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="pointer-events-none absolute left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-gold/40"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2">
              <OrgLogo name={claim.issuerOrg} size={22} rounded="rounded-md" />
              <Badge tone="primary">{claim.issuerOrg}</Badge>
            </span>
            <Badge tone="muted">{TYPE_LABEL[claim.type] ?? claim.type}</Badge>
            <StatusBadge status={claim.status} />
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/90">{claim.description}</p>
          <p className="mt-1.5 text-xs text-muted">
            {claim.event} · {claim.date} · claimant {shortWallet} · submitted{" "}
            {formatDate(claim.createdAt)}
          </p>
          <EvidenceLinks evidence={claim.evidence} />
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={claim.claimantWallet} label="wallet" />
          {claim.status === "minted" && claim.credential && (
            <Link
              href={`/profile/${claim.claimantWallet}`}
              className="rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs text-gold transition-colors hover:bg-gold/25"
            >
              View profile →
            </Link>
          )}
        </div>
      </div>

      {v && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            AI verdict · {v.provider}
          </span>
          <ConfidenceMeter value={v.confidence} />
          <span className="min-w-0 flex-1 truncate text-xs text-muted" title={v.citation}>
            “{v.citation}”
          </span>
          {v.approved ? (
            <Badge tone="good">auto-approve</Badge>
          ) : (
            <Badge tone="gold">manual review</Badge>
          )}
        </div>
      )}

      {claim.status === "failed" && claim.error && (
        <p className="mt-3 rounded-xl border border-bad/30 bg-[#ff6b6b14] px-4 py-2.5 text-xs text-bad">
          {claim.error}
        </p>
      )}
      {claim.status === "minted" && claim.credential && (
        <p className="mt-3 font-mono text-[11px] text-muted">
          token #{claim.credential.tokenId} · {claim.credential.cid}
        </p>
      )}

      {/* hover-reveal actions */}
      <div className="mt-4 flex flex-wrap gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        {actions
          .filter((a) => a.show)
          .map((a) => (
            <Button
              key={a.action}
              size="sm"
              variant={a.variant ?? "outline"}
              disabled={busy}
              onClick={() => onAction(claim.id, a.action)}
            >
              {a.label}
              {busy && (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="inline-block h-3 w-3 rounded-full border border-current border-t-transparent"
                  aria-label="working"
                />
              )}
            </Button>
          ))}
      </div>
    </motion.li>
  );
}

const TYPE_LABEL: Record<string, string> = {
  mentoring: "Mentoring",
  talk: "Talk",
  pr: "Open-source PR",
  other: "Contribution",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "default" | "primary" | "gold" | "good" | "bad" | "muted"; label: string }> = {
    pending: { tone: "muted", label: "Pending" },
    verified: { tone: "primary", label: "Verified" },
    approved: { tone: "gold", label: "Approved" },
    rejected: { tone: "bad", label: "Rejected" },
    minting: { tone: "primary", label: "Minting…" },
    minted: { tone: "good", label: "Minted" },
    failed: { tone: "bad", label: "Failed" },
  };
  const m = map[status] ?? { tone: "muted" as const, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Local mirror of the API's claim shape (types only). */
type StoredClaimLocal = {
  id: string;
  type: string;
  description: string;
  event: string;
  date: string;
  claimantWallet: string;
  issuerOrg: string;
  evidence: { kind: string; url: string; label?: string }[];
  status: string;
  createdAt: string;
  verification?: {
    approved: boolean;
    confidence: number;
    citation: string;
    provider: string;
    model: string;
    checkedAt: string;
    error?: string;
  };
  credential?: { tokenId: number; cid: string; txHash: string };
  error?: string;
};

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function EvidenceLinks({ evidence }: { evidence: { kind: string; url: string; label?: string }[] }) {
  if (!evidence.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {evidence.map((e, i) => (
        <a
          key={i}
          href={e.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] text-muted transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {e.kind === "attachment" ? "📎" : "🔗"}
          {e.label ?? hostOf(e.url)}
          <span aria-hidden>↗</span>
        </a>
      ))}
    </div>
  );
}
