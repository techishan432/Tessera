"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { gsap } from "./animations/gsap";
import { OrgLogo } from "./org-logo";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const steps = [
  {
    n: "01",
    title: "Contribute",
    body: "Mentor at a hackathon, merge a PR, give a talk. Bring the receipt — a link, a record, the photo.",
    accent: "#8b7cff",
    accentShadow: "rgba(139, 124, 255, 0.5)",
  },
  {
    n: "02",
    title: "Verify",
    body: "Tessera cross-checks your claim against machine-collected evidence — live PR state, event pages — with an AI fact-checker behind it.",
    accent: "#6ea8ff",
    accentShadow: "rgba(110, 168, 255, 0.5)",
  },
  {
    n: "03",
    title: "Mint",
    body: "An authorized org — FIEM ACM, GDG Groups, HackSpire — signs the credential on Stellar. Non-transferable, forever.",
    accent: "#e6c474",
    accentShadow: "rgba(230, 196, 116, 0.5)",
  },
  {
    n: "04",
    title: "Showcase",
    body: "Your credentials form a living 3D wall on your public profile. One link, in your bio, that proves the work.",
    accent: "#3ecf8e",
    accentShadow: "rgba(62, 207, 142, 0.5)",
  },
];

/* ── 3D tilt card: mouse-tracked perspective + tinted glare ───────────── */
function TiltCard({
  children,
  accent,
  accentShadow,
  className = "",
}: {
  children: ReactNode;
  accent: string;
  accentShadow: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<CSSProperties>({});
  const [glare, setGlare] = useState({ x: 50, y: 50, o: 0 });

  function onMove(e: React.PointerEvent) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({
      transform: `perspective(950px) rotateX(${((0.5 - py) * 7).toFixed(2)}deg) rotateY(${((px - 0.5) * 9).toFixed(2)}deg) scale(1.015)`,
      transition: "transform 60ms linear",
    });
    setGlare({ x: px * 100, y: py * 100, o: 1 });
  }

  function onLeave() {
    setTilt({
      transform: "perspective(950px) rotateX(0deg) rotateY(0deg) scale(1)",
      transition: "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
    });
    setGlare((g) => ({ ...g, o: 0 }));
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ ...tilt, "--tint": accent, "--tint-shadow": accentShadow } as CSSProperties}
      className={
        "glass relative rounded-3xl border border-line p-6 will-change-transform hover:border-(--tint) hover:shadow-[0_28px_70px_-26px_var(--tint-shadow)] md:p-8 " +
        className
      }
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
        style={{
          opacity: glare.o,
          background: `radial-gradient(460px circle at ${glare.x}% ${glare.y}%, color-mix(in srgb, var(--tint) 20%, transparent), transparent 55%)`,
        }}
      />
    </div>
  );
}

/* ── animated step icons (procedural SVG / 3D, one per step) ───────────── */

function ContributeIcon({ reduced }: { reduced: boolean }) {
  const rings = !reduced;
  return (
    <span className="relative flex h-7 w-7 items-center justify-center">
      {rings &&
        [0, 0.9].map((delay) => (
          <motion.span
            key={delay}
            aria-hidden
            className="absolute inset-0 rounded-full border border-current"
            initial={false}
            animate={{ scale: [0.7, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay }}
          />
        ))}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="9.5" cy="8" r="3.1" />
        <path d="M4 19c.8-3.1 3-4.7 5.5-4.7s4.7 1.6 5.5 4.7" />
        <path d="M18 7.5v5M15.5 10h5" />
      </svg>
    </span>
  );
}

function VerifyIcon({ reduced }: { reduced: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" opacity="0.45" />
      <circle cx="12" cy="12" r="4.6" opacity="0.3" />
      <motion.g
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <line x1="12" y1="12" x2="12" y2="3.8" />
      </motion.g>
      <motion.circle
        cx="15.4"
        cy="9"
        r="1.4"
        fill="currentColor"
        stroke="none"
        animate={reduced ? undefined : { opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function MintIcon({ reduced }: { reduced: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <motion.circle
        cx="12"
        cy="12"
        r="9.4"
        strokeDasharray="2.6 4"
        strokeWidth="1.2"
        opacity="0.55"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        style={{ originX: "50%", originY: "50%" }}
      />
      <motion.g
        animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <path d="M12 5.5l5.2 3v5L12 16.5l-5.2-3v-5L12 5.5z" />
        <circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none" />
      </motion.g>
    </svg>
  );
}

function ShowcaseIcon({ reduced }: { reduced: boolean }) {
  return (
    <span className="block h-7 w-7" style={{ perspective: 240 }}>
      <motion.span
        className="relative block h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={reduced ? undefined : { rotateY: 360 }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-lg border-2 border-current"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="absolute inset-[7px] rounded-sm border border-current opacity-50" />
        </span>
        <span
          aria-hidden
          className="absolute inset-0 rounded-lg bg-current"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", opacity: 0.85 }}
        />
      </motion.span>
    </span>
  );
}

/* ── per-step logo rows: users · AI verdict · orgs · wall tile ─────────── */

function UserAvatars() {
  const tints = ["#8b7cff", "#6ea8ff", "#3ecf8e"];
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-1.5">
        {tints.map((t, i) => (
          <span
            key={i}
            className="flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-surface"
            style={{ backgroundColor: t + "26", color: t, boxShadow: `inset 0 0 0 1px ${t}55` }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5 20c1-3.6 3.8-5.4 7-5.4s6 1.8 7 5.4" />
            </svg>
          </span>
        ))}
      </span>
      <span className="text-[11px] text-muted">contributors file claims</span>
    </span>
  );
}

function VerdictChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-overlay-soft px-3 py-1.5 font-mono text-[11px] text-muted">
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-good"
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
      AI verdict · approved · 0.90
    </span>
  );
}

function OrgRow() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-1.5">
        {["FIEM ACM", "GDG Groups", "HackSpire"].map((o) => (
          <OrgLogo key={o} name={o} size={28} rounded="rounded-lg" className="ring-2 ring-surface" />
        ))}
      </span>
      <span className="text-[11px] text-muted">pilot orgs sign on-chain</span>
    </span>
  );
}

function WallTile() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/50 bg-gold/15 text-gold">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 4l6 3.5v7L12 18l-6-3.5v-7L12 4z" />
          <circle cx="12" cy="10.5" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-[11px] text-muted">one link in your bio</span>
    </span>
  );
}

const ICONS = [ContributeIcon, VerifyIcon, MintIcon, ShowcaseIcon];
const LOGO_ROWS: ReactNode[] = [
  <UserAvatars key="users" />,
  <VerdictChip key="verdict" />,
  <OrgRow key="orgs" />,
  <WallTile key="wall" />,
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function HowItWorks() {
  const barRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = !!useReducedMotion();

  // Scroll-driven progress bar across the card grid (GSAP ScrollTrigger).
  useEffect(() => {
    if (!barRef.current || !sectionRef.current) return;
    const tween = gsap.fromTo(
      barRef.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          end: "bottom 55%",
          scrub: 0.5,
        },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} id="how" className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
      <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            From contribution to credential, on-chain.
          </h2>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-muted md:text-sm">
          Four stages, zero paperwork. Hover a card — each one shows who is
          involved at that step.
        </p>
      </div>

      {/* horizontal scroll progress (desktop) */}
      <div className="mb-10 hidden h-0.5 w-full origin-left overflow-hidden rounded-full bg-line md:block" aria-hidden>
        <div ref={barRef} className="h-full w-full origin-left bg-gradient-to-r from-primary via-gold to-good" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {steps.map((s, i) => {
          const Icon = ICONS[i];
          return (
            <motion.div
              key={s.n}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
            >
              <TiltCard accent={s.accent} accentShadow={s.accentShadow} className="group/card h-full">
                <div className="relative flex h-full flex-col">
                  <span className="absolute right-6 top-6 font-mono text-xs text-muted/70">{s.n}</span>

                  {/* tinted animated icon tile */}
                  <span
                    className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-500 group-hover/card:scale-110"
                    style={{ color: s.accent, backgroundColor: s.accent + "1f", boxShadow: `inset 0 0 0 1px ${s.accent}40` }}
                  >
                    <Icon reduced={reduced} />
                  </span>

                  <h3 className="mb-2 text-lg font-semibold tracking-tight md:text-xl">{s.title}</h3>
                  <p className="max-w-xl text-sm leading-relaxed text-muted md:text-base">{s.body}</p>

                  <div className="mt-auto pt-6">{LOGO_ROWS[i]}</div>
                </div>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
