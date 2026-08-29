"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Animated count-up number, triggered when scrolled into view. */
export function CountUp({
  value,
  suffix = "",
  className = "",
  duration = 1.6,
}: {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          animate(motionValue, value, { duration, ease: "easeOut" });
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started, value, duration, motionValue]);

  useEffect(() => {
    const sub = rounded.on("change", (v) => setDisplay(v));
    return sub;
  }, [rounded]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
      {suffix}
    </motion.span>
  );
}

/** Confidence meter (0–1) for AI verification results. */
export function ConfidenceMeter({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className={"flex items-center gap-2 " + className}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-overlay">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={
            "h-full rounded-full " +
            (pct >= 80 ? "bg-good" : pct >= 50 ? "bg-gold" : "bg-bad")
          }
        />
      </div>
      <span className="text-xs tabular-nums text-muted">{pct}%</span>
    </div>
  );
}
