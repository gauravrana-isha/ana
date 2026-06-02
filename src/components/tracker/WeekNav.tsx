"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { today, addDays } from "@/lib/dates";

interface WeekNavProps {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  mode?: "daily" | "weekly";
}

export function WeekNav({ date, onPrev, onNext, mode = "daily" }: WeekNavProps) {
  const isToday = date === today() || date >= today();

  const label = mode === "weekly"
    ? formatWeekRange(date)
    : formatDayLabel(date);

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="w-[34px] h-[34px] rounded-full bg-surface border border-line text-ink grid place-items-center"
        aria-label="Previous"
      >
        <CaretLeft size={16} weight="thin" />
      </button>
      <div className="font-serif text-base text-ink">
        {label}
      </div>
      <button
        onClick={onNext}
        disabled={isToday}
        className="w-[34px] h-[34px] rounded-full bg-surface border border-line text-ink grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next"
      >
        <CaretRight size={16} weight="thin" />
      </button>
    </div>
  );
}

function formatDayLabel(date: string): string {
  const d = new Date(date + "T12:00:00");
  const todayStr = today();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayPart = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;

  if (date === todayStr) {
    return `Today · ${dayPart}`;
  }
  return dayPart;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const endDate = addDays(weekStart, 6);
  const end = new Date(endDate + "T12:00:00");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const startStr = `${dayNames[start.getDay()]}, ${monthNames[start.getMonth()]} ${start.getDate()}`;
  const endStr = `${dayNames[end.getDay()]}, ${monthNames[end.getMonth()]} ${end.getDate()}`;

  return `${startStr} – ${endStr}`;
}
