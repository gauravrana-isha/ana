"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { BrandMark } from "@/components/art/BrandMark";
import { Ornament } from "@/components/art/Ornament";
import { NavIcon } from "./NavIcon";
import { usePrefetchScreen } from "@/lib/prefetch";
import { openSearch } from "./Search";
import type { NavItem } from "./nav";
import { cn } from "@/lib/utils";
import { QuietDot } from "./QuietDot";
import { useQuote } from "@/lib/queries";
import { today } from "@/lib/dates";
import { useMediaSrc } from "@/lib/vault/files";
import { Glyph } from "@/components/art/Glyphs";
import { Portal } from "@/components/ui/Portal";

interface SidebarProps {
  items: NavItem[];
  footerItems: NavItem[];
  user: { name: string; image: string | null };
  /** Read from the ana-sidebar cookie on the server, so the first paint is already right. */
  initialCollapsed: boolean;
}

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

/** Labels fade and fold away; the 48px icon column never moves. */
function Label({ collapsed, children, className }: { collapsed: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300",
        EASE,
        collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[180px]",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Label shown beside an icon when the sidebar is collapsed, on hover or keyboard focus of the
 * item it sits in. It's drawn outside the sidebar (whose list scrolls, and so would clip it),
 * placed beside the item.
 */
function Tip({ show, children }: { show: boolean; children: React.ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const item = anchor?.parentElement;
    if (!show || !item) return;
    const place = () => {
      const r = item.getBoundingClientRect();
      setAt({ x: r.right + 12, y: r.top + r.height / 2 });
    };
    const hide = () => setAt(null);
    item.addEventListener("pointerenter", place);
    item.addEventListener("pointerleave", hide);
    item.addEventListener("focus", place);
    item.addEventListener("blur", hide);
    item.addEventListener("click", hide);
    return () => {
      item.removeEventListener("pointerenter", place);
      item.removeEventListener("pointerleave", hide);
      item.removeEventListener("focus", place);
      item.removeEventListener("blur", hide);
      item.removeEventListener("click", hide);
    };
  }, [show, anchor]);

  if (!show) return null;
  return (
    <>
      <span ref={setAnchor} hidden />
      {at && (
        <Portal>
          <span
            aria-hidden="true"
            className="ana-side-tip pointer-events-none fixed z-[90] -translate-y-1/2 whitespace-nowrap rounded-[10px] bg-ink text-bg px-2.5 py-1.5 font-ui text-[12.5px] font-semibold"
            style={{ left: at.x, top: at.y }}
          >
            {children}
          </span>
        </Portal>
      )}
    </>
  );
}

export function Sidebar({ items, footerItems, user, initialCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const { data: quoteData } = useQuote(today());
  const quote = quoteData?.quote;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `ana-sidebar=${next ? "collapsed" : "open"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  const profileActive = pathname.startsWith("/profile");
  const prefetchProfile = usePrefetchScreen()("/profile");

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col bg-nav border-r border-line sticky top-0 h-dvh z-30 transition-[width] duration-300 motion-reduce:transition-none",
        EASE,
        collapsed ? "w-[76px]" : "w-[252px]"
      )}
    >
      <div className="flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar px-3.5 pt-5 pb-4">
        {/* Header: logo + collapse. Collapsed: the logo turns into the expand button on hover. */}
        <div className="relative flex items-center h-12 mb-5">
          <div className="group relative grid place-items-center w-12 h-12 shrink-0">
            <Link
              href="/"
              aria-label="ana home"
              tabIndex={collapsed ? -1 : 0}
              className={cn("grid place-items-center w-12 h-12 rounded-[14px] transition-opacity duration-150", collapsed && "group-hover:opacity-0 group-focus-within:opacity-0")}
            >
              <BrandMark size={34} />
            </Link>
            {collapsed && (
              <button
                type="button"
                onClick={toggle}
                aria-label="Expand sidebar"
                aria-expanded={false}
                className="absolute inset-0 grid place-items-center rounded-[14px] bg-surface text-ink opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-opacity duration-150"
              >
                <Glyph k="sidebar" size={23} />
              </button>
            )}
          </div>
          <Label collapsed={collapsed} className="ml-1.5 font-display text-[26px] font-semibold text-ink tracking-[-0.01em] leading-none">
            ana
          </Label>
          {!collapsed && (
            <button
              type="button"
              onClick={toggle}
              aria-label="Collapse sidebar"
              aria-expanded={true}
              className="press ml-auto grid place-items-center w-9 h-9 rounded-[11px] text-ink-soft hover:text-ink hover:bg-surface"
            >
              <Glyph k="sidebar" size={22} />
            </button>
          )}
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search"
          className="group relative flex items-center h-11 rounded-[12px] text-ink-soft hover:text-ink hover:bg-surface transition-colors mb-3"
        >
          <span className="grid place-items-center w-12 h-11 shrink-0">
            <NavIcon k="search" size={20} />
          </span>
          <Label collapsed={collapsed} className="flex-1 flex items-center font-ui text-[14px]">
            <span className="flex-1 text-left">Search</span>
            <kbd className="mr-2 font-ui text-[11px] font-semibold text-ink-soft/80 border border-line rounded-[6px] px-1.5 py-0.5">⌘K</kbd>
          </Label>
          <Tip show={collapsed}>Search · ⌘K</Tip>
        </button>

        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map((item) => (
            <SideLink key={item.key} item={item} active={pathname.startsWith(item.href)} collapsed={collapsed} />
          ))}
        </nav>

        <div className="mt-auto pt-6 flex flex-col gap-1">
          {quote && (
            <figure
              className={cn(
                // Short windows keep the room for the nav and profile; the quote is on Today too.
                "px-3 mb-4 overflow-hidden transition-[opacity,max-height] duration-300 [@media(max-height:860px)]:hidden",
                EASE,
                collapsed ? "opacity-0 max-h-0 mb-0" : "opacity-100 max-h-[260px]"
              )}
              aria-hidden={collapsed}
            >
              <Ornament name="divider" width={150} className="mb-4 text-ink-soft/35" />
              <blockquote className="font-serif italic text-[14px] leading-[1.55] text-ink-soft w-[196px]">
                {quote.length > 150 ? quote.slice(0, 150).trimEnd() + "…" : quote}
              </blockquote>
            </figure>
          )}

          <div className="border-t border-line pt-3 flex flex-col gap-1">
            {footerItems.map((item) => (
              <SideLink key={item.key} item={item} active={pathname.startsWith(item.href)} collapsed={collapsed} />
            ))}
            <Link
              href="/profile"
              {...prefetchProfile}
              aria-current={profileActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center h-12 rounded-[12px] transition-colors",
                profileActive ? "bg-accent-soft" : "hover:bg-surface"
              )}
            >
              {/* Remounts when it becomes the current page, so it pops like the other nav badges. */}
              <span key={profileActive ? "on" : "off"} className={cn("grid place-items-center w-12 h-12 shrink-0", profileActive && "fb-play")}>
                <span className="relative">
                  <Avatar name={user.name} image={user.image} size={30} />
                  <QuietDot className="top-0 right-0" />
                </span>
              </span>
              <Label collapsed={collapsed} className="flex flex-col min-w-0">
                <span className={cn("font-ui text-[14px] font-semibold truncate", profileActive ? "text-accent" : "text-ink")}>{user.name}</span>
                <span className="font-ui text-[12px] text-ink-soft">Profile & settings</span>
              </Label>
              <Tip show={collapsed}>Profile & settings</Tip>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SideLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const prefetch = usePrefetchScreen();
  return (
    <Link
      href={item.href}
      {...prefetch(item.href)}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center h-11 rounded-[12px] font-ui text-[14.5px] font-medium transition-colors duration-200",
        active ? "text-accent" : "text-ink-soft hover:text-ink hover:bg-surface/70"
      )}
    >
      {active && (
        // Measured only when it moves to another item: the page scrolling under the sidebar (or
        // jumping to the top on a new page) is not movement.
        <motion.span layoutId="side-active" layoutDependency={item.key} className="absolute inset-0 rounded-[12px] bg-accent-soft" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
      )}
      <span className="relative grid place-items-center w-12 h-11 shrink-0">
        <NavIcon k={item.key} size={21} weight={active ? "fill" : "regular"} />
      </span>
      <Label collapsed={collapsed} className="relative">
        {item.label}
      </Label>
      <Tip show={collapsed}>{item.label}</Tip>
    </Link>
  );
}

export function Avatar({ name, image, size = 28 }: { name: string; image: string | null; size?: number }) {
  // Your own photo is stored encrypted: open it here. (Google pictures load as they are.)
  const stored = image?.startsWith("/api/media/") ? image.slice("/api/media/".length) : null;
  const opened = useMediaSrc(stored);
  const src = stored ? opened : image;
  if (src) {
    return (
      // Google avatars are small remote images; a plain img avoids an image-domain config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full shrink-0 bg-surface-2"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full shrink-0 bg-accent-soft text-accent grid place-items-center font-ui font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
