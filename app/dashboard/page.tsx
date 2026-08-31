"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
const G_ADDRESS = /^G[A-Z2-7]{55}$/;

const subscribeNoop = () => () => {};
function readStoredKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

type Filter = "all" | "pending" | "verified" | "approved" | "minted" | "failed";

const STATUS_META: Record<Exclude<Filter, "all">, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-muted" },
  verified: { label: "Verified", dot: "bg-primary" },
  approved: { label: "Approved", dot: "bg-gold" },
  minted: { label: "Minted", dot: "bg-good" },
  failed: { label: "Failed", dot: "bg-bad" },
};

type Notice = { kind: "ok" | "err"; text: string } | null;

export default function DashboardPage() {
  const [tab, setTab] = useState<"claims" | "issuers">("claims");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [issuerError, setIssuerError] = useState<string | null>(null);
  const [keyOverride, setKeyOverride] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [orgFilter, setOrgFilter] = useState("all");

  // Organizer key: persisted in this browser (hydration-safe read), with a
  // session override so sign-in/out updates immediately.
  const storedKey = useSyncExternalStore(subscribeNoop, readStoredKey, () => "");
  const organizerKey = keyOverride ?? storedKey;
  const signedIn = organizerKey.length > 0;

  const refresh = useCallback(async () => {
    try {
      const [c, iRes] = await Promise.all([
        fetch("/api/claims").then((r) => r.json()),
        fetch("/api/issuers"),
      ]);
      const i = await iRes.json().catch(() => ({}));
      setClaims(c.claims ?? []);
      setIssuers(i.issuers ?? []);
      setIssuerError(iRes.ok ? null : i.error ?? `issuer API error (HTTP ${iRes.status})`);
    } catch {
      setNotice({ kind: "err", text: "Could not reach the API." });
    }
  }, []);

  useEffect(() => {
    // Initial load (local IIFE so the effect body has no direct setState).
    (async () => {
      try {
        const [c, iRes] = await Promise.all([
          fetch("/api/claims").then((r) => r.json()),
          fetch("/api/issuers"),
        ]);
        const i = await iRes.json().catch(() => ({}));
        setClaims(c.claims ?? []);
        setIssuers(i.issuers ?? []);
        setIssuerError(iRes.ok ? null : i.error ?? `issuer API error (HTTP ${iRes.status})`);
      } catch {
        setNotice({ kind: "err", text: "Could not reach the API." });
      }
    })();
  }, []);

  const signIn = (k: string) => {
    const key = k.trim();
    if (!key) return;
    try {
      localStorage.setItem(KEY_STORAGE, key);
    } catch {
      /* private mode — key lives for the session only */
    }
    setKeyOverride(key);
    setKeyDraft("");
    setNotice({ kind: "ok", text: "Signed in as organizer — you can approve, reject, and mint." });
  };

  const signOut = () => {
    try {
      localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* non-fatal */
    }
    setKeyOverride(null);
    setNotice({ kind: "ok", text: "Signed out — read-only mode." });
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
      if (!signedIn) {
        setNotice({ kind: "err", text: "Sign in as organizer first — approve, reject, and mint need the organizer key." });
        return;
      }
      setBusyId(id);
      setNotice(null);
      try {
        if (action === "verify") {
          const data = await api("/api/verify", { claimId: id });
          const c = (data as { claim?: Claim }).claim;
          setNotice(
            c?.status === "approved"
              ? { kind: "ok", text: "AI verified — confidence at/above threshold, auto-approved. Mint when ready." }
              : { kind: "ok", text: "AI verified — flagged for manual review. Approve or reject below." }
          );
        } else if (action === "approve" || action === "reject") {
          await api(`/api/claims/${id}`, { decision: action }, { "x-organizer-key": organizerKey }, "PATCH");
          if (action === "approve") {
            setJustApproved(id);
            setTimeout(() => setJustApproved(null), 1000);
            setNotice({ kind: "ok", text: "Claim approved — mint it when ready." });
          } else {
            setNotice({ kind: "ok", text: "Claim rejected." });
          }
        } else if (action === "mint") {
          const data = await api("/api/mint", { claimId: id }, { "x-organizer-key": organizerKey });
          const c = (data as { claim?: Claim }).claim;
          setNotice({
            kind: "ok",
            text: `Minted token #${c?.credential?.tokenId ?? "?"} on testnet — it's live on the member's credential wall.`,
          });
        }
        await refresh();
      } catch (e) {
        setNotice({ kind: "err", text: (e as Error).message });
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [api, organizerKey, refresh, signedIn]
  );

  const onAddIssuer = useCallback(
    async (address: string, orgName: string) => {
      if (!signedIn) return "Sign in as organizer first.";
      setBusyId("issuers");
      try {
        await api("/api/issuers", { address, orgName }, { "x-organizer-key": organizerKey });
        await refresh();
        return null;
      } catch (e) {
        return (e as Error).message;
      } finally {
        setBusyId(null);
      }
    },
    [api, organizerKey, refresh, signedIn]
  );

  const onRemoveIssuer = useCallback(
    async (address: string) => {
      if (!signedIn) return "Sign in as organizer first.";
      setBusyId("issuers");
      try {
        await api("/api/issuers", { address }, { "x-organizer-key": organizerKey }, "DELETE");
        await refresh();
        return null;
      } catch (e) {
        return (e as Error).message;
      } finally {
        setBusyId(null);
      }
    },
    [api, organizerKey, refresh, signedIn]
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: claims.length, pending: 0, verified: 0, approved: 0, minted: 0, failed: 0 };
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
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">
            The claim queue for your community. Verify with AI, approve or
            reject, and mint — the org&apos;s own wallet signs each credential
            on-chain.
          </p>
        </div>
        {signedIn && (
          <div className="flex items-center gap-2">
            <Badge tone="good">
              <span className="h-1.5 w-1.5 rounded-full bg-good" /> organizer signed in
            </Badge>
            <Button size="sm" variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}
      </header>

      {/* organizer sign-in (when no key) */}
      <AnimatePresence>
        {!signedIn && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass mb-6 flex flex-wrap items-center gap-4 rounded-2xl border-primary/40 bg-primary-soft px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Sign in as organizer</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Paste the shared <span className="font-mono text-[11px]">ORGANIZER_API_KEY</span> to
                  verify, approve, reject, and mint. It&apos;s stored only in this browser and sent
                  with each action — you can browse the queue without it.
                </p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn(keyDraft)}
                  placeholder="Organizer API key"
                  className="h-9 w-full text-xs sm:w-56"
                />
                <Button size="sm" variant="gold" onClick={() => signIn(keyDraft)} disabled={!keyDraft.trim()}>
                  Sign in
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* status summary — click a card to filter */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(["pending", "verified", "approved", "minted", "failed"] as const).map((s) => {
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
        <div
          className={
            "mb-5 rounded-xl border px-4 py-3 text-sm " +
            (notice.kind === "ok"
              ? "border-good/30 bg-good/10 text-foreground/90"
              : "border-bad/30 bg-bad/10 text-bad")
          }
          role="status"
        >
          {notice.text}
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
                      setNotice({ kind: "ok", text: "Claim submitted — it's in the queue below." });
                    } catch (e) {
                      throw e;
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
                    busy={busyId === c.id}
                    canAct={signedIn}
                    onAction={onAction}
                    justApproved={justApproved === c.id}
                  />
                ))}
              </AnimatePresence>
              {visibleClaims.length === 0 && (
                <li className="glass rounded-2xl px-6 py-14 text-center text-sm text-muted">
                  {claims.length === 0 ? (
                    <>
                      No claims yet. Submit one with{" "}
                      <button
                        onClick={() => setShowForm(true)}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        + New claim
                      </button>
                      , or let members file claims from{" "}
                      <Link href="/onboard" className="text-primary underline-offset-4 hover:underline">
                        /onboard
                      </Link>
                      .
                    </>
                  ) : (
                    "No claims match this filter."
                  )}
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
            <IssuersPanel issuers={issuers} onAdd={onAddIssuer} onRemove={onRemoveIssuer} busy={busyId === "issuers"} error={issuerError} />
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
  const [evidence, setEvidence] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function reset() {
    setType("pr");
    setDescription("");
    setEvent("");
    setDate("");
    setClaimantWallet("");
    setIssuerOrg(issuers[0] ?? "");
    setEvidence("");
    setFormError(null);
  }

  async function submit() {
    setFormError(null);
    if (!description.trim()) return setFormError("Add a short description of the contribution.");
    if (!event.trim()) return setFormError("Add the event or program this was part of.");
    if (!date) return setFormError("Pick the date of the contribution.");
    if (!G_ADDRESS.test(claimantWallet))
      return setFormError("Claimant wallet must be a valid Stellar G address (56 chars).");
    if (!issuerOrg) return setFormError("Choose the issuing organization.");
    const urls = evidence
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) return setFormError("Add at least one evidence link (one per line).");
    for (const url of urls) {
      if (!/^https?:\/\/\S+$/i.test(url)) return setFormError(`"${url}" is not a valid http(s) URL.`);
    }
    setSending(true);
    try {
      await onSubmit({
        type,
        description: description.trim(),
        event: event.trim(),
        date,
        claimantWallet: claimantWallet.trim().toUpperCase(),
        issuerOrg,
        evidence: urls.map((url) => ({ kind: "link", url })),
      });
      reset();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSending(false);
    }
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
        <p className="-mt-1 text-xs font-medium uppercase tracking-wider text-muted sm:col-span-2">
          New claim — on behalf of a member
        </p>
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
        <Field
          label="Claimant wallet (G…)"
          hint="The member's Stellar address — get one at /onboard if they don't have a wallet."
        >
          <Input
            value={claimantWallet}
            onChange={(e) => setClaimantWallet(e.target.value.toUpperCase())}
            placeholder="GB…"
            className="font-mono text-xs"
          />
        </Field>
        <Field
          label="Evidence links (one per line)"
          hint="GitHub PR URLs are machine-checked live (merged? author?)."
        >
          <Textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder={"https://github.com/org/repo/pull/123\nhttps://event.example.org/attendance"}
            className="font-mono text-xs"
          />
        </Field>
        {formError && (
          <p className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-2.5 text-xs text-bad sm:col-span-2">
            {formError}
          </p>
        )}
        <div className="flex items-end gap-3">
          <Button onClick={submit} disabled={sending} className="w-full sm:w-auto">
            {sending ? "Submitting…" : "Submit claim"}
          </Button>
          <button onClick={reset} className="text-xs text-muted underline-offset-4 hover:underline">
            Clear
          </button>
        </div>
      </div>
    </motion.div>
  );
}
