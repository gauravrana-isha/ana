"use client";

import { cn } from "@/lib/utils";

interface TendedRowProps {
  name: string;
  daysCompleted: number;
}

export function TendedRow({ name, daysCompleted }: TendedRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="font-serif text-[15px] text-ink w-[130px] shrink-0 truncate">
        {name}
      </div>
      <div className="flex gap-[5px]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-[13px] h-[13px] rounded-full border",
              i < daysCompleted
                ? "bg-good border-good"
                : "bg-surface-2 border-line"
            )}
          />
        ))}
      </div>
      <div className="font-ui text-xs text-ink-soft ml-auto">
        {daysCompleted} of 7
      </div>
    </div>
  );
}
