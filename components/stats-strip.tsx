"use client";

import { motion } from "framer-motion";
import { CountUp } from "./ui/meter";

export function StatsStrip({
  credentials,
  orgs,
  members,
}: {
  credentials: number;
  orgs: number;
  members: number;
}) {
  const stats = [
    { label: "Credentials issued", value: credentials },
    { label: "Pilot organizations", value: orgs },
    { label: "Members credentialed", value: members },
  ];

  return (
    <section className="border-y border-line bg-surface/40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-line px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex flex-col items-center gap-1 py-12 text-center"
          >
            <span className="bg-gradient-to-b from-foreground to-muted bg-clip-text font-mono text-4xl font-semibold tabular-nums text-transparent md:text-5xl">
              <CountUp value={s.value} />
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
