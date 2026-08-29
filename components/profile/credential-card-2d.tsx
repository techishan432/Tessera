"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { WallCredential } from "../3d/credential-wall-scene";

/**
 * 2D flip-card version of a credential — the mobile / reduced-motion path,
 * and the accessible path for everyone (keyboard-flippable).
 */
export function CredentialCard2D({
  credential,
  index,
  selected,
  onSelect,
}: {
  credential: WallCredential;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const isFlipped = flipped || selected;

  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => {
        setFlipped((f) => !f);
        onSelect();
      }}
      aria-pressed={isFlipped}
      aria-label={`${credential.orgName} ${credential.typeLabel} credential, ${credential.date}. Activate to flip.`}
      className="group h-56 w-full [perspective:1200px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-focus-visible:ring-2"
        style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* front */}
        <div className="credential-edge absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl p-5 [backface-visibility:hidden]">
          <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-gold">
            Soulbound · Tessera
          </span>
          <h3 className="text-center text-lg font-semibold tracking-tight">{credential.orgName}</h3>
          <span className="text-xs tracking-[0.16em] text-primary">{credential.typeLabel.toUpperCase()}</span>
          <span className="text-xs text-muted">{credential.date}</span>
        </div>
        {/* back */}
        <div className="glass absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="line-clamp-5 text-center text-xs leading-relaxed text-foreground/85">
            {credential.description}
          </p>
          <span className="text-[11px] text-primary">{credential.orgName}</span>
        </div>
      </div>
    </motion.button>
  );
}
