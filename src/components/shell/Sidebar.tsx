"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ListChecks,
  Compass,
  CalendarBlank,
  NotePencil,
  Gear,
  UserCircle,
} from "@phosphor-icons/react";
import { Lotus } from "@/components/art/Lotus";
import { cn } from "@/lib/utils";
import { useQuote } from "@/lib/queries";
import { today } from "@/lib/dates";

const NAV = [
  { href: "/tracker", label: "Tracker", icon: ListChecks },
  { href: "/daily", label: "Daily", icon: Compass },
  { href: "/weekly", label: "Weekly", icon: CalendarBlank },
  { href: "/expressions", label: "Expressions", icon: NotePencil },
  { href: "/settings", label: "Settings", icon: Gear },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: quoteData } = useQuote(today());
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user info
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.email) setUsername(data.email);
    }).catch(() => {});
  }, []);

  return (
    <aside className="hidden lg:flex w-[230px] shrink-0 border-r border-line flex-col bg-nav sticky top-0 h-dvh overflow-y-auto">
      <div className="p-[26px_18px] flex flex-col h-full">
        {/* Brand */}
        <div className="flex items-center gap-1 mb-8 px-2">
          <Lotus size={44} />
          <span className="font-hand text-[26px] text-ink tracking-[0.02em]">
            ana
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-[13px] px-3.5 py-3 rounded-[12px] transition-all duration-250",
                  isActive
                    ? "text-accent bg-accent-soft"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                <Icon size={22} weight="thin" />
                <span className="font-ui text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quote at bottom */}
        <div className="mt-auto pt-4 px-3 space-y-4">
          {quoteData?.quote && (
            <p className="font-serif italic text-[13px] leading-[1.5] text-ink-soft">
              &ldquo;{quoteData.quote.slice(0, 120)}{quoteData.quote.length > 120 ? "…" : ""}&rdquo;
            </p>
          )}

          {/* User info */}
          <div className="flex items-center gap-2 pt-3 border-t border-line">
            <UserCircle size={18} weight="thin" className="text-ink-soft" />
            <span className="font-ui text-xs text-ink-soft truncate">
              {username ?? "Anonymous"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
