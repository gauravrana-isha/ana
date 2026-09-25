"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const tabs = fits ? all : all.slice(0, MAX_TABS - 1);
  const overflow = fits ? [] : all.slice(MAX_TABS - 1);
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
    const update = () => {
      const shrunk = vv ? window.innerHeight - vv.height > 120 : false;
      const typing = isField(document.activeElement) && window.matchMedia("(pointer: coarse)").matches;
      html.classList.toggle("kb-open", shrunk || typing);
    };
    const later = () => setTimeout(update, 50);
    vv?.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    update();
    return () => {
      vv?.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
      html.classList.remove("kb-open");
    };
  }, []);
}
