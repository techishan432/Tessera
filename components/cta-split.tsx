"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function CtaSplit() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 md:py-36">
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="glass group relative overflow-hidden rounded-3xl p-8 md:p-10"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-100" />
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">Organizers</p>
          <h3 className="mb-3 text-2xl font-semibold tracking-tight">Issue credentials your community can trust</h3>
          <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
            Run your chapter, GDG, or hackathon as a registered issuer. Submit
            claims, review AI verification, and mint — each credential carries
            your org&apos;s signature on-chain.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors group-hover:bg-primary/85"
          >
            Open the organizer dashboard
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="credential-edge group relative overflow-hidden rounded-3xl p-8 md:p-10"
        >
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gold">Members</p>
          <h3 className="mb-3 text-2xl font-semibold tracking-tight">Collect your proof. Share one link.</h3>
          <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
            No Stellar wallet? We sponsor you an account — no testnet XLM, no
            setup. Your credentials land as a 3D wall you can drop into any bio.
          </p>
          <Link
            href="/onboard"
            className="inline-flex h-11 items-center justify-center rounded-full bg-gold px-6 text-sm font-medium text-[var(--on-gold)] transition-colors group-hover:bg-gold/85"
          >
            Get started — it takes a minute
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
