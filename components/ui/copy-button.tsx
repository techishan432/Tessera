"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (e.g. non-secure context) — ignore
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={copy}
      className={
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-overlay-soft px-3 py-1 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground " +
        className
      }
    >
      {copied ? (
        <span className="text-good">Copied</span>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" />
          </svg>
          {label}
        </>
      )}
    </motion.button>
  );
}
