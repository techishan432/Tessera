"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { gsap } from "./animations/gsap";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/#how", label: "How it works" },
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/onboard", label: "Onboard", exact: true },
];

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Scroll-progress gradient bar (GSAP ScrollTrigger, scrubbed).
  const [barEl, setBarEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!barEl || reducedMotion) return;
    const tween = gsap.to(barEl, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.4 },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [barEl, reducedMotion]);

  const isActive = (l: (typeof LINKS)[number]) =>
    l.exact ? (l.href === "/" ? pathname === "/" : pathname === l.href) : false;

  return (
    <motion.header
      initial={reducedMotion ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      {/* scroll progress */}
      <div
        ref={setBarEl}
        className="h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-primary via-gold to-primary"
        aria-hidden
      />
      <div
        className={
          "transition-all duration-300 " +
          (scrolled
            ? "glass border-b border-line shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] py-2.5"
            : "py-4 border-b border-transparent")
        }
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6">
          {/* logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative inline-flex h-5 w-5 items-center justify-center">
              <motion.span
                whileHover={reducedMotion ? undefined : { rotate: 135 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="inline-block h-3 w-3 rounded-[2px] bg-gradient-to-br from-primary to-gold shadow-[0_0_16px_-2px_var(--primary)]"
              />
            </span>
            <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-[length:200%_100%] bg-[position:0%_0] bg-clip-text text-[15px] font-semibold tracking-tight text-transparent transition-[background-position] duration-500 group-hover:bg-[position:100%_0]">
              Tessera
            </span>
          </Link>

          {/* desktop links */}
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={
                    "relative rounded-full px-4 py-2 text-sm transition-colors " +
                    (isActive(l) ? "text-foreground" : "text-muted hover:text-foreground")
                  }
                >
                  {isActive(l) && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border border-line bg-overlay"
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* CTA */}
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white shadow-[0_0_24px_-6px_var(--primary)] transition-all hover:bg-primary/85 hover:shadow-[0_0_32px_-4px_var(--primary)] sm:inline-flex"
            >
              Organize
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>

            {/* mobile menu button */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-full border border-line md:hidden"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                className="h-[2px] w-4 rounded bg-foreground"
              />
              <motion.span animate={menuOpen ? { opacity: 0 } : { opacity: 1 }} className="h-[2px] w-4 rounded bg-foreground" />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                className="h-[2px] w-4 rounded bg-foreground"
              />
            </button>
          </div>
        </nav>

        {/* mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="overflow-hidden md:hidden"
            >
              <ul className="space-y-1 px-2 pb-4 pt-2">
                {LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                  >
                    <Link
                      href={l.href}
                      className={
                        "flex items-center justify-between rounded-xl px-4 py-3 text-sm " +
                        (isActive(l)
                          ? "border border-line bg-overlay-soft text-foreground"
                          : "text-muted")
                      }
                    >
                      {l.label}
                      {isActive(l) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Link>
                  </motion.li>
                ))}
                <li className="pt-1">
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white sm:hidden"
                  >
                    Organize
                  </Link>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
