import type { Variants } from "framer-motion";

// Shared Framer Motion variants. Keep all motion config here so pages and
// components stay declarative (see Phase 4 pages).
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
