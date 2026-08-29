"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClaimCard, type ClaimAction } from "@/components/dashboard/claim-card";
import { IssuersPanel, type Issuer } from "@/components/dashboard/issuers-panel";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Claim = {
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

const KEY_STORAGE = "tessera.organizerKey";

type Filter = "all" | "pending" | "verified" | "approved" | "minted";

const STATUS_META: Record<Exclude<Filter, "all">, { label: string; tone: "muted" | "primary" | "gold" | "good"; dot: string }> = {
  pending: { label: "Pending", tone: "muted", dot: "bg-muted" },
  verified: { label: "Verified", tone: "primary", dot: "bg-primary" },
  approved: { label: "Approved", tone: "gold", dot: "bg-gold" },
  minted: { label: "Minted", tone: "good", dot: "bg-good" },
};

export default function DashboardPage() {
  const [tab, setTab] = useState<"claims" | "issuers">("claims");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [organizerKey, setOrganizerKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [orgFilter, setOrgFilter] = useState("all");

  const keyReady = useRef(false);

  useEffect(() => {
    setOrganizerKey(localStorage.getItem(KEY_STORAGE) ?? "");
    keyReady.current = true;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([
        fetch("/api/claims").then((r) => r.json()),
        fetch("/api/issuers").then((r) => r.json()),
      ]);
      setClaims(c.claims ?? []);
      setIssuers(i.issuers ?? []);
    } catch {
      setNotice("Could not reach the API.");
    }
  }, []);

  useEffect(() => {
    if (keyReady.current) refresh();
  }, [refresh]);

  const setKey = (k: string) => {
    setOrganizerKey(k);
    localStorage.setItem(KEY_STORAGE, k);
  };

  const api = useCallback(
    async (
      path: string,
      body?: unknown,
      headers: Record<string, string> = {},
      method?: "GET" | "POST" | "PATCH" | "DELETE"
    ) => {
      const res = await fetch(path, {
        method: method ?? (body ? "POST" : "GET"),
        headers: { "content-type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
    []
  );

  const onAction = useCallback(
    async (id: string, action: ClaimAction) => {
      setBusy(true);
      setNotice(null);
      try {
        if (action === "verify") {
          const data = await api("/api/verify", { claimId: id });
          const v = (data as { verification?: Claim["verification"] }).verification;
          setNotice(
            v?.approved
              ? "AI verified — auto-approve. Review, then mint."
              : "AI verified — flagged for manual review."
          );
        } else if (action === "approve" || action === "reject") {
          await api(`/api/claims/${id}`, { decision: action }, { "x-organizer-key": organizerKey }, "PATCH");
          if (action === "approve") {
            setJustApproved(id);
            setTimeout(() => setJustApproved(null), 1000);
          }
        } else if (action === "mint") {
          const data = await api("/api/mint", { claimId: id }, { "x-organizer-key": organizerKey });
          const c = (data as { claim?: Claim }).claim;
          setNotice(`Minted token #${c?.credential?.tokenId ?? "?"} on testnet.`);
        }
        await refresh();
      } catch (e) {
        setNotice((e as Error).message);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [api, organizerKey, refresh]
  );

  const onAddIssuer = useCallback(
    async (address: string, orgName: string) => {
      setBusy(true);
      try {
        await api("/api/issuers", { address, orgName }, { "x-organizer-key": organizerKey });
        await refresh();
        return null;
      } catch (e) {
        return (e as Error).message;
      } finally {
        setBusy(false);
      }
    },
    [api, organizerKey, refresh]
  );

  const onRemoveIssuer = useCallback(
    async (address: string) => {
      setBusy(true);
      try {
        await api("/api/issuers", { address }, { "x-organizer-key": organizerKey }, "DELETE");
        await refresh();
        return null;
      } catch (e) {
        return (e as Error).message;
      } finally {
        setBusy(false);
      }
    },
    [api, organizerKey, refresh]
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: claims.length, pending: 0, verified: 0, approved: 0, minted: 0 };
    for (const claim of claims) {
      if (claim.status in c) c[claim.status as Filter]++;
    }
    return c;
  }, [claims]);

  const visibleClaims = useMemo(
    () =>
      claims.filter(
        (c) =>
          (filter === "all" || c.status === filter) &&
          (orgFilter === "all" || c.issuerOrg === orgFilter)
      ),
    [claims, filter, orgFilter]
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-24 pt-24">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Organizer console</p>
            <Badge tone="muted">
              <span className="h-1.5 w-1.5 rounded-full bg-good" /> testnet
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={organizerKey}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Organizer API key"
            className="h-9 w-56 text-xs"
          />
          <Badge tone={organizerKey.length > 0 ? "good" : "bad"}>
            {organizerKey.length > 0 ? "connected" : "no key"}
          </Badge>
        </div>
      </header>

      {/* status summary — click a card to filter */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["pending", "verified", "approved", "minted"] as const).map((s) => {
          const m = STATUS_META[s];
          const active = filter === s;
          return (
            <motion.button
              key={s}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilter(active ? "all" : s)}
              className={
                "glass rounded-2xl px-5 py-4 text-left transition-colors " +
                (active ? "border-primary/60 bg-primary-soft" : "hover:border-line/80")
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-semibold tabular-nums">{counts[s]}</span>
                <span className={"h-2 w-2 rounded-full " + m.dot} />
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                {m.label}
                {active && <span className="ml-1 text-primary">· filtered</span>}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* tabs + org filter */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1 w-fit">
          {(["claims", "issuers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "relative rounded-full px-5 py-1.5 text-sm transition-colors " +
                (tab === t ? "text-white" : "text-muted hover:text-foreground")
              }
            >
              {tab === t && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ duration: 0.25 }}
                />
              )}
              <span className="relative capitalize">
                {t}
                {t === "claims" && (
                  <span className="ml-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {counts.all}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {tab === "claims" && (
          <div className="flex items-center gap-2">
            <Select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="h-9 w-44 text-xs"
              aria-label="Filter by org"
            >
              <option value="all">All orgs</option>
              {issuers.map((i) => (
                <option key={i.address} value={i.orgName}>
                  {i.orgName}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Close" : "+ New claim"}
            </Button>
          </div>
        )}
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-foreground/90">
          {notice}
        </div>
      )}

      <AnimatePresence mode="wait">
        {tab === "claims" ? (
          <motion.section
            key="claims"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <AnimatePresence>
              {showForm && (
                <NewClaimForm
                  issuers={issuers.map((i) => i.orgName)}
                  onSubmit={async (payload) => {
                    try {
                      await api("/api/claims", payload);
                      await refresh();
                      setShowForm(false);
                      setNotice("Claim submitted.");
                    } catch (e) {
                      setNotice((e as Error).message);
                    }
                  }}
                />
              )}
            </AnimatePresence>

            <ul className="space-y-4">
              <AnimatePresence>
                {visibleClaims.map((c) => (
                  <ClaimCard
                    key={c.id}
                    claim={c}
                    busy={busy}
                    onAction={onAction}
                    justApproved={justApproved === c.id}
                  />
                ))}
              </AnimatePresence>
              {visibleClaims.length === 0 && (
                <li className="glass rounded-2xl px-6 py-14 text-center text-sm text-muted">
                  {claims.length === 0
                    ? "No claims yet. Submit one with “+ New claim”, or run the seed script for a pre-populated demo."
                    : "No claims match this filter."}
                </li>
              )}
            </ul>
          </motion.section>
        ) : (
          <motion.section
            key="issuers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <IssuersPanel
              issuers={issuers}
              onAdd={onAddIssuer}
              onRemove={onRemoveIssuer}
              busy={busy}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

function NewClaimForm({
  issuers,
  onSubmit,
}: {
  issuers: string[];
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [type, setType] = useState("pr");
  const [description, setDescription] = useState("");
  const [event, setEvent] = useState("");
  const [date, setDate] = useState("");
  const [claimantWallet, setClaimantWallet] = useState("");
  const [issuerOrg, setIssuerOrg] = useState(issuers[0] ?? "");
  const [evidence, setEvidence] = useState("https://");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    await onSubmit({
      type,
      description,
      event,
      date,
      claimantWallet,
      issuerOrg,
      evidence: evidence
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ kind: "link", url })),
    });
    setSending(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="glass mb-6 grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="mentoring">Mentoring</option>
            <option value="pr">Open-source PR</option>
            <option value="talk">Talk</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Issuing org">
          <Select value={issuerOrg} onChange={(e) => setIssuerOrg(e.target.value)}>
            {issuers.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was contributed?"
            />
          </Field>
        </div>
        <Field label="Event">
          <Input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="HackSpire 2026" />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Claimant wallet (G…)" hint="The member's Stellar address — get one at /onboard if they don't have a wallet.">
          <Input
            value={claimantWallet}
            onChange={(e) => setClaimantWallet(e.target.value.toUpperCase())}
            placeholder="GB…"
            className="font-mono text-xs"
          />
        </Field>
        <Field label="Evidence links (one per line)" hint="GitHub PR URLs are machine-checked live (merged? author?).">
          <Textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder={"https://github.com/org/repo/pull/123\nhttps://event.example.org/attendance"}
            className="font-mono text-xs"
          />
        </Field>
        <div className="flex items-end">
          <Button onClick={submit} disabled={sending} className="w-full sm:w-auto">
            {sending ? "Submitting…" : "Submit claim"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
