"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lotus } from "@/components/art/Lotus";
import { BACK_TO, PAGE_TITLES } from "./nav";
import { formatDateHand, today } from "@/lib/dates";
import { CaretLeft, Info } from "@phosphor-icons/react";
import { SearchButton } from "./Search";
import { NotificationBell } from "./NotificationBell";

/** Pages that explain themselves on request: the ⓘ in the header asks the page to open its help. */
const HELP_PAGES = ["/commitment"];
export const HELP_EVENT = "ana:page-help";

export function Topbar() {
  const pathname = usePathname();
  // The most specific match wins (e.g. "/expressions/…" is a moment, "/expressions" the list).
  const title =
    Object.entries(PAGE_TITLES)
      .filter(([href]) => pathname.startsWith(href))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "";
  const backTo = Object.entries(BACK_TO).find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const router = useRouter();
  // Back to where they came from when that's in this tab's history, else to the list.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push(backTo!));
  const helpPage = HELP_PAGES.some((h) => pathname.startsWith(h));
  const headerRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Phones: each page opens at its title, with the "ana" + bell row tucked just above
  // (scroll up to reach it). Only when arriving at the top, so back/forward keeps its place.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const id = requestAnimationFrame(() => {
      const head = headerRef.current;
      if (!head) return;
      // Leave the status-bar strip (the clock, on iPhone) clear, plus a small gap.
      const safeTop = statusRef.current?.offsetHeight ?? 0;
      const target = Math.max(0, head.getBoundingClientRect().top + window.scrollY - safeTop - 14);
      if (window.scrollY < target) window.scrollTo({ top: target, behavior: "instant" });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div className="mb-6 lg:mb-8">
    {/* Phones: a solid strip behind the status bar, so nothing scrolls under the clock. */}
    <div ref={statusRef} aria-hidden="true" className="lg:hidden fixed top-0 inset-x-0 z-30 h-[env(safe-area-inset-top)] bg-bg/95 backdrop-blur-md" />
    {/* Phones: the logo row carries the bell at its far end. */}
    <div className="lg:hidden flex items-center justify-between mb-2 -mt-1">
      <Link href="/" className="flex items-center gap-1.5 text-accent w-fit" aria-label="ana home">
        <Lotus size={24} />
        <span className="font-display text-[19px] font-semibold text-ink leading-none">ana</span>
      </Link>
      <NotificationBell className="-mr-1.5" />
    </div>
    <header ref={headerRef} className="flex items-end justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[26px] min-[400px]:text-[28px] lg:text-[34px] font-semibold text-ink leading-[1.25] tracking-[-0.015em] truncate pb-0.5">
          {backTo ? (
            <button type="button" onClick={goBack} aria-label={`${title}, back`} className="press group inline-flex items-center gap-1 -ml-2 pl-1 pr-2 rounded-[12px] hover:bg-surface">
              <CaretLeft weight="bold" className="w-[0.72em] h-[0.72em] text-ink-soft transition-transform group-hover:-translate-x-0.5 group-hover:text-ink" />
              {title}
            </button>
          ) : (
            title
          )}
        </h1>
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1 pb-0.5 shrink-0">
      {/* Pages with an ⓘ give search's spot to their title on phones (search is one tab away). */}
      {!helpPage && <SearchButton className="lg:hidden" />}
      {helpPage && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(HELP_EVENT))}
          aria-label={`About ${title}`}
          title={`About ${title}`}
          className="press grid place-items-center w-8 h-8 -mr-0.5 rounded-full text-ink-soft hover:text-ink hover:bg-surface"
        >
          <Info size={17} />
        </button>
      )}
      <time
        dateTime={today()}
        className="inline-flex items-center gap-1.5 ml-1 font-ui text-[13px] font-medium text-ink-soft tabular whitespace-nowrap"
        suppressHydrationWarning
      >
        <span className="w-1.5 h-1.5 rounded-full bg-saffron" aria-hidden="true" />
        {/* Phones drop the weekday when space is tight; the date itself always shows. */}
        {/* The weekday gives way on narrow phones when the ⓘ needs the room; the date always shows. */}
        <span>
          <span className={helpPage ? "max-[400px]:hidden" : "max-[340px]:hidden"}>{formatDateHand(today()).split(" · ")[0]} · </span>
          {formatDateHand(today()).split(" · ")[1]}
        </span>
      </time>
      {/* Wider screens: date, then the bell. */}
      <NotificationBell className="hidden lg:block ml-1" />
      </div>
    </header>
    </div>
  );
}
