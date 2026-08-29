"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { OrgLogo } from "../org-logo";

const orgs = [
  {
    name: "FIEM ACM",
    kind: "Student chapter",
    blurb:
      "The chapter that turns workshop hours and code reviews into records. First-year members leave with proof of what they actually built and mentored.",
    issues: ["Mentoring", "Workshops", "OSS PRs"],
    url: "https://www.acm.org/",
  },
  {
    name: "GDG Groups",
    kind: "Developer group",
    blurb:
      "A developer community where talks, meetups, and open-source work matter. Speakers and contributors collect credentials that travel with them, not with the event.",
    issues: ["Talks", "Events", "Contributions"],
    url: "https://gdg.community.dev/gdgs/",
  },
  {
    name: "HackSpire",
    kind: "Hackathon",
    blurb:
      "A region's flagship hackathon. Mentors, judges, and first-time builders all get recognized — mentoring credits included, not just the winning team.",
    issues: ["Mentoring", "Projects", "Lightning talks"],
    url: "https://hack4bengal.com/",
  },
];

/** Detailed cards for the three pilot communities. */
export function PilotOrgs() {
  return (
    <section className="border-y border-line bg-surface/30">
      <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold">Pilot communities</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Three orgs. Three ways to show up.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
            Each pilot community is a registered issuer on the Stellar
            registry — its own signing key, its own credential lines.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {orgs.map((o, i) => (
            <motion.article
              key={o.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="glass group flex flex-col rounded-3xl p-7 transition-colors hover:border-primary/40"
            >
              <div className="mb-5 flex items-center gap-3">
                <OrgLogo name={o.name} size={48} rounded="rounded-2xl" className="ring-1 ring-line" />
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{o.name}</h3>
                  <p className="text-xs text-muted">{o.kind}</p>
                </div>
              </div>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-muted">{o.blurb}</p>
              <div className="mb-6 flex flex-wrap gap-2">
                {o.issues.map((c) => (
                  <Badge key={c} tone="primary">
                    {c}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-5 text-xs">
                <span className="text-muted">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" />
                  Active issuer on testnet
                </span>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary transition-colors hover:text-foreground"
                >
                  Visit ↗
                </a>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center text-sm text-muted"
        >
          Running a chapter, GDG, or hackathon?{" "}
          <Link href="/dashboard" className="text-foreground underline-offset-4 hover:underline">
            Apply to become an issuer in the dashboard →
          </Link>
        </motion.p>
      </div>
    </section>
  );
}
