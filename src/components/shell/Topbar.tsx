"use client";

import { usePathname } from "next/navigation";
import { Lotus } from "@/components/art/Lotus";
import { formatDateHand, today } from "@/lib/dates";

const PAGE_TITLES: Record<string, string> = {
  "/tracker": "Tracker",
  "/daily": "Daily Reflection",
  "/weekly": "Weekly",
  "/seva": "Seva",
  "/expressions": "Expressions",
  "/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "";
  const dateStr = formatDateHand(today());

  return (
    <div className="flex justify-between items-center mb-[18px]">
      {/* Mobile: logo + "ana" */}
      <div className="flex items-center -space-x-1 lg:hidden">
        <Lotus size={44} />
        <span className="font-hand text-2xl text-ink leading-none">ana</span>
      </div>

      {/* Desktop: page title in handwriting */}
      <h1 className="hidden lg:block font-hand text-[34px] text-ink leading-none">
        {title}
      </h1>

      {/* Right side: date */}
      <div className="flex items-center">
        <span className="font-hand text-[26px] leading-[0.9] text-accent">
          {dateStr}
        </span>
      </div>
    </div>
  );
}
