"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { SECTIONS, type SectionKey } from "@/lib/bundles";
import { bundleTabFor, onSection } from "@/lib/nav-plan";
import { usePrefetchScreen } from "@/lib/prefetch";
import { Chevron } from "@/components/ui/Arrows";
import { BundleMenuList, openBundleMenu, useBarMenu, useNavPlan } from "./BundleNav";

const HINT_KEY = "ana:hint.bundle-title";

/**
 * On phones, when each bundle is one tab: the page's title is the way between its screens.
 * The current one is large, with a pen ⌄ and a short ink line under it; the next ones wait
 * beside it, small and faded, cut off at the edge, so it's plain there's more. Tap the title
 * for the list, tap a faded one to go there, or swipe the page sideways. The first time, the
 * next title slides in a little and settles back.
 */
export function BundleTitle() {
  const pathname = usePathname();
  const { plan } = useNavPlan();
  const tab = plan.mode === "bundles" ? bundleTabFor(plan, pathname) : undefined;
  if (!tab || tab.sections.length < 2) return null;
  return <Title sections={tab.sections} />;
}

function Title({ sections }: { sections: readonly SectionKey[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetch = usePrefetchScreen();
  const reduce = useReducedMotion();
  const [opened, setOpen] = useState(false);
  // One list at a time: the tab bar's list, when it opens, takes over from this one.
  const barOpen = useBarMenu();
  const open = opened && !barOpen;
  const [hint, setHint] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const at = Math.max(0, sections.findIndex((k) => onSection(pathname, k)));
  const current = sections[at];
  // The ones after it, then round to the start: what a swipe to the left brings next.
  const others = [...sections.slice(at + 1), ...sections.slice(0, at)];

  // Once ever: the next title slides in a little and back, showing it can be swiped to.
  useEffect(() => {
    try {
      if (localStorage.getItem(HINT_KEY)) return;
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      return;
    }
    const t = setTimeout(() => setHint(true), 700);
    return () => clearTimeout(t);
  }, []);

  // The list closes on a tap elsewhere or Escape.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  useSwipe((dir) => {
    const next = sections[(at + (dir === "left" ? 1 : -1) + sections.length) % sections.length];
    router.push(SECTIONS[next].href);
  });

  return (
    <div ref={box} className="lg:hidden relative mb-5">
      <div className="flex items-baseline gap-4 overflow-hidden [mask-image:linear-gradient(to_right,black_78%,transparent)]">
        <button
          type="button"
          onClick={() => {
            openBundleMenu(null);
            setOpen(!open);
          }}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${SECTIONS[current].label}: switch to ${others.map((k) => SECTIONS[k].label).join(" or ")}`}
          className="press relative shrink-0 flex items-center gap-1.5 pb-1.5"
        >
          <span className="font-display text-[28px] font-semibold tracking-[-0.015em] text-ink leading-none">{SECTIONS[current].label}</span>
          <Chevron dir="down" size={18} className={`text-accent mt-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          {/* A short line of ink under the one that's open, the tab bar's own mark. */}
          <motion.span layoutId="bundle-title-ink" className="absolute left-0 bottom-0 h-[3px] w-[44%] rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
        </button>
        {others.map((k, i) => (
          <motion.span
            key={k}
            className="shrink-0"
            animate={hint && i === 0 && !reduce ? { x: [0, -16, 0] } : { x: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            onAnimationComplete={() => setHint(false)}
          >
            <Link href={SECTIONS[k].href} {...prefetch(SECTIONS[k].href)} className="font-display text-[19px] font-semibold text-ink-soft/45 hover:text-ink-soft whitespace-nowrap">
              {SECTIONS[k].label}
            </Link>
          </motion.span>
        ))}
      </div>
      {/* No closing animation: it would linger into the next screen's title. */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : -6, scale: reduce ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 480, damping: 34 }}
          className="absolute z-40 left-0 top-full mt-2 rounded-[18px] bg-bg border border-line shadow-[var(--shadow-lift)] origin-top-left"
        >
          <BundleMenuList sections={sections} onPick={() => setOpen(false)} />
        </motion.div>
      )}
    </div>
  );
}

/**
 * A sideways swipe across the page (not inside something that scrolls sideways itself, a text
 * field, or an open sheet): "left" for the next screen, "right" for the one before.
 */
function useSwipe(go: (dir: "left" | "right") => void) {
  const latest = useRef(go);
  useEffect(() => {
    latest.current = go;
  });
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    let start: { x: number; y: number; t: number } | null = null;
    const ownScroll = (el: Element | null) => {
      for (let n = el; n && n !== main; n = n.parentElement) {
        if (n.matches("input, textarea, select, [contenteditable=true], [data-no-swipe], [role=dialog]")) return true;
        if (n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).overflowX !== "visible") return true;
      }
      return false;
    };
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      start = e.touches.length === 1 && !ownScroll(e.target as Element) ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const quick = Date.now() - start.t < 700;
      start = null;
      if (quick && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) latest.current(dx < 0 ? "left" : "right");
    };
    main.addEventListener("touchstart", down, { passive: true });
    main.addEventListener("touchend", up, { passive: true });
    return () => {
      main.removeEventListener("touchstart", down);
      main.removeEventListener("touchend", up);
    };
  }, []);
}
