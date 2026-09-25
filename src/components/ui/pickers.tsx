"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarBlank, Clock, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toISODate, today } from "@/lib/dates";
import { Chevron, RoundArrowButton } from "./Arrows";

/*
 * ana's own date and time pickers. Used everywhere instead of the browser/device pickers so
 * they look and behave the same on every phone and desktop.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// ---------------------------------------------------------------- panel

/** Bottom sheet on phones, small centred dialog on larger screens; always above other sheets. */
export function PickerPanel({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.3)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative w-full sm:w-[344px] bg-bg rounded-t-[24px] sm:rounded-[22px] shadow-[var(--shadow-lift)] px-5 pt-3 sm:pt-5 pb-[max(18px,env(safe-area-inset-bottom))] sm:pb-5"
            initial={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="sm:hidden block mx-auto w-10 h-1 rounded-full bg-line mb-3" aria-hidden="true" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-[19px] font-semibold text-ink">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="press grid place-items-center w-8 h-8 rounded-full bg-surface text-ink-soft hover:text-ink">
                <X size={14} />
              </button>
            </div>
            {children}
            {footer && <div className="mt-4 flex gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- calendar

interface CalendarProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  /** Highlight the whole Monday-first week of the selection. */
  week?: boolean;
}

export function Calendar({ value, onChange, min, max, week = false }: CalendarProps) {
  const base = value || (max && max < today() ? max : today());
  const [view, setView] = useState(() => {
    const d = new Date(base + "T12:00:00");
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [mode, setMode] = useState<"days" | "years">("days");
  const todayStr = today();

  const cells = useMemo(() => {
    const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
    const count = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => toISODate(new Date(view.y, view.m, i + 1)))];
  }, [view]);

  const weekStartOf = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return toISODate(d);
  };
  const selectedWeek = week && value ? weekStartOf(value) : null;
  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const minY = min ? Number(min.slice(0, 4)) : 1920;
  const maxY = max ? Number(max.slice(0, 4)) : new Date().getFullYear() + 10;
  const years = Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i);
  const yearsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode === "years") yearsRef.current?.querySelector("[data-current]")?.scrollIntoView({ block: "center" });
  }, [mode]);

  const shift = (n: number) => setView((v) => {
    const d = new Date(v.y, v.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setMode(mode === "days" ? "years" : "days")} aria-expanded={mode === "years"} className="press inline-flex items-center gap-1.5 h-9 px-2 -ml-2 rounded-[10px] font-ui text-[15px] font-semibold text-ink hover:bg-surface">
          {MONTHS[view.m]} {view.y}
          <Chevron dir={mode === "years" ? "up" : "down"} size={14} className="text-ink-soft" />
        </button>
        {mode === "days" && (
          <div className="flex gap-1.5">
            <RoundArrowButton dir="left" size="sm" aria-label="Previous month" onClick={() => shift(-1)} />
            <RoundArrowButton dir="right" size="sm" aria-label="Next month" onClick={() => shift(1)} />
          </div>
        )}
      </div>

      {mode === "years" ? (
        <div className="grid grid-cols-3 gap-1.5">
          <div className="col-span-3 grid grid-cols-4 gap-1 mb-2">
            {MONTHS.map((name, i) => (
              <button key={name} type="button" onClick={() => { setView((v) => ({ ...v, m: i })); setMode("days"); }} className={cn("press h-9 rounded-[10px] font-ui text-[13px] font-semibold", i === view.m ? "bg-accent text-bg" : "text-ink hover:bg-surface")}>
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
          <div ref={yearsRef} className="col-span-3 grid grid-cols-4 gap-1 max-h-[196px] overflow-y-auto overscroll-contain pr-1">
            {years.map((y) => (
              <button key={y} type="button" data-current={y === view.y ? "" : undefined} onClick={() => setView((v) => ({ ...v, y }))} className={cn("press h-9 rounded-[10px] font-ui text-[13px] font-semibold tabular", y === view.y ? "bg-accent text-bg" : "text-ink hover:bg-surface")}>
                {y}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <span key={d} className="text-center font-ui text-[11.5px] font-semibold text-ink-soft py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((iso, i) => {
              if (!iso) return <span key={`e${i}`} />;
              const off = disabled(iso);
              const sel = iso === value;
              const inWeek = !!selectedWeek && weekStartOf(iso) === selectedWeek;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={off}
                  onClick={() => onChange(week ? weekStartOf(iso) : iso)}
                  aria-pressed={sel}
                  aria-label={new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  className={cn(
                    "press mx-auto grid place-items-center w-10 h-10 font-ui text-[14px] tabular transition-colors",
                    inWeek ? "rounded-[10px]" : "rounded-full",
                    sel ? "bg-accent text-bg font-semibold" : inWeek ? "bg-accent-soft text-accent font-semibold" : "text-ink hover:bg-surface",
                    !sel && iso === todayStr && "ring-1 ring-inset ring-accent/60 text-accent font-semibold",
                    off && "text-ink-soft/40 hover:bg-transparent cursor-not-allowed"
                  )}
                >
                  {Number(iso.slice(8))}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- time

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function formatTime12(hhmm: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

export function TimeDial({ value, onChange }: { value: string; onChange: (hhmm: string) => void }) {
  const [h24, m] = (value || "05:00").split(":").map(Number);
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const pm = h24 >= 12;
  const set = (h12: number, min: number, isPm: boolean) => {
    const h = (h12 % 12) + (isPm ? 12 : 0);
    onChange(`${String(h).padStart(2, "0")}:${String(((min % 60) + 60) % 60).padStart(2, "0")}`);
  };

  return (
    <div>
      {/* Type it, or tap below. */}
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <DigitInput label="Hour" value={hour12} min={1} max={12} onCommit={(v) => set(v, m, pm)} />
        <span className="font-display text-[40px] font-semibold text-ink leading-none pb-1">:</span>
        <DigitInput label="Minute" value={m} min={0} max={59} pad onCommit={(v) => set(hour12, v, pm)} />
      </div>
      <div role="radiogroup" aria-label="Morning or evening" className="mx-auto mb-4 grid grid-cols-2 p-1 rounded-full bg-surface w-[168px]">
        {(["am", "pm"] as const).map((p) => {
          const on = pm === (p === "pm");
          return (
            <button key={p} type="button" role="radio" aria-checked={on} onClick={() => set(hour12, m, p === "pm")} className={cn("press h-9 rounded-full font-ui text-[13.5px] font-semibold transition-colors", on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}>
              {p}
            </button>
          );
        })}
      </div>
      <p className="font-ui text-[12px] font-semibold text-ink-soft mb-1.5">Hour</p>
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {HOURS.map((h) => (
          <button key={h} type="button" aria-pressed={h === hour12} onClick={() => set(h, m, pm)} className={cn("press h-10 rounded-[12px] font-ui text-[14px] tabular", h === hour12 ? "bg-accent text-bg font-semibold" : "bg-surface text-ink hover:bg-surface-2")}>
            {h}
          </button>
        ))}
      </div>
      <p className="font-ui text-[12px] font-semibold text-ink-soft mb-1.5">Minute</p>
      <div className="grid grid-cols-6 gap-1.5">
        {MINUTES.map((mm) => (
          <button key={mm} type="button" aria-pressed={mm === m} onClick={() => set(hour12, mm, pm)} className={cn("press h-10 rounded-[12px] font-ui text-[14px] tabular", mm === m ? "bg-accent text-bg font-semibold" : "bg-surface text-ink hover:bg-surface-2")}>
            {String(mm).padStart(2, "0")}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A big number you can tap into and type; arrow keys step it. */
function DigitInput({ label, value, min, max, pad, onCommit }: { label: string; value: number; min: number; max: number; pad?: boolean; onCommit: (v: number) => void }) {
  const shown = pad ? String(value).padStart(2, "0") : String(value);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    const n = parseInt(raw);
    if (!isNaN(n)) onCommit(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft ?? shown}
      placeholder={shown}
      // Start empty on focus (the current value shows faintly), so typing always replaces it.
      onFocus={() => setDraft("")}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 2);
        setDraft(v);
        // Two digits typed: take it and move on.
        if (v.length === 2) commit(v);
      }}
      onBlur={() => (draft ? commit(draft) : setDraft(null))}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(draft || shown);
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = value + (e.key === "ArrowUp" ? 1 : -1);
          onCommit(next > max ? min : next < min ? max : next);
        }
      }}
      className="w-[84px] h-[64px] text-center rounded-[16px] bg-surface font-display text-[40px] font-semibold text-ink tabular leading-none outline-none focus-visible:outline-none border-2 border-transparent focus:border-accent placeholder:text-ink-soft/40 transition-colors"
    />
  );
}

// ---------------------------------------------------------------- fields

const fieldClass =
  "press w-full h-12 px-4 rounded-[14px] bg-surface-2 text-left font-ui text-[16px] tabular flex items-center gap-2.5 border border-transparent hover:border-line focus-visible:outline-none focus-visible:border-accent";

function prettyDate(iso: string, withYear = true, withWeekday = true) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { ...(withWeekday ? { weekday: "short" } : {}), day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

interface DateFieldProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  label: string;
  className?: string;
  /** Leave out the weekday (for tight spots, e.g. beside a time). */
  compact?: boolean;
}

export function DateField({ value, onChange, placeholder = "Choose a date", min, max, clearable, label, className, compact }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={cn("relative", className)}>
        <button type="button" onClick={() => setOpen(true)} aria-label={`${label}: ${value ? prettyDate(value) : "not set"}`} className={fieldClass}>
          <CalendarBlank size={18} className="text-ink-soft shrink-0" />
          <span className={cn("flex-1 truncate", value ? "text-ink" : "text-ink-soft/80")}>{value ? prettyDate(value, true, !compact) : placeholder}</span>
        </button>
        {clearable && value && (
          <button type="button" aria-label={`Clear ${label}`} onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface">
            <X size={14} />
          </button>
        )}
      </div>
      <PickerPanel open={open} onClose={() => setOpen(false)} title={label}>
        <Calendar value={value} min={min} max={max} onChange={(d) => { onChange(d); setOpen(false); }} />
      </PickerPanel>
    </>
  );
}

export function TimeField({ value, onChange, label, className, compact = false }: { value: string; onChange: (hhmm: string) => void; label: string; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <>
      <button
        type="button"
        onClick={() => { setDraft(value || "05:00"); setOpen(true); }}
        aria-label={`${label}: ${value ? formatTime12(value) : "not set"}`}
        className={compact ? cn("press inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] bg-surface-2 text-ink font-ui text-[14px] tabular hover:bg-[color-mix(in_srgb,var(--surface-2)_85%,var(--ink)_6%)]", className) : cn(fieldClass, className)}
      >
        <Clock size={compact ? 14 : 18} className="text-ink-soft shrink-0" />
        <span className={cn("whitespace-nowrap", value ? "text-ink" : "text-ink-soft/80")}>{value ? formatTime12(value) : "Set time"}</span>
      </button>
      <PickerPanel
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="press flex-1 h-11 rounded-[14px] bg-surface-2 text-ink font-ui text-[14px] font-semibold">Cancel</button>
            <button type="button" onClick={() => { onChange(draft); setOpen(false); }} className="press flex-1 h-11 rounded-[14px] bg-accent text-bg font-ui text-[14px] font-semibold">Set time</button>
          </>
        }
      >
        <TimeDial value={draft} onChange={setDraft} />
      </PickerPanel>
    </>
  );
}

/** Date and time side by side. Value is local "YYYY-MM-DDTHH:MM". */
export function DateTimeField({ value, onChange, label, min, max }: { value: string; onChange: (v: string) => void; label: string; min?: string; max?: string }) {
  const [date, time] = value.split("T");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <DateField compact label={`${label}: date`} value={date} min={min} max={max} onChange={(d) => d && onChange(`${d}T${time || "12:00"}`)} />
      <TimeField label={`${label}: time`} value={time?.slice(0, 5) ?? ""} onChange={(t) => onChange(`${date}T${t}`)} />
    </div>
  );
}
