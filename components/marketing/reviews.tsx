"use client";

import { motion } from "framer-motion";
import { OrgLogo } from "../org-logo";

const reviews = [
  {
    quote:
      "Mentoring hours used to vanish the moment the hackathon ended. Now they sit in a participant's wallet as proof — and it's changing how teams self-select for the next edition.",
    name: "Mentorship Lead",
    org: "HackSpire",
    initial: "H",
  },
  {
    quote:
      "Our chapter tracked member contributions in spreadsheets for years. Tessera turns that into something permanent, verifiable, and shareable in one link.",
    name: "Chapter President",
    org: "FIEM ACM",
    initial: "F",
  },
  {
    quote:
      "I put my Tessera link in my bio. It's the first thing people click — and the first thing that's actually true without me having to explain it.",
    name: "Lightning Talk Speaker",
    org: "GDG Groups",
    initial: "G",
  },
  {
    quote:
      "Minting a credential for a merged PR takes two minutes, and the proof lives in the wallet, not in a screenshot that could be doctored.",
    name: "Community Organizer",
    org: "GDG Groups",
    initial: "G",
  },
  {
    quote:
      "The verify step is what sells our volunteers: the claim is checked against the actual PR before anything is minted. Nobody can just self-award.",
    name: "Volunteer Coordinator",
    org: "HackSpire",
    initial: "H",
  },
  {
    quote:
      "First-year students finally have something to show beyond 'I attended'. A soulbound credential is a record that can't be copied or bought.",
    name: "Placement Cell Mentor",
    org: "FIEM ACM",
    initial: "F",
  },
];

/** Community reviews — a staggered grid of pilot-community voices. */
export function Reviews() {
  return (
    <section className="border-y border-line bg-surface/30">
      <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">From the pilot communities</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              The people issuing them, on record.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Feedback from organizers and members across the three pilot
            communities during the testnet pilot.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
              className="glass flex flex-col justify-between rounded-3xl p-7"
            >
              <div>
                <div className="mb-4 flex gap-1 text-gold" aria-label="5 out of 5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.4 1.15 6.55L12 17l-5.9 3.25 1.15-6.55L2.5 9.3l6.6-1.04L12 2z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-foreground/90">
                  “{r.quote}”
                </blockquote>
              </div>
              <figcaption className="mt-6 flex items-center gap-3">
                <OrgLogo name={r.org} size={36} rounded="rounded-full" className="ring-1 ring-line" />
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted">{r.org}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
