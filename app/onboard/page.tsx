"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";

// Wallets Kit renders a provider/modal — client-only.
const WalletKit = dynamic(
  () => import("@/components/onboard/wallet-kit-wrapper").then((m) => m.WalletKitWrapper),
  { ssr: false }
);

type Step = "intro" | "connect" | "create" | "reveal";

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
    q: "Why testnet?",
    a: "This build runs on Soroban testnet — a public test network. The same flows run on mainnet once the pilot communities graduate. Your records here are for the pilot.",
  },
];

export default function OnboardPage() {
  const [step, setStep] = useState<Step>("intro");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ address: string; secretKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pb-24 pt-24">
      {/* intro */}
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
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mb-10 max-w-xl text-sm leading-relaxed text-muted"
      >
        No Stellar wallet? No problem — Tessera sponsors you an account on
        testnet. You never need XLM of your own to receive a credential. And if
        you already run a wallet, connecting takes one approval.
      </motion.p>

      {/* step preview */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="mb-12 grid gap-3 sm:grid-cols-3"
      >
        {[
          ["1", "Choose your path", "Existing wallet, or a sponsored account we fund for you."],
          ["2", "Connect or create", "One wallet approval — or a fresh keypair, funded in seconds."],
          ["3", "Start collecting", "Your public credential wall is live at /profile."],
        ].map(([n, t, b], i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="glass flex gap-3 rounded-2xl p-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-xs text-primary">
              {n}
            </span>
            <div>
              <p className="text-sm font-medium">{t}</p>
              <p className="mt-0.5 text-xs text-muted">{b}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* wizard */}
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div key="intro" {...stepProps} className="grid gap-4 sm:grid-cols-2">
            <div className="glass flex flex-col rounded-3xl p-7">
              <Badge tone="primary" className="mb-4 self-start">I have a wallet</Badge>
              <h2 className="mb-2 text-xl font-semibold tracking-tight">Connect Freighter</h2>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-muted">
                Use the Freighter browser extension (or any supported wallet)
                to point your existing wallet at Tessera.
              </p>
              <ul className="mb-7 space-y-2">
                {["One-click approval via Wallets Kit", "Your existing address is used", "No new keys to manage"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-xs text-foreground/80">
                    <CheckIcon /> {t}
                  </li>
                ))}
              </ul>
              <Button onClick={() => setStep("connect")}>Connect wallet</Button>
            </div>
            <div className="credential-edge flex flex-col rounded-3xl p-7">
              <Badge tone="gold" className="mb-4 self-start">No wallet yet</Badge>
              <h2 className="mb-2 text-xl font-semibold tracking-tight">Sponsored account</h2>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-muted">
                We generate and fund a fresh testnet account for you — free, no
                forms. You keep the secret key; it&apos;s yours from the start.
              </p>
              <ul className="mb-7 space-y-2">
                {["Fresh keypair, shown once, never stored", "Funded with the 1 XLM reserve automatically", "Credentials can arrive immediately"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-xs text-foreground/80">
                    <CheckIcon /> {t}
                  </li>
                ))}
              </ul>
              <Button variant="gold" onClick={() => setStep("create")}>
                Create my account
              </Button>
            </div>
          </motion.div>
        )}

        {step === "connect" && (
          <motion.div key="connect" {...stepProps} className="glass rounded-3xl p-8">
            <h2 className="mb-2 text-xl font-semibold tracking-tight">Connect your wallet</h2>
            <p className="mb-8 text-sm text-muted">
              The Stellar Wallets Kit modal will appear. Choose Freighter (or
              another installed wallet) and approve.
            </p>
            <div className="flex items-center gap-3">
              <WalletKit />
              <button
                onClick={() => setStep("intro")}
                className="text-xs text-muted underline-offset-4 hover:underline"
              >
                ← back
              </button>
            </div>
          </motion.div>
        )}

        {step === "create" && (
          <motion.div key="create" {...stepProps} className="glass rounded-3xl p-8">
            <h2 className="mb-2 text-xl font-semibold tracking-tight">Create your sponsored account</h2>
            <div className="mb-8 space-y-3">
              {[
                ["1", "A fresh keypair is generated for you."],
                ["2", "Tessera funds it with the 1 XLM testnet reserve."],
                ["3", "Credentials can be minted to it immediately."],
              ].map(([n, t]) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + Number(n) * 0.12 }}
                  className="flex items-center gap-3 text-sm text-foreground/85"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft font-mono text-xs text-primary">
                    {n}
                  </span>
                  {t}
                </motion.div>
              ))}
            </div>
            {error && <p className="mb-4 text-sm text-bad">{error}</p>}
            <div className="flex items-center gap-3">
              <Button variant="gold" onClick={createSponsored} disabled={creating}>
                {creating ? "Funding on testnet…" : "Generate & fund my account"}
              </Button>
              <button
                onClick={() => setStep("intro")}
                className="text-xs text-muted underline-offset-4 hover:underline"
              >
                ← back
              </button>
            </div>
          </motion.div>
        )}

        {step === "reveal" && created && (
          <motion.div key="reveal" {...stepProps} className="credential-edge rounded-3xl p-8">
            <Badge tone="gold" className="mb-4 self-start">Account ready</Badge>
            <h2 className="mb-1 text-xl font-semibold tracking-tight">Save your keys.</h2>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              Import the secret key into Freighter (or keep it safe — it&apos;s the
              only proof of ownership). It&apos;s shown once.
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

            {/* import instructions */}
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
              <Link
                href={`/profile/${created.address}`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-gold px-6 text-sm font-medium text-[var(--on-gold)] transition-colors hover:bg-gold/85"
              >
                Open my empty profile →
              </Link>
              <Link href="/" className="text-xs text-muted underline-offset-4 hover:underline">
                ← back home
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              Credentials live on Stellar until you self-revoke or the issuing
              org revokes. There is no expiry — that&apos;s the point: a record
              that outlives the event.
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
              Self-revocation is one action, no support ticket. And because
              credentials are soulbound, nobody — not even the org — can move
              them off your wallet.
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
