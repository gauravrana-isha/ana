"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SECTIONS, bundleByKey, type BundleKey, type SectionKey } from "@/lib/bundles";
import { BUNDLE_SLOTS, onSection, planTabs } from "@/lib/nav-plan";
import { usePersistentState } from "@/lib/persist";
import { usePrefetchScreen } from "@/lib/prefetch";
import { Sheet } from "@/components/ui/Sheet";
import { NavIcon } from "./NavIcon";
import { useBundles } from "./Bundles";
import { cn } from "@/lib/utils";

/*
 * Moving around inside a bundle when each bundle is one tab: the tab opens the screen you were
 * last on in it, and its screens are listed from the page's title (the main way), from tapping
 * the tab again, or by swiping sideways. With more than four bundles, the person picks which
 * four sit in the bar.
 */

/** The tab bar's plan for this person (their bundles, and the four they pinned, if more). */
export function useNavPlan() {
  const bundles = useBundles();
  const [pinnedRaw, setPinnedRaw] = usePersistentState<string>("tabbar.bundles", "");
  return useMemo(() => {
    const pinned = pinnedRaw ? pinnedRaw.split(",") : [];
    return { plan: planTabs(bundles, pinned), pinned, setPinned: (list: string[]) => setPinnedRaw(list.join(",")) };
  }, [bundles, pinnedRaw, setPinnedRaw]);
}

// ---------------------------------------------------------------- the screen last open in each bundle

const LAST = (bundle: string) => `ana:bundle.${bundle}`;

function readLast(bundle: string): SectionKey | null {
  try {
    return localStorage.getItem(LAST(bundle)) as SectionKey | null;
  } catch {
    return null;
  }
}

/** Where a bundle's tab goes: the screen last open in it, else its first. */
export function useBundleHref(bundle: string, sections: readonly SectionKey[]) {
  const last = useSyncExternalStore(
    () => () => {},
    () => readLast(bundle),
    () => null
  );
  const key = last && sections.includes(last) ? last : sections[0];
  return SECTIONS[key].href;
}

/** Remembers which screen of its bundle each page is, so the tab returns there. */
export function useRememberBundleScreen() {
  const pathname = usePathname();
  const { plan } = useNavPlan();
  useEffect(() => {
    for (const t of plan.tabs) {
      if (t.kind !== "bundle") continue;
      const s = t.sections.find((k) => onSection(pathname, k));
      if (s) {
        try {
          localStorage.setItem(LAST(t.key), s);
        } catch {
          /* not remembered; the tab opens the first screen */
        }
      }
    }
  }, [pathname, plan]);
}

// ---------------------------------------------------------------- the list of a bundle's screens

// Opened from the tab bar (tapping the open bundle's tab again).
let openFromBar: string | null = null;
const barListeners = new Set<() => void>();
export function openBundleMenu(bundle: string | null) {
  openFromBar = bundle;
  barListeners.forEach((l) => l());
}
/** Which bundle's list is open above the tab bar, if any. */
export function useBarMenu() {
  return useSyncExternalStore(
    (cb) => {
      barListeners.add(cb);
      return () => barListeners.delete(cb);
    },
    () => openFromBar,
    () => null
  );
}

/** A bundle's screens, the current one marked; tapping one goes there. */
export function BundleMenuList({ sections, onPick }: { sections: readonly SectionKey[]; onPick: () => void }) {
  const pathname = usePathname();
  const prefetch = usePrefetchScreen();
  return (
    <ul role="menu" className="flex flex-col p-1.5 min-w-[200px]">
      {sections.map((k) => {
        const here = onSection(pathname, k);
        return (
          <li key={k} role="none">
            <Link
              role="menuitem"
              href={SECTIONS[k].href}
              {...prefetch(SECTIONS[k].href)}
              onClick={onPick}
              aria-current={here ? "page" : undefined}
              className={cn("press flex items-center gap-3 h-11 px-3 rounded-[12px] font-ui text-[15px] font-semibold", here ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface")}
            >
              <NavIcon k={k} size={20} weight={here ? "fill" : "regular"} />
              <span className="flex-1">{SECTIONS[k].label}</span>
              {here && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The list, rising just above the tab bar (from tapping the open bundle's tab again). */
export function BarBundleMenu() {
  const open = useBarMenu();
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const bundle = open ? bundleByKey(open as BundleKey) : null;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !panel.current?.contains(e.target as Node)) openBundleMenu(null);
    };
    // A moment later, so the tap that opened it doesn't close it.
    const t = setTimeout(() => {
      document.addEventListener("pointerdown", close);
      document.addEventListener("keydown", close);
    });
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {bundle && (
        <motion.div
          ref={panel}
          key={bundle.key}
          aria-label={`${bundle.label}: its screens`}
          initial={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduce ? 0 : 8 }}
          transition={{ type: "spring", stiffness: 480, damping: 34 }}
          className="lg:hidden fixed z-40 left-1/2 -translate-x-1/2 bottom-[calc(72px+env(safe-area-inset-bottom))] rounded-[18px] bg-bg border border-line shadow-[var(--shadow-lift)]"
        >
          <BundleMenuList sections={bundle.sections} onPick={() => openBundleMenu(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- choosing the four in the bar

/** With more than four bundles: which four sit in the tab bar (the rest open from Home). */
export function TabBarChooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bundles = useBundles();
  const { plan, setPinned } = useNavPlan();
  const inBar = plan.tabs.flatMap((t) => (t.kind === "bundle" ? [t.key] : []));

  function toggle(key: string) {
    const next = inBar.includes(key) ? inBar.filter((k) => k !== key) : [...inBar, key].slice(-BUNDLE_SLOTS);
    // Kept to four: adding a fifth lets the earliest go.
    setPinned(next);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tab bar">
      <p className="font-ui text-[13.5px] text-ink-soft mb-3">Choose the {BUNDLE_SLOTS} bundles for the tab bar. The others open from Home.</p>
      <ul className="flex flex-col gap-1.5 pb-2">
        {bundles.map((k) => {
          const b = bundleByKey(k);
          const on = inBar.includes(k);
          return (
            <li key={k}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(k)}
                className={cn("press w-full flex items-center gap-3 p-3 rounded-[14px] border text-left", on ? "bg-accent-soft border-accent/30" : "bg-surface border-transparent")}
              >
                <NavIcon k={b.mark} size={22} weight={on ? "fill" : "regular"} />
                <span className="flex-1 font-ui text-[15px] font-semibold text-ink">{b.label}</span>
                <span className="font-ui text-[12.5px] text-ink-soft">{on ? `Tab ${inBar.indexOf(k) + 1}` : "On Home"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
