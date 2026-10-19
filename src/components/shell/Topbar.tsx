"use client";

import { usePathname } from "next/navigation";
import { BARE_PAGES, PAGE_TITLES } from "./nav";
import { InfoMark } from "@/components/art/PenMarks";
import { BundleTitle } from "./BundleTitle";

/** Pages that explain themselves on request: the ⓘ asks the page to open its help. */
const HELP_PAGES: string[] = [];
export const HELP_EVENT = "ana:page-help";

/**
 * The top of every section page: no title row (the tab bar and sidebar already show where you
 * are). Search and the bell sit on Home; pages with an explanation get a small ⓘ. Full-page
 * views (a moment, a person, a settings page) bring their own bar. On phones, when each bundle
 * is one tab, the title of a bundle's screen is shown: it's the way between its screens.
 */
export function Topbar() {
  const pathname = usePathname();
  // The most specific match wins (e.g. "/moments/…" is a moment, "/moments" the list).
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
      {helpPage && (
        // Floats over the top of the page (taking no room of its own), quiet until needed.
        <div className="sticky top-[max(10px,calc(var(--safe-top)+6px))] lg:top-6 z-30 h-0 flex justify-end">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(HELP_EVENT))}
            aria-label={`About ${title}`}
            title={`About ${title}`}
            className="press -mr-2 grid place-items-center w-10 h-10 rounded-full text-ink-soft/60 hover:text-ink hover:bg-surface transition-colors"
          >
            <InfoMark size={21} />
          </button>
        </div>
      )}
      <BundleTitle />
    </>
  );
}
