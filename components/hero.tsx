"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const HeroScene = dynamic(() => import("./3d/hero-scene"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-[radial-gradient(ellipse_at_center,#8b7cff14,transparent_70%)]" />
  ),
});

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.2 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export function Hero({ demoWallet }: { demoWallet: string }) {
  return (
    <section id="hero" className="relative flex h-[100svh] min-h-[640px] w-full items-center overflow-hidden">
      {/* 3D backdrop */}
      <div className="absolute inset-0" aria-hidden>
        <HeroScene />
      </div>
      {/* legibility gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,var(--hero-fade-strong)_35%,var(--hero-fade-soft)_75%)]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto w-full max-w-6xl px-6"
      >
        <motion.p
          variants={item}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-overlay-soft px-3.5 py-1.5 text-xs tracking-wide text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          Live on Soroban testnet · Soulbound by design
        </motion.p>
        <motion.h1
          variants={item}
          className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl"
        >
          Proof you
          <span className="bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
            {" "}showed up.
          </span>
        </motion.h1>
        <motion.p variants={item} className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          Tessera mints non-transferable credentials for the work that doesn&apos;t
          land on a résumé — mentoring at a hackathon, a merged pull request, the
          talk you actually gave. Issued by the orgs you contributed to, held in
          your Stellar wallet, verifiable by anyone.
        </motion.p>
        <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href={`/profile/${demoWallet}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 font-medium tracking-tight text-white shadow-[0_0_36px_-8px_var(--primary)] transition-colors hover:bg-primary/85"
          >
            View a live profile
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full border border-line px-7 font-medium tracking-tight text-foreground transition-colors hover:border-primary/60 hover:bg-primary-soft"
          >
            For organizers
          </Link>
        </motion.div>
      </motion.div>

      {/* scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted"
        aria-hidden
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="block h-8 w-px bg-gradient-to-b from-primary to-transparent"
          />
        </div>
      </motion.div>
    </section>
  );
}
