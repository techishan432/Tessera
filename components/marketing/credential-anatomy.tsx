"use client";

import { motion } from "framer-motion";

const onchain: [string, string][] = [
  ["Holder address", "the exact wallet that owns it — forever"],
  ["Issuing org + signature", "the org key that minted it, verifiable by anyone"],
  ["Metadata CID", "a content hash pointing at the full badge record"],
  ["Token id & timestamp", "a monotonic id and the moment it was issued"],
  ["Non-transferable", "transfer() is a permanent revert in the contract"],
];

const offchain: [string, string][] = [
  ["Description", "what was actually contributed"],
  ["Event & date", "where and when it happened"],
  ["Evidence links", "PR URL, event page, attendance record"],
  ["AI verdict", "confidence score + one-line citation"],
  ["Badge rendering data", "what the credential wall shows"],
];

function Panel({
  title,
  subtitle,
  rows,
  accent,
  delay,
}: {
  title: string;
  subtitle: string;
  rows: [string, string][];
  accent: "primary" | "gold";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay }}
      className="glass flex-1 rounded-3xl p-7 md:p-9"
    >
      <p className={"text-xs font-medium uppercase tracking-[0.2em] " + (accent === "primary" ? "text-primary" : "text-gold")}>
        {title}
      </p>
      <p className="mt-2 mb-6 text-sm text-muted">{subtitle}</p>
      <ul className="space-y-4">
        {rows.map(([k, v], i) => (
          <motion.li
            key={k}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: delay + 0.15 + i * 0.08 }}
            className="flex gap-3"
          >
            <span
              className={
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " +
                (accent === "primary" ? "bg-primary" : "bg-gold")
              }
            />
            <div>
              <p className="text-sm font-medium">{k}</p>
              <p className="text-xs text-muted">{v}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/** What lives on-chain vs off-chain — the trust model in one picture. */
export function CredentialAnatomy() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 md:py-36">
      <div className="mb-14 max-w-2xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Anatomy of a credential</p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          A hash on-chain, the story off-chain.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
          Only the trust anchors are stored on Stellar — cheap, permanent, and
          verifiable by anyone. The human-readable record lives in IPFS,
          addressed by its content hash, so it can never be quietly edited.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel
          title="On Stellar (immutable core)"
          subtitle="Stored by credential-contract, enforced by the protocol"
          rows={onchain}
          accent="primary"
          delay={0}
        />
        <Panel
          title="On IPFS (the badge record)"
          subtitle="Pinned via Pinata — the on-chain CID points here"
          rows={offchain}
          accent="gold"
          delay={0.12}
        />
      </div>
    </section>
  );
}
