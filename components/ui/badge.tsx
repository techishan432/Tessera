import type { ReactNode } from "react";

type Tone = "default" | "primary" | "gold" | "good" | "bad" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-overlay text-foreground border-line",
  primary: "bg-primary-soft text-primary border-primary/30",
  gold: "bg-gold-soft text-gold border-gold/30",
  good: "bg-[#3ecf8e1a] text-good border-good/30",
  bad: "bg-[#ff6b6b1a] text-bad border-bad/30",
  muted: "bg-overlay-soft text-muted border-line",
};

export function Badge({
  tone = "default",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide " +
        tones[tone] +
        " " +
        className
      }
    >
      {children}
    </span>
  );
}
