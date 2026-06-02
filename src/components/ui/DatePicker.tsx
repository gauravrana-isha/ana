"use client";

import { useState } from "react";
import { CaretLeft, CaretRight, CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { today, addDays, toISODate, weekStart as getWeekStart } from "@/lib/dates";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  mode: "day" | "week";
  disableFuture?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePicker({ value, onChange, mode, disableFuture = true }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(value + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const todayStr = today();

  function getLabel() {
    const d = new Date(value + "T12:00:00");
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (mode === "week") {
      const end = addDays(value, 6);
      const endD = new Date(end + "T12:00:00");
      return `${dayNames[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} – ${MONTHS[endD.getMonth()]} ${endD.getDate()}`;
    }
    const prefix = value === todayStr ? "Today · " : "";
    return `${prefix}${dayNames[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }

  function prevStep() {
    onChange(addDays(value, mode === "week" ? -7 : -1));
  }

  function nextStep() {
    const next = addDays(value, mode === "week" ? 7 : 1);
    if (disableFuture && next > todayStr) return;
    onChange(next);
  }

  const canGoNext = !disableFuture || addDays(value, mode === "week" ? 7 : 1) <= todayStr;

  // Calendar grid
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfWeek(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function handleDayClick(day: number) {
    let selected = toISODate(new Date(viewMonth.year, viewMonth.month, day));
    if (disableFuture && selected > todayStr) return;
    // In week mode, snap to the Monday of the selected day's week
    if (mode === "week") {
      const d = new Date(viewMonth.year, viewMonth.month, day);
      const dayOfWeek = d.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
      d.setDate(d.getDate() + diff);
      selected = toISODate(d);
    }
    onChange(selected);
    setOpen(false);
  }

  function prevMonth() {
    setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  }

  function nextMonth() {
    setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  }

  const daysInMonth = getDaysInMonth(viewMonth.year, viewMonth.month);
  const firstDay = getFirstDayOfWeek(viewMonth.year, viewMonth.month);
  const selectedDay = (() => {
    const d = new Date(value + "T12:00:00");
    if (d.getFullYear() === viewMonth.year && d.getMonth() === viewMonth.month) return d.getDate();
    return -1;
  })();

  return (
    <div className="relative">
      {/* Inline nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevStep}
          className="w-[34px] h-[34px] rounded-full bg-surface border border-line text-ink grid place-items-center"
          aria-label="Previous"
        >
          <CaretLeft size={16} weight="thin" />
        </button>

        <button
          onClick={() => { setOpen(!open); setViewMonth(() => { const d = new Date(value + "T12:00:00"); return { year: d.getFullYear(), month: d.getMonth() }; }); }}
          className="font-serif text-base text-ink flex items-center gap-2 hover:text-accent transition-colors"
        >
          {getLabel()}
          <CalendarBlank size={16} weight="thin" className="text-ink-soft" />
        </button>

        <button
          onClick={nextStep}
          disabled={!canGoNext}
          className="w-[34px] h-[34px] rounded-full bg-surface border border-line text-ink grid place-items-center disabled:opacity-30"
          aria-label="Next"
        >
          <CaretRight size={16} weight="thin" />
        </button>
      </div>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-40 mt-1 bg-surface border border-line rounded-16 p-4 shadow-xl w-[280px]">
          {/* Month/year nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="text-ink-soft hover:text-ink p-1">
              <CaretLeft size={14} weight="thin" />
            </button>
            <span className="font-ui text-sm font-medium text-ink">
              {MONTHS[viewMonth.month]} {viewMonth.year}
            </span>
            <button onClick={nextMonth} className="text-ink-soft hover:text-ink p-1">
              <CaretRight size={14} weight="thin" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center font-ui text-[10px] text-ink-soft py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toISODate(new Date(viewMonth.year, viewMonth.month, day));
              const isFuture = disableFuture && dateStr > todayStr;
              const isSelected = day === selectedDay;
              const isToday = dateStr === todayStr;

              // In week mode, highlight the whole selected week
              const isInSelectedWeek = mode === "week" && (() => {
                const d = new Date(viewMonth.year, viewMonth.month, day);
                const dayOfWeek = d.getDay();
                const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const monday = new Date(d);
                monday.setDate(monday.getDate() + mondayDiff);
                return toISODate(monday) === value;
              })();

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  disabled={isFuture}
                  className={cn(
                    "w-8 h-8 rounded-full grid place-items-center font-ui text-xs transition-all",
                    isSelected && "bg-accent text-bg",
                    !isSelected && isInSelectedWeek && "bg-accent-soft text-accent",
                    !isSelected && !isInSelectedWeek && isToday && "ring-1 ring-accent text-accent",
                    !isSelected && !isInSelectedWeek && !isToday && !isFuture && "text-ink hover:bg-surface-2",
                    isFuture && "text-ink-soft opacity-30 cursor-not-allowed"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today/This week shortcut */}
          <button
            onClick={() => { onChange(mode === "week" ? getWeekStart(todayStr) : todayStr); setOpen(false); }}
            className="mt-3 w-full py-1.5 rounded-lg bg-accent-soft text-accent font-ui text-xs font-medium"
          >
            {mode === "week" ? "This week" : "Today"}
          </button>
        </div>
      )}
    </div>
  );
}
