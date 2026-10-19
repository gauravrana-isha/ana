"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePrefetchScreen } from "@/lib/prefetch";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { NavIcon } from "./NavIcon";
import { BARE_PAGES } from "./nav";
import { cn } from "@/lib/utils";
import { onSection, type Tab } from "@/lib/nav-plan";
import { BarBundleMenu, TabBarChooser, openBundleMenu, useBundleHref, useNavPlan, useRememberBundleScreen } from "./BundleNav";

/**
 * The phone's tab bar: five tabs at most, never a "More" (see lib/nav-plan). A tab per screen
 * when they fit; otherwise a tab per bundle, with dots for the screens inside it. Tapping the
 * open bundle's tab again lists its screens; with more than four bundles, holding a bundle's
 * tab chooses which four sit here.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { plan } = useNavPlan();
  const [choosing, setChoosing] = useState(false);
  useKeyboardAware();
  useRememberBundleScreen();
  // Reading pages (a moment) take the whole screen; they bring their own way back.
  const bare = BARE_PAGES.some((p) => pathname.startsWith(p));

  return (
    <>
      <nav aria-label="Main" className={cn("ana-tabbar fixed bottom-0 inset-x-0 z-20 lg:hidden bg-nav/95 backdrop-blur-md border-t border-line pb-safe transition-transform duration-200", bare && "hidden")}>
        <div className="flex items-stretch justify-around h-16 px-1 max-w-[560px] mx-auto">
          {plan.tabs.map((t) =>
            t.kind === "bundle" ? (
              <BundleTab key={t.key} tab={t} onHold={plan.offBar.length > 0 ? () => setChoosing(true) : undefined} />
            ) : (
              <Tab key={t.key} href={t.href} label={t.label} active={t.kind === "home" ? pathname.startsWith(t.href) : onSection(pathname, t.key)} icon={(on) => <NavIcon k={t.key} size={22} weight={on ? "fill" : "regular"} />} />
            )
          )}
        </div>
      </nav>
      <BarBundleMenu />
      <TabBarChooser open={choosing} onClose={() => setChoosing(false)} />
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

/** A bundle's tab: opens the screen last open in it; tapped again while open, lists its screens. */
function BundleTab({ tab, onHold }: { tab: Extract<Tab, { kind: "bundle" }>; onHold?: () => void }) {
  const pathname = usePathname();
  const prefetch = usePrefetchScreen();
  const href = useBundleHref(tab.key, tab.sections);
  const here = tab.sections.findIndex((k) => onSection(pathname, k));
  const active = here >= 0;
  const held = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  const startHold = () => {
    if (!onHold) return;
    holding.current = false;
    held.current = setTimeout(() => {
      holding.current = true;
      onHold();
    }, 500);
  };
  const endHold = () => held.current && clearTimeout(held.current);

  return (
    <Link
      href={href}
      {...prefetch(href)}
      aria-current={active ? "page" : undefined}
      aria-haspopup={tab.sections.length > 1 ? "menu" : undefined}
      onClick={(e) => {
        // Held to choose the bar: not a tap. Open already: list its screens instead.
        if (holding.current || (active && tab.sections.length > 1)) {
          e.preventDefault();
          if (!holding.current) openBundleMenu(tab.key);
        }
      }}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onContextMenu={(e) => onHold && e.preventDefault()}
      className="press relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0"
    >
      <TabInner active={active} label={tab.label} icon={(on) => <NavIcon k={tab.mark} size={22} weight={on ? "fill" : "regular"} />} layoutId={active ? "tab-active" : undefined} />
      {tab.sections.length > 1 && (
        // One dot per screen inside, the open one filled.
        <span aria-hidden="true" className="absolute bottom-[3px] flex gap-[3px]">
          {tab.sections.map((k, i) => (
            <span key={k} className={cn("w-[3px] h-[3px] rounded-full", i === here ? "bg-accent" : "bg-ink-soft/35")} />
          ))}
        </span>
      )}
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
