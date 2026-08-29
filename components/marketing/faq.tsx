"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const faqs = [
  {
    q: "What exactly is a soulbound credential?",
    a: "A non-transferable record issued on Stellar by an authorized organization. It lives in your wallet, proves a specific real-world contribution (mentoring, a merged PR, a talk), and can never be sold, gifted, or moved to another account — only revoked by you or the issuing org.",
  },
  {
    q: "Do I need XLM or an existing wallet to receive one?",
    a: "No. Tessera sponsors a fresh testnet account for you, funded with the 1 XLM base reserve. You import the secret key into Freighter (or any Stellar wallet) and your credentials can arrive immediately.",
  },
  {
    q: "Who can mint a credential?",
    a: "Only addresses registered in the issuer registry — currently FIEM ACM, GDG Groups, and HackSpire. Registration is admin-gated, and each org signs mints with its own key, so credentials are always attributable.",
  },
  {
    q: "How is my claim verified before minting?",
    a: "In three layers: your evidence links are machine-digested (e.g. the live GitHub state of a PR), a strict AI verifier scores claim-vs-facts with a confidence and citation, and a human organizer reviews before the org signs the mint.",
  },
  {
    q: "Is this mainnet?",
    a: "This build runs entirely on Soroban testnet. The architecture is mainnet-ready — the same contracts and flows run on mainnet once the pilot communities decide to graduate.",
  },
  {
    q: "What happens if an org is revoked from the registry?",
    a: "It can no longer mint new credentials. Everything it already issued stays valid forever — revocation affects the org's signing authority, not the history it created.",
  },
  {
    q: "Can I remove a credential I don't like?",
    a: "Yes — holders can self-revoke any credential with burn(). It's your record, and self-revocation is a first-class operation, not a support ticket.",
  },
];

/** Animated FAQ accordion. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reducedMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-4xl px-6 py-28 md:py-36">
      <div className="mb-14 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Fair questions.</h2>
      </div>

      <div className="space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass overflow-hidden rounded-2xl"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-sm font-medium md:text-base">{f.q}</span>
                <motion.span
                  animate={reducedMotion ? { rotate: isOpen ? 45 : 0 } : { rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-muted"
                  aria-hidden
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={reducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <p className="px-6 pb-6 text-sm leading-relaxed text-muted">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
