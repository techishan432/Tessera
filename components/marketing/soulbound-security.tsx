"use client";

import { motion } from "framer-motion";

/**
 * The two trust pillars: soulbound-by-construction and triple-checked
 * verification. Includes a small animated "transfer → blocked" visual.
 */
export function SoulboundSecurity() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 md:py-36">
      <div className="mb-14 max-w-2xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Why it's trustworthy</p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          You can&apos;t buy it, gift it, or fake it.
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Soulbound */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="glass rounded-3xl p-7 md:p-9"
        >
          <h3 className="mb-2 text-xl font-semibold tracking-tight">Non-transferable, by construction</h3>
          <p className="mb-8 text-sm leading-relaxed text-muted">
            There is no transfer function that works. The contract&apos;s
            <code className="mx-1.5 rounded bg-overlay px-1.5 py-0.5 font-mono text-xs text-primary">
              transfer()
            </code>
            is a permanent revert — no admin override, no exception flag. Only
            the holder can self-revoke, or the issuing org can revoke.
          </p>

          {/* animated transfer-blocked visual */}
          <div className="relative flex h-36 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-line bg-surface px-4" aria-hidden>
            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary-soft font-mono text-[10px] text-primary">
              TOKEN #1
            </div>
            <div className="relative h-px w-20 bg-line">
              <motion.span
                animate={{ left: ["0%", "78%", "0%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-primary"
              />
              <motion.span
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, times: [0.45, 0.55, 0.8, 1] }}
                className="absolute right-0 -top-5 flex items-center gap-1 text-[10px] font-medium text-bad"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                reverted
              </motion.span>
            </div>
            <div className="flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-xl border border-bad/30 bg-[#ff6b6b12] text-[10px] text-bad">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              SOULBOUND
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">
            Live demo: the seed script attempts a real transfer on testnet and
            the contract rejects it on-chain.
          </p>
        </motion.div>

        {/* Triple-checked verification */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="glass rounded-3xl p-7 md:p-9"
        >
          <h3 className="mb-2 text-xl font-semibold tracking-tight">Three independent checks</h3>
          <p className="mb-8 text-sm leading-relaxed text-muted">
            A credential is minted only after a claim survives all three
            layers — machine, model, and human.
          </p>
          <ol className="space-y-6">
            {[
              {
                n: "1",
                title: "Machine evidence digest",
                body: "Evidence links are fetched live: GitHub PR state (merged? who authored it?), event pages, attendance records. No network access to the LLM — facts first.",
              },
              {
                n: "2",
                title: "AI fact-check",
                body: "A strict verifier model cross-checks claim against digest and returns a confidence score plus a one-line citation, stored with the credential.",
              },
              {
                n: "3",
                title: "Organizer + org signature",
                body: "A human organizer reviews the verdict and approves. The mint is then signed by the org's own key — the same address the registry lists.",
              },
            ].map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.2 + i * 0.12 }}
                className="flex gap-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft font-mono text-sm text-gold">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
