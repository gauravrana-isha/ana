"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lotus } from "@/components/art/Lotus";
import { PAGE_TITLES } from "./nav";
import { formatDateHand, today } from "@/lib/dates";
import { useQuote } from "@/lib/queries";
import { SearchButton } from "./Search";

export function Topbar() {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([href]) => pathname.startsWith(href))?.[1] ?? "";
  const { data: quoteData } = useQuote(today());
  const [quoteOpen, setQuoteOpen] = useState(false);
  const quote = quoteData?.quote;

  return (
    <div className="mb-6 lg:mb-8">
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <Link href="/" className="flex items-center gap-1.5 text-accent mb-3 lg:hidden w-fit" aria-label="ana home">
          <Lotus size={24} />
          <span className="font-display text-[19px] font-semibold text-ink leading-none">ana</span>
        </Link>
        <h1 className="font-display text-[28px] lg:text-[34px] font-semibold text-ink leading-[1.25] tracking-[-0.015em] truncate pb-0.5">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1 pb-0.5">
      <SearchButton className="lg:hidden" />
      <time
        dateTime={today()}
        className="inline-flex items-center gap-1.5 font-ui text-[13px] font-medium text-ink-soft tabular whitespace-nowrap"
        suppressHydrationWarning
      >
        <span className="w-1.5 h-1.5 rounded-full bg-saffron" aria-hidden="true" />
        {formatDateHand(today())}
      </time>
      </div>
    </header>
      {/* Phones don't have the sidebar, so the day's quote lives here. Tap to read it all. */}
      {quote && pathname.startsWith("/tracker") && (
        <button
          type="button"
          onClick={() => setQuoteOpen((o) => !o)}
          aria-expanded={quoteOpen}
          className="lg:hidden mt-3 block w-full text-left font-serif italic text-[14.5px] leading-[1.55] text-ink-soft rounded-lg"
        >
          <span className={quoteOpen ? "" : "line-clamp-2"}>&ldquo;{quote}&rdquo;</span>
        </button>
      )}
    </div>
  );
}
