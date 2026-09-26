"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePersistentState } from "@/lib/persist";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { DotsThreeCircle } from "@phosphor-icons/react";
import { NavIcon } from "./NavIcon";
import type { NavItem } from "./nav";
import { cn } from "@/lib/utils";

const MAX_TABS = 5;
// On phones the everyday sections come first; the rest sit under "More".
const PRIORITY = ["today", "tracker", "expressions", "people", "daily", "weekly", "insights", "commitment"];

export function MobileTabBar({ items, extras }: { items: NavItem[]; extras: NavItem[] }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  useKeyboardAware();

  // Everything fits in five slots, or the first four stay and the rest go under "More".
  const ranked = [...items].sort((a, b) => PRIORITY.indexOf(a.key) - PRIORITY.indexOf(b.key));
  const all = [...ranked, ...extras];
  const fits = all.length <= MAX_TABS;
  const primary = fits ? all : all.slice(0, MAX_TABS - 1);
  const rest = fits ? [] : all.slice(MAX_TABS - 1);

  // A section opened from "More" takes the first slot and stays there (the first section,
  // usually Today, moves under "More") until another is chosen, or that one is opened again.
  const [savedPin, setSavedPin] = usePersistentState<string>("tabbar.pinned", "");
  const here = rest.find((i) => pathname.startsWith(i.href));
  const backToFirst = !!primary[0] && pathname.startsWith(primary[0].href);
  const pinKey = here ? here.key : backToFirst ? "" : savedPin;
  useEffect(() => {
    if (pinKey !== savedPin) setSavedPin(pinKey);
  }, [pinKey, savedPin, setSavedPin]);
  const pinned = rest.find((i) => i.key === pinKey);
  const tabs = pinned ? [pinned, ...primary.slice(1)] : primary;
  const overflow = pinned ? [primary[0], ...rest.filter((i) => i.key !== pinned.key)] : rest;
  const moreActive = overflow.some((i) => pathname.startsWith(i.href));

  return (
    <>
      <nav aria-label="Main" className="ana-tabbar fixed bottom-0 inset-x-0 z-20 lg:hidden bg-nav/95 backdrop-blur-md border-t border-line pb-safe transition-transform duration-200">
        <div className="flex items-stretch justify-around h-16 px-1 max-w-[560px] mx-auto">
          {tabs.map((item) => (
            <Tab key={item.key} href={item.href} label={item.label} active={pathname.startsWith(item.href)} icon={(on) => <NavIcon k={item.key} size={22} weight={on ? "fill" : "regular"} />} />
          ))}
          {!fits && (
            <button type="button" onClick={() => setMore(true)} aria-expanded={more} className="press relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0">
              <TabInner active={moreActive || more} label="More" icon={(on) => <DotsThreeCircle size={22} weight={on ? "fill" : "regular"} />} layoutId={moreActive ? "tab-active" : undefined} />
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {more && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
            <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.3)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-bg shadow-[var(--shadow-lift)] px-4 pt-3 pb-[calc(80px+env(safe-area-inset-bottom))]"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="block mx-auto w-10 h-1 rounded-full bg-line mb-3" aria-hidden="true" />
              <ul className="flex flex-col gap-1">
                {overflow.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <li key={item.key}>
                      <Link href={item.href} onClick={() => setMore(false)} aria-current={active ? "page" : undefined} className={cn("press flex items-center gap-3 h-12 px-3 rounded-[14px] font-ui text-[15px] font-semibold", active ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface")}>
                        <NavIcon k={item.key} size={21} weight={active ? "fill" : "regular"} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function Tab({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: (on: boolean) => React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="press relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0">
      <TabInner active={active} label={label} icon={icon} layoutId={active ? "tab-active" : undefined} />
    </Link>
  );
}

function TabInner({ active, label, icon, layoutId }: { active: boolean; label: string; icon: (on: boolean) => React.ReactNode; layoutId?: string }) {
  return (
    <>
      <span className={cn("relative grid place-items-center w-14 h-8", active ? "text-accent" : "text-ink-soft")}>
        {layoutId && (
          <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-accent-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
        )}
        <span className="relative">{icon(active)}</span>
      </span>
      <span className={cn("font-ui text-[11px] leading-none truncate transition-colors", active ? "text-accent font-semibold" : "text-ink-soft")}>{label}</span>
    </>
  );
}

/**
 * Marks <html> with .kb-open while the on-screen keyboard is up (a text field is focused and
 * the visual viewport has shrunk), so fixed bottom UI can step aside.
 */
function useKeyboardAware() {
  useEffect(() => {
    const html = document.documentElement;
    const vv = window.visualViewport;
    const isField = (el: Element | null) =>
      !!el && (el.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select") || (el as HTMLElement).isContentEditable);
    // The bar only exists below the desktop breakpoint, so any focused text field there means
    // a keyboard is (or is about to be) up. Pointer type isn't reliable across Android/emulators.
    const update = () => {
      const narrow = window.innerWidth < 1024;
      const shrunk = vv ? window.innerHeight - vv.height > 120 : false;
      const typing = narrow && isField(document.activeElement);
      html.classList.toggle("kb-open", typing || (narrow && shrunk));
    };
    // Leaving a field: wait a moment before the bar returns, so a tap that caused the blur
    // (e.g. on a floating Save button) lands before anything moves under the finger.
    const later = () => setTimeout(update, 320);
    // Pressing a floating button (Save, Edit) keeps the text field focused, so the keyboard
    // and layout don't shift mid-tap and the press lands where the finger is.
    const keepFocus = (e: Event) => {
      if ((e.target as Element | null)?.closest?.(".ana-fab") && isField(document.activeElement)) e.preventDefault();
    };
    document.addEventListener("mousedown", keepFocus, true);
    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    update();
    return () => {
      document.removeEventListener("mousedown", keepFocus, true);
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
      html.classList.remove("kb-open");
    };
  }, []);
}
