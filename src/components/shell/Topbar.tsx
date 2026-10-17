"use client";

import { usePathname } from "next/navigation";
import { BARE_PAGES, PAGE_TITLES } from "./nav";
import { SearchButton } from "./Search";
import { NotificationBell } from "./NotificationBell";
import { Glyph } from "@/components/art/Glyphs";
import { FLOAT_BUTTON } from "@/components/ui/DetailBar";
import { cn } from "@/lib/utils";

/** Pages that explain themselves on request: the ⓘ asks the page to open its help. */
const HELP_PAGES = ["/commitment"];
export const HELP_EVENT = "ana:page-help";

/**
 * The top of every section page: no title row (the tab bar and sidebar already show where you
 * are), just search and the bell as two small round buttons at the top right that stay in
 * reach as you scroll, on a soft blur. Full-page views (a moment, a person) bring their own bar.
 */
export function Topbar() {
  const pathname = usePathname();
  // The most specific match wins (e.g. "/expressions/…" is a moment, "/expressions" the list).
  const title =
    Object.entries(PAGE_TITLES)
      .filter(([href]) => pathname.startsWith(href))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "";
  const bare = BARE_PAGES.some((p) => pathname.startsWith(p));
  const helpPage = HELP_PAGES.some((h) => pathname.startsWith(h));

  // Phones: a solid strip behind the status bar, so nothing scrolls under the clock.
  const statusStrip = <div aria-hidden="true" className="lg:hidden fixed top-0 inset-x-0 z-30 h-[var(--safe-top)] bg-bg/95 backdrop-blur-md" />;
  if (bare) return statusStrip;

  return (
    <>
      {statusStrip}
      {/* The page's name, for screen readers (sighted people see it in the tab bar or sidebar). */}
      <h1 className="sr-only">{title}</h1>
      <div className="sticky top-[max(10px,calc(var(--safe-top)+6px))] lg:top-6 z-30 h-10 -mr-1 mb-3 lg:mb-5 flex justify-end gap-2 pointer-events-none">
        {helpPage && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(HELP_EVENT))}
            aria-label={`About ${title}`}
            title={`About ${title}`}
            className={cn(FLOAT_BUTTON, "pointer-events-auto")}
          >
            <Glyph k="info" size={20} />
          </button>
        )}
        <SearchButton floating className="pointer-events-auto" />
        <NotificationBell floating className="pointer-events-auto" />
      </div>
    </>
  );
}
