"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea, Field } from "@/components/ui/field";

// Wallets Kit renders a provider/modal — client-only.
const WalletKit = dynamic(
  () => import("@/components/onboard/wallet-kit-wrapper").then((m) => m.WalletKitWrapper),
  { ssr: false }
);

const WALLET_STORAGE = "tessera.wallet";
const G_ADDRESS = /^G[A-Z2-7]{55}$/;
const CLAIM_TYPES = [
  ["mentoring", "Mentoring"],
  ["pr", "Open-source PR"],
  ["talk", "Talk / workshop"],
  ["other", "Other contribution"],
] as const;

type Step = "intro" | "connect" | "create" | "reveal" | "confirm" | "claim" | "done";

type EvidenceRow = { kind: "link" | "attachment"; url: string };

type ClaimDraft = {
  type: string;
  description: string;
  event: string;
  date: string;
  issuerOrg: string;
  evidence: EvidenceRow[];
};

type ClaimRecord = {
  id: string;
  status: string;
  verification?: {
    approved: boolean;
    confidence: number;
    citation: string;
    provider?: string;
    model?: string;
    error?: string;
  };
  credential?: { tokenId: number; cid: string; txHash: string };
  error?: string;
};

const stepProps = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

const ONBOARD_FAQS = [
  {
    q: "What is a soulbound credential?",
    a: "A non-transferable record on Stellar, issued by an authorized community org. It proves a specific contribution — mentoring, a merged PR, a talk — and can only be revoked by you or that org. It can never be sold or moved to another wallet.",
  },
  {
    q: "Do I need XLM or crypto experience?",
    a: "No. If you don't have a wallet, Tessera sponsors one on testnet — funded with the 1 XLM base reserve so credentials can arrive. You never pay anything.",
  },
  {
    q: "What happens to my secret key?",
    a: "It's generated fresh and shown to you once. Tessera never stores it. Import it into Freighter (or keep it safe) — it's the only proof of ownership of your wallet.",
  },
  {
    q: "What happens after I submit a claim?",
    a: "Your claim enters the organization's review queue. The AI verifier checks your evidence, the organizer approves, and the org's own wallet mints the credential on-chain. You can watch every stage from this page or your profile.",
  },
  {
    q: "Why testnet?",
    a: "This build runs on Soroban testnet — a public test network. The same flows run on mainnet once the pilot communities graduate. Your records here are for the pilot.",
  },
];

const LIFECYCLE = ["pending", "verified", "approved", "minted"] as const;
const LIFECYCLE_LABELS: Record<(typeof LIFECYCLE)[number], string> = {
  pending: "In queue",
  verified: "AI verified",
  approved: "Approved",
  minted: "Minted on-chain",
};

const subscribeNoop = () => () => {};
function readStoredWallet(): string | null {
  try {
    const v = localStorage.getItem(WALLET_STORAGE);
    return v && G_ADDRESS.test(v) ? v : null;
  } catch {
    return null;
  }
}

export default function OnboardPage() {
  const [step, setStep] = useState<Step>("intro");
  const [wallet, setWallet] = useState<string | null>(null);
  // Wallet persisted by this browser in a previous visit (client-only,
  // hydration-safe: the server snapshot is always null).
  const storedWallet = useSyncExternalStore(subscribeNoop, readStoredWallet, () => null);
  const activeWallet = wallet ?? storedWallet;
  const restored = !wallet && !!storedWallet;
  // A returning visitor lands on the identity step instead of the intro.
  const displayStep: Step = step === "intro" && !wallet && storedWallet ? "confirm" : step;
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ address: string; secretKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // claim form
  const [issuers, setIssuers] = useState<{ address: string; orgName: string }[]>([]);
  const [issuersError, setIssuersError] = useState(false);
  const [draft, setDraft] = useState<ClaimDraft>({
    type: "mentoring",
    description: "",
    event: "",
    date: "",
    issuerOrg: "",
    evidence: [{ kind: "link", url: "" }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [myClaim, setMyClaim] = useState<ClaimRecord | null>(null);

  const loadIssuers = useCallback(async () => {
    try {
      const r = await fetch("/api/issuers");
      const d = await r.json();
      if (!r.ok) throw new Error();
      setIssuers(d.issuers ?? []);
      setIssuersError(false);
    } catch {
      setIssuersError(true);
    }
  }, []);

  // Load the registered organizations once on mount.
  useEffect(() => {
    loadIssuers();
  }, [loadIssuers]);

  // While tracking the submitted claim, poll for lifecycle changes.
  const trackingClaimId = myClaim?.id;
  useEffect(() => {
    if (step !== "done" || !trackingClaimId) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/claims");
        const d = await r.json();
        const c = (d.claims ?? []).find((x: ClaimRecord) => x.id === trackingClaimId);
        if (alive && c) setMyClaim(c);
      } catch {
        /* transient — next tick retries */
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [step, trackingClaimId]);

  const rememberWallet = useCallback((address: string) => {
    try {
      localStorage.setItem(WALLET_STORAGE, address);
    } catch {
      /* non-fatal */
    }
    setWallet(address);
  }, []);

  const handleConnected = useCallback(
    (address: string) => {
      rememberWallet(address);
      setError(null);
      setStep("confirm");
    },
    [rememberWallet]
  );

  async function createSponsored() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "could not create account");
      setCreated(data);
      setStep("reveal");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function continueFromReveal() {
    if (!created) return;
    rememberWallet(created.address);
    setError(null);
    setStep("confirm");
  }

  function startOver() {
    try {
      localStorage.removeItem(WALLET_STORAGE);
    } catch {
      /* non-fatal */
    }
    setWallet(null);
    setError(null);
    setStep("intro");
  }

  async function submitClaim() {
    setError(null);
    if (!activeWallet) {
      setError("No wallet selected yet — connect or create one first.");
      return;
    }
    if (!draft.description.trim()) return setError("Describe your contribution in a sentence or two.");
    if (!draft.event.trim()) return setError("Add the event or program this was part of.");
    if (!draft.date) return setError("Pick the date of your contribution.");
    if (!draft.issuerOrg) return setError("Choose the organization that should issue this credential.");
    const rows = draft.evidence.filter((e) => e.url.trim());
    if (rows.length === 0) return setError("Add at least one evidence link — a URL the org can check.");
    for (const row of rows) {
      if (!/^https?:\/\/\S+$/i.test(row.url.trim()))
        return setError("Evidence must be an http(s) URL.");
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: draft.type,
          description: draft.description.trim(),
          event: draft.event.trim(),
          date: draft.date,
          claimantWallet: activeWallet,
          issuerOrg: draft.issuerOrg,
          evidence: rows.map((r) => ({ kind: r.kind, url: r.url.trim() })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not submit your claim.");
      setMyClaim(data.claim as ClaimRecord);
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetDraft() {
    setDraft({
      type: "mentoring",
      description: "",
      event: "",
      date: "",
      issuerOrg: "",
      evidence: [{ kind: "link", url: "" }],
    });
    setMyClaim(null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pb-24 pt-24">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary"
      >
        Wallet onboarding
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-3 text-3xl font-semibold tracking-tight md:text-5xl"
      >
        One minute to your first credential.
      </motion.h1>
      {displayStep !== "intro" && (
        <p className="mb-8 max-w-xl text-sm leading-relaxed text-muted">
          {displayStep === "claim" || displayStep === "done"
            ? "You're set up — finish by submitting the contribution you want on the record."
            : "No Stellar wallet? Tessera sponsors one on testnet — you never need XLM of your own."}
        </p>
      )}

      <AnimatePresence mode="wait">
        {/* ───────────────────────── intro ───────────────────────── */}
        {displayStep === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="mb-10 max-w-xl text-sm leading-relaxed text-muted">
              Three steps: get a wallet (yours or sponsored), submit the
              contribution you want to prove, and watch it get verified and
              minted on Stellar.
            </p>

            {/* step preview */}
            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              {[
                ["1", "Wallet", "Connect Freighter, or let Tessera fund a sponsored account for you."],
                ["2", "Claim", "Describe the contribution and attach evidence anyone can check."],
                ["3", "Credential", "The org verifies and mints it on-chain to your wallet. Soulbound."],
              ].map(([n, t, d], i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="glass rounded-2xl p-5"
                >
                  <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft font-mono text-xs text-primary">
                    {n}
                  </span>
                  <p className="text-sm font-medium">{t}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{d}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="gold" size="lg" onClick={() => { setError(null); setStep("connect"); }}>
                Connect an existing wallet
              </Button>
              <Button variant="outline" size="lg" onClick={() => { setError(null); setStep("create"); }}>
                Get a sponsored account
              </Button>
            </div>

            {/* why soulbound */}
            <section className="mt-16">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">What you&apos;re signing up for</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass rounded-2xl p-6"
                >
                  <p className="mb-2 text-sm font-medium text-primary">Permanent (by default)</p>
                  <p className="text-xs leading-relaxed text-muted">
                    Credentials live on Stellar until you self-revoke or the
                    issuing org revokes. There is no expiry — that&apos;s the
                    point: a record that outlives the event.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 }}
                  className="glass rounded-2xl p-6"
                >
                  <p className="mb-2 text-sm font-medium text-gold">Yours to control</p>
                  <p className="text-xs leading-relaxed text-muted">
                    Self-revocation is one action, no support ticket. And
                    because credentials are soulbound, nobody — not even the
                    org — can move them off your wallet.
                  </p>
                </motion.div>
              </div>
            </section>

            {/* FAQ */}
            <section className="mt-16">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Quick answers</h2>
              <div className="space-y-3">
                {ONBOARD_FAQS.map((f, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div key={i} className="glass overflow-hidden rounded-2xl">
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <span className="text-sm font-medium">{f.q}</span>
                        <motion.span
                          animate={{ rotate: isOpen ? 45 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-muted"
                          aria-hidden
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <p className="px-5 pb-5 text-xs leading-relaxed text-muted">{f.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}

        {/* ───────────────────────── connect ───────────────────────── */}
        {displayStep === "connect" && (
          <motion.div key="connect" {...stepProps} className="glass rounded-3xl p-8">
            <h2 className="mb-2 text-xl font-semibold tracking-tight">Connect your wallet</h2>
            <p className="mb-6 max-w-md text-sm leading-relaxed text-muted">
              Approve the Freighter popup once. We only read your public
              address to identify your credential wall — nothing is signed at
              this step.
            </p>
            <WalletKit onConnected={handleConnected} />
            {error && (
              <p className="mt-4 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-xs text-bad">{error}</p>
            )}
            <button
              onClick={() => { setError(null); setStep("intro"); }}
              className="mt-6 text-xs text-muted underline-offset-4 hover:underline"
            >
              ← back
            </button>
          </motion.div>
        )}

        {/* ───────────────────────── create ───────────────────────── */}
        {displayStep === "create" && (
          <motion.div key="create" {...stepProps} className="glass rounded-3xl p-8">
            <h2 className="mb-2 text-xl font-semibold tracking-tight">Sponsored account</h2>
            <p className="mb-6 max-w-md text-sm leading-relaxed text-muted">
              No wallet? Tessera generates a fresh account for you and funds it
              with the 1 XLM testnet reserve — you never pay anything.
            </p>
            <div className="mb-8 space-y-3">
              {[
                "A fresh keypair is generated for you.",
                "Tessera funds it with the 1 XLM reserve (operator pays).",
                "Credentials can be minted to it immediately.",
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.12 }}
                  className="flex items-center gap-3 text-sm text-foreground/85"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  {t}
                </motion.div>
              ))}
            </div>
            {error && (
              <p className="mb-4 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-xs text-bad">{error}</p>
            )}
            <div className="flex items-center gap-3">
              <Button variant="gold" onClick={createSponsored} disabled={creating}>
                {creating ? "Funding on testnet…" : "Generate & fund my account"}
              </Button>
              <button
                onClick={() => { setError(null); setStep("intro"); }}
                className="text-xs text-muted underline-offset-4 hover:underline"
              >
                ← back
              </button>
            </div>
          </motion.div>
        )}

        {/* ───────────────────────── reveal ───────────────────────── */}
        {displayStep === "reveal" && created && (
          <motion.div key="reveal" {...stepProps} className="credential-edge rounded-3xl p-8">
            <Badge tone="gold" className="mb-4 self-start">Account ready</Badge>
            <h2 className="mb-1 text-xl font-semibold tracking-tight">Save your keys.</h2>
            <p className="mb-6 max-w-md text-sm leading-relaxed text-muted">
              Import the secret key into Freighter (or keep it safe — it&apos;s
              the only proof of ownership). It&apos;s shown once.
            </p>
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">Public address</p>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 font-mono text-xs">
                  <span className="break-all">{created.address}</span>
                  <CopyButton text={created.address} />
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">Secret key (S…)</p>
                <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-[#e6c4740d] px-4 py-3 font-mono text-xs">
                  <span className="break-all text-gold">{created.secretKey}</span>
                  <CopyButton text={created.secretKey} />
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-line bg-background/50 p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Import into Freighter
              </p>
              <ol className="space-y-2 text-xs leading-relaxed text-foreground/80">
                <li>
                  <span className="mr-2 font-mono text-primary">1</span>
                  Install the Freighter extension if you haven&apos;t (testnet profile).
                </li>
                <li>
                  <span className="mr-2 font-mono text-primary">2</span>
                  Open Freighter → <em>Import account</em> → paste the secret key above.
                </li>
                <li>
                  <span className="mr-2 font-mono text-primary">3</span>
                  Done — your address is ready to receive credentials.
                </li>
              </ol>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button variant="gold" onClick={continueFromReveal}>
                Continue — save my wallet →
              </Button>
              <Link
                href={`/profile/${created.address}`}
                className="text-xs text-muted underline-offset-4 hover:underline"
              >
                view my (empty) profile
              </Link>
            </div>
          </motion.div>
        )}

        {/* ───────────────────────── confirm ───────────────────────── */}
        {displayStep === "confirm" && activeWallet && (
          <motion.div key="confirm" {...stepProps} className="glass rounded-3xl p-8">
            {restored && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3">
                <Badge tone="primary">welcome back</Badge>
                <p className="text-xs text-muted">This browser already has your Tessera wallet saved.</p>
              </div>
            )}
            <h2 className="mb-2 text-xl font-semibold tracking-tight">This is your Tessera identity</h2>
            <p className="mb-6 max-w-md text-sm leading-relaxed text-muted">
              Your wallet address <em>is</em> your account — no email, no
              password. It&apos;s saved in this browser so you can pick up where
              you left off.
            </p>
            <div className="mb-8">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">Your wallet</p>
              <div className="flex items-center gap-2 rounded-xl border border-good/30 bg-good/10 px-4 py-3 font-mono text-xs">
                <span className="break-all">{activeWallet}</span>
                <CopyButton text={activeWallet} />
                <Link
                  href={`/profile/${activeWallet}`}
                  className="shrink-0 text-xs text-primary underline-offset-4 hover:underline"
                >
                  profile →
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="gold" size="lg" onClick={() => { setError(null); setStep("claim"); }}>
                Submit your first contribution →
              </Button>
              <Button variant="outline" onClick={startOver}>
                Use a different wallet
              </Button>
            </div>
          </motion.div>
        )}

        {/* ───────────────────────── claim ───────────────────────── */}
        {displayStep === "claim" && activeWallet && (
          <motion.div key="claim" {...stepProps} className="glass rounded-3xl p-8">
            <h2 className="mb-2 text-xl font-semibold tracking-tight">Submit your contribution</h2>
            <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
              Be specific — the AI verifier and the organizer both check this
              against your evidence before the org mints it on-chain.
            </p>

            <div className="space-y-5">
              <Field label="Contribution type">
                <Select
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                >
                  {CLAIM_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="What did you do?" hint="One or two concrete sentences — what, where, how much.">
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="e.g. Mentored 4 teams through HackSpire Bootcamp 2026, covering Soroban basics and deployment."
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Event / program">
                  <Input
                    value={draft.event}
                    onChange={(e) => setDraft({ ...draft, event: e.target.value })}
                    placeholder="e.g. HackSpire Bootcamp 2026"
                  />
                </Field>
                <Field label="Date">
                  <Input
                    type="date"
                    value={draft.date}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Issuing organization" hint="The org whose registered wallet signs your credential on-chain.">
                {issuersError ? (
                  <div className="flex items-center justify-between rounded-xl border border-bad/30 bg-bad/10 px-4 py-3">
                    <span className="text-xs text-bad">Could not load registered organizations.</span>
                    <button onClick={loadIssuers} className="text-xs text-primary underline-offset-4 hover:underline">
                      retry
                    </button>
                  </div>
                ) : (
                  <Select
                    value={draft.issuerOrg}
                    onChange={(e) => setDraft({ ...draft, issuerOrg: e.target.value })}
                  >
                    <option value="" disabled>
                      Select the organization…
                    </option>
                    {issuers.map((o) => (
                      <option key={o.address} value={o.orgName}>
                        {o.orgName}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                  Evidence
                </p>
                <p className="mb-3 text-xs text-muted/70">
                  At least one checkable link — a PR list, event page, mentor
                  board, photo page…
                </p>
                <div className="space-y-2">
                  {draft.evidence.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={row.kind}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            evidence: draft.evidence.map((r, j) =>
                              j === i ? { ...r, kind: e.target.value as EvidenceRow["kind"] } : r
                            ),
                          })
                        }
                        className="w-32 shrink-0"
                      >
                        <option value="link">link</option>
                        <option value="attachment">attachment</option>
                      </Select>
                      <Input
                        type="url"
                        value={row.url}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            evidence: draft.evidence.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)),
                          })
                        }
                        placeholder="https://…"
                      />
                      {draft.evidence.length > 1 && (
                        <button
                          onClick={() =>
                            setDraft({ ...draft, evidence: draft.evidence.filter((_, j) => j !== i) })
                          }
                          aria-label="Remove evidence"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:text-bad"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setDraft({ ...draft, evidence: [...draft.evidence, { kind: "link", url: "" }] })}
                  className="mt-3 text-xs text-primary underline-offset-4 hover:underline"
                >
                  + add another link
                </button>
              </div>

              <div className="rounded-xl border border-line bg-background/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Filing to wallet</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground/85">{activeWallet}</p>
              </div>

              {error && (
                <p className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-xs text-bad">{error}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button variant="gold" size="lg" onClick={submitClaim} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit claim →"}
                </Button>
                <button
                  onClick={() => { setError(null); setStep("confirm"); }}
                  className="text-xs text-muted underline-offset-4 hover:underline"
                >
                  ← back
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ───────────────────────── done / tracking ───────────────────────── */}
        {displayStep === "done" && activeWallet && myClaim && (
          <motion.div key="done" {...stepProps} className="glass rounded-3xl p-8">
            <Badge tone="good" className="mb-4 self-start">Claim submitted</Badge>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">
              {myClaim.status === "minted"
                ? "It's on-chain. 🎉"
                : "You're in the queue."}
            </h2>
            <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
              {myClaim.status === "minted" ? (
                <>
                  Your credential was minted by the organization&apos;s wallet.
                  It&apos;s now part of your public credential wall.
                </>
              ) : (
                <>
                  The organization reviews your evidence with AI assistance,
                  approves it, then mints it with its own wallet. This page
                  updates automatically as it moves.
                </>
              )}
            </p>

            {/* lifecycle stepper */}
            <div className="mb-8 flex items-center">
              {LIFECYCLE.map((s, i) => {
                const idx = LIFECYCLE.indexOf(myClaim.status as (typeof LIFECYCLE)[number]);
                const done = i < idx || myClaim.status === "minted";
                const active = myClaim.status === s && myClaim.status !== "minted";
                return (
                  <Fragment key={s}>
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={
                          "flex h-8 w-8 items-center justify-center rounded-full border text-xs " +
                          (done
                            ? "border-good bg-good/15 text-good"
                            : active
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-line bg-surface text-muted")
                        }
                      >
                        {done ? (
                          <CheckIcon />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className={"text-[10px] font-medium " + (done || active ? "text-foreground" : "text-muted")}>
                        {LIFECYCLE_LABELS[s]}
                      </span>
                    </div>
                    {i < LIFECYCLE.length - 1 && (
                      <div
                        className={
                          "mx-1 mb-5 h-px flex-1 " + (i < idx ? "bg-good" : "bg-line")
                        }
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>

            {myClaim.status === "failed" && (
              <div className="mb-6 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-bad">Mint failed</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{myClaim.error ?? "The on-chain mint could not complete. The organizer can retry from the dashboard."}</p>
              </div>
            )}

            {myClaim.verification && (
              <div className="mb-6 rounded-xl border border-line bg-background/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">AI verdict</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                  <Badge tone={myClaim.verification.approved ? "good" : "muted"}>
                    {myClaim.verification.approved ? "approved" : "flagged for review"}
                  </Badge>{" "}
                  confidence {myClaim.verification.confidence.toFixed(2)} ·{" "}
                  {myClaim.verification.citation}
                </p>
              </div>
            )}

            {myClaim.credential && (
              <div className="mb-6 rounded-xl border border-good/30 bg-good/10 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-good">
                  Credential #{myClaim.credential.tokenId} minted
                </p>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${myClaim.credential.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-mono text-xs text-primary underline-offset-4 hover:underline"
                >
                  view transaction on Stellar Expert →
                </a>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/profile/${activeWallet}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold px-7 text-base font-medium tracking-tight text-[var(--on-gold)] shadow-[0_0_24px_-8px_var(--gold)] transition-colors hover:bg-gold/85"
              >
                Open my credential wall →
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setError(null);
                  setStep("claim");
                }}
              >
                Submit another contribution
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2.5" className="shrink-0">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
