"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePersistentState } from "@/lib/persist";
import { usePrefetchScreen } from "@/lib/prefetch";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { NavIcon } from "./NavIcon";
import { BARE_PAGES, type NavItem } from "./nav";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { Glyph } from "@/components/art/Glyphs";
import { openWaiting, summarise, useWaiting } from "@/lib/waiting";
import { QuietDot } from "./QuietDot";

const MAX_TABS = 5;
// On phones the everyday sections come first; the rest sit under "More".
const PRIORITY = ["today", "tracker", "expressions", "people", "daily", "weekly", "insights", "commitment"];

export function MobileTabBar({ items, extras }: { items: NavItem[]; extras: NavItem[] }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const prefetch = usePrefetchScreen();
  const { items: waiting } = useWaiting();
  useKeyboardAware();

  // Everything fits in five slots, or the first four stay and the rest go under "More".
  const ranked = [...items].sort((a, b) => PRIORITY.indexOf(a.key) - PRIORITY.indexOf(b.key));
  const all = [...ranked, ...extras];
  const fits = all.length <= MAX_TABS;
  const primary = fits ? all : all.slice(0, MAX_TABS - 1);
  const rest = fits ? [] : all.slice(MAX_TABS - 1);

  // A section opened from "More" takes the middle slot and stays there (the last section
  // steps under "More") until another is chosen, or that one is opened again.
  const [savedPin, setSavedPin] = usePersistentState<string>("tabbar.pinned", "");
  const here = rest.find((i) => pathname.startsWith(i.href));
  const displaced = primary[primary.length - 1];
  const backToIt = !!displaced && pathname.startsWith(displaced.href);
  const pinKey = here ? here.key : backToIt ? "" : savedPin;
  useEffect(() => {
    if (pinKey !== savedPin) setSavedPin(pinKey);
  }, [pinKey, savedPin, setSavedPin]);
  const pinned = rest.find((i) => i.key === pinKey);
  const middle = Math.floor((primary.length + 1) / 2); // with "More", the centre of the bar
  const kept = primary.slice(0, -1);
  const tabs = pinned ? [...kept.slice(0, middle), pinned, ...kept.slice(middle)] : primary;
  const overflow = pinned ? [displaced, ...rest.filter((i) => i.key !== pinned.key)] : rest;
  const moreActive = overflow.some((i) => pathname.startsWith(i.href));
  // Reading pages (a moment) take the whole screen; they bring their own way back.
  const bare = BARE_PAGES.some((p) => pathname.startsWith(p));

  return (
    <>
      <nav aria-label="Main" className={cn("ana-tabbar fixed bottom-0 inset-x-0 z-20 lg:hidden bg-nav/95 backdrop-blur-md border-t border-line pb-safe transition-transform duration-200", bare && "hidden")}>
        <div className="flex items-stretch justify-around h-16 px-1 max-w-[560px] mx-auto">
          {tabs.map((item) => (
            <Tab
              key={item.key}
              href={item.href}
              label={item.label}
              active={pathname.startsWith(item.href)}
              icon={(on) => (
                <>
                  <NavIcon k={item.key} size={22} weight={on ? "fill" : "regular"} />
                  {item.key === "profile" && <QuietDot className="-top-0.5 -right-1" />}
                </>
              )}
            />
          ))}
          {!fits && (
            <button type="button" onClick={() => setMore(true)} aria-expanded={more} className="press relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0">
              <TabInner
                active={moreActive || more}
                label="More"
                icon={() => (
                  <>
                    <Glyph k="more" size={24} />
                    {overflow.some((i) => i.key === "profile") && <QuietDot className="-top-0.5 -right-1" />}
                  </>
                )}
                layoutId={moreActive ? "tab-active" : undefined}
              />
            </button>
          )}
        </div>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="More">
        {waiting.length > 0 && (
          <div className="-mx-2 mb-2">
            <button
              type="button"
              onClick={() => {
                setMore(false);
                openWaiting();
              }}
              className="press w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] bg-surface border border-line text-left"
            >
              <span className="relative grid place-items-center w-[21px] text-ink-soft">
                <Glyph k="sync" size={19} />
              </span>
              <span className="min-w-0">
                <span className="block font-ui text-[14px] font-semibold text-ink">Kept on this phone</span>
                <span className="block font-ui text-[12.5px] text-ink-soft truncate">{summarise(waiting)}</span>
              </span>
            </button>
          </div>
        )}
        <ul className="flex flex-col gap-1 -mx-2">
          {overflow.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.key}>
                <Link href={item.href} {...prefetch(item.href)} onClick={() => setMore(false)} aria-current={active ? "page" : undefined} className={cn("press flex items-center gap-3 h-12 px-3 rounded-[14px] font-ui text-[15px] font-semibold", active ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface")}>
                  <span className="relative">
                    <NavIcon k={item.key} size={21} weight={active ? "fill" : "regular"} />
                    {item.key === "profile" && <QuietDot className="-top-0.5 -right-1 ring-bg" />}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}

function Tab({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: (on: boolean) => React.ReactNode }) {
  const prefetch = usePrefetchScreen();
  return (
    <Link href={href} {...prefetch(href)} aria-current={active ? "page" : undefined} className="press relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0">
      <TabInner active={active} label={label} icon={icon} layoutId={active ? "tab-active" : undefined} />
    </Link>
  );
}

function TabInner({ active, label, icon, layoutId }: { active: boolean; label: string; icon: (on: boolean) => React.ReactNode; layoutId?: string }) {
  return (
    <>
      <span className={cn("relative grid place-items-center w-14 h-8", active ? "text-accent" : "text-ink-soft")}>
        {layoutId && (
          <motion.span layoutId={layoutId} layoutDependency={label} className="absolute inset-0 rounded-full bg-accent-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
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
