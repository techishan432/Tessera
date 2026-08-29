"use client";

import { motion } from "framer-motion";

const steps = [
  {
    when: "Now",
    title: "Testnet pilot",
    body: "Live with three pilot communities on Soroban testnet — claims, AI verification, minting, and public 3D profiles.",
    tone: "good" as const,
  },
  {
    when: "Next",
    title: "More orgs & claim lines",
    body: "Additional chapters, GDGs, and hackathons join as issuers; new credential lines (workshops, judging, volunteering) are added by the registry, not by code deploys.",
    tone: "primary" as const,
  },
  {
    when: "Then",
    title: "Deeper verification",
    body: "Direct integrations with event platforms and GitHub webhooks so evidence is collected automatically at contribution time — no links to paste.",
    tone: "primary" as const,
  },
  {
    when: "Later",
    title: "Mainnet graduation",
    body: "Once the pilot communities decide the records are worth keeping permanently, the same contracts and flows move to mainnet with an audited upgrade path.",
    tone: "gold" as const,
  },
];

/** Roadmap timeline. */
export function Roadmap() {
  return (
    <section className="border-t border-line bg-surface/30">
      <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold">Roadmap</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Built as a pilot, aimed at permanence.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.when}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-3xl border border-line bg-background/60 p-6"
            >
              <span
                className={
                  "mb-4 inline-block rounded-full px-3 py-1 text-[11px] font-medium tracking-wide " +
                  (s.tone === "good"
                    ? "bg-[#3ecf8e1a] text-good"
                    : s.tone === "gold"
                      ? "bg-gold-soft text-gold"
                      : "bg-primary-soft text-primary")
                }
              >
                {s.when}
              </span>
              <h3 className="mb-2 text-base font-semibold tracking-tight">{s.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{s.body}</p>
              {i < steps.length - 1 && (
                <span className="absolute -right-3 top-1/2 hidden h-px w-6 bg-line md:block" aria-hidden />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
