"use client";

import { motion } from "framer-motion";
import { gsap } from "./animations/gsap";
import { useEffect, useRef } from "react";

const steps = [
  {
    n: "01",
    title: "Contribute",
    body: "Mentor at a hackathon, merge a PR, give a talk. Bring the receipt — a link, a record, the photo.",
  },
  {
    n: "02",
    title: "Verify",
    body: "Tessera cross-checks your claim against machine-collected evidence — live PR state, event pages — with an AI fact-checker behind it.",
  },
  {
    n: "03",
    title: "Mint",
    body: "An authorized org — FIEM ACM, GDG Groups, HackSpire — signs the credential on Stellar. Non-transferable, forever.",
  },
  {
    n: "04",
    title: "Showcase",
    body: "Your credentials form a living 3D wall on your public profile. One link, in your bio, that proves the work.",
  },
];

export function HowItWorks() {
  const lineRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll-driven progress line (GSAP ScrollTrigger).
  useEffect(() => {
    if (!lineRef.current || !sectionRef.current) return;
    const tween = gsap.fromTo(
      lineRef.current,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
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
      <div className="mb-16 max-w-2xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">How it works</p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          From contribution to credential, on-chain.
        </h2>
      </div>

      <div className="relative">
        {/* vertical progress line (desktop) */}
        <div className="absolute left-[19px] top-0 hidden h-full w-px origin-top bg-line md:block" aria-hidden>
          <div ref={lineRef} className="h-full w-full origin-top bg-gradient-to-b from-primary via-primary/70 to-gold" />
        </div>

        <div className="space-y-10 md:space-y-16">
          {steps.map((s) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-6 md:gap-10"
            >
              <div className="relative z-10 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs text-primary md:flex">
                {s.n}
              </div>
              <div className="glass flex-1 rounded-2xl p-6 md:p-8">
                <h3 className="mb-2 text-lg font-semibold tracking-tight md:text-xl">
                  <span className="mr-3 font-mono text-xs text-primary md:hidden">{s.n}</span>
                  {s.title}
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted md:text-base">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
