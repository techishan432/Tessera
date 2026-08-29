"use client";

import { motion } from "framer-motion";
import { OrgLogo } from "../org-logo";

/** Wordmark strip under the hero — the pilot communities at a glance. */
export function OrgStrip() {
  const orgs = [
    { name: "FIEM ACM", tag: "student chapter" },
    { name: "GDG Groups", tag: "developer group" },
    { name: "HackSpire", tag: "hackathon" },
  ];
  return (
    <section className="border-y border-line bg-surface/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Issued by the communities you know</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {orgs.map((o, i) => (
            <motion.div
              key={o.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group flex items-center gap-3"
            >
              <OrgLogo
                name={o.name}
                size={44}
                rounded="rounded-xl"
                className="opacity-80 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
              />
              <div>
                <p className="text-sm font-semibold tracking-tight">{o.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted">{o.tag}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
