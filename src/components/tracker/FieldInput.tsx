"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { PickerPanel, TimeField } from "@/components/ui/pickers";
import { DEFAULT_SCALE, SCALE_KEYS, type FieldSpec } from "@/lib/practiceSpec";
import { MinusMark, PlusMark } from "@/components/art/PenMarks";

/* The controls a practice row is made of. Every control says what it is. */

export function DoneCheckbox({ done, onToggle, label = "Done" }: { done: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={label}
      className={cn(
        "press w-[30px] h-[30px] rounded-full grid place-items-center shrink-0 border-[1.6px] transition-colors duration-200",
        done ? "bg-accent border-accent text-bg" : "border-line text-transparent hover:border-ink-soft"
      )}
    >
      {/* The calligraphic tick, drawn rather than typed: fonts render "✓" differently, and
          badly on iPhone. Revealed left to right when ticked. */}
      <TickMark size={19} className={done ? "ana-tick-reveal" : undefined} />
    </button>
  );
}

/** The calligraphic tick, as a drawing (in the current text colour). */
export function TickMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M3.2 12.2c.4-1 1.9-1.4 2.6-.7.5.5.7 1.5 1 2.2.2.5.5.5.8 0C10.2 8.5 12.9 4.7 15.5 3.9c1.5-.5 3.1-.5 4.9-.5l.1.3C17.1 7.3 14.4 11.4 11.6 17c-.8 1.6-1.6 2.7-3.2 2.7-1.8 0-2.4-1.4-2.9-3.3-.5-1.7-2.6-3.2-2.3-4.2z"
      />
    </svg>
  );
}

/** 1× / 2× — for "how many times today" when the answer is small. */
export function TapCount({ field, value, onChange, practiceName }: { field: FieldSpec; value: number; onChange: (v: number) => void; practiceName: string }) {
  const max = field.max ?? 2;
  return (
    <div role="group" aria-label={`${practiceName}: ${field.title}`} title={`How many ${field.unit} today`} className="flex items-center gap-1 p-1 rounded-full bg-surface-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const on = value === n;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={on}
            aria-label={`${n} ${field.unit}`}
            onClick={() => onChange(on ? 0 : n)}
            className={cn(
              "press h-8 min-w-[40px] px-2 rounded-full font-ui text-[13px] font-semibold tabular transition-colors",
              on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink"
            )}
          >
            {n}×
          </button>
        );
      })}
    </div>
  );
}

/** A number with its unit underneath; opens the number editor. */
export function NumberChip({ field, value, onChange, practiceName }: { field: FieldSpec; value: number; onChange: (v: number) => void; practiceName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${practiceName}: ${field.title}${value ? ` ${value}` : " not set"}`}
        title={`${field.title} (${field.unit})`}
        // A fixed width (room for the longest likely value and its unit), so entering a value
        // never resizes the chip or shifts the row.
        style={{ width: `calc(${chipDigits(field)}ch + ${field.short.length * 0.62}em + 22px)` }}
        className="press inline-flex items-baseline justify-center gap-[3px] h-9 px-2.5 rounded-full bg-surface-2 tabular hover:bg-[color-mix(in_srgb,var(--surface-2)_85%,var(--ink)_6%)] whitespace-nowrap"
      >
        <span className={cn("font-ui text-[14.5px] font-semibold tabular leading-9", value ? "text-ink" : "text-ink-soft/60")}>{value || "–"}</span>
        {!!value && <span className="font-ui text-[12px] font-medium text-ink-soft leading-9">{field.short}</span>}
      </button>
      <NumberSheet open={open} onClose={() => setOpen(false)} field={field} value={value} practiceName={practiceName} onSave={onChange} />
    </>
  );
}

/** How many digits a value of this field is likely to need (minutes up to 3, counts up to 4). */
function chipDigits(field: FieldSpec) {
  if (field.kind === "MINUTES") return 3;
  if (field.max) return String(field.max).length;
  return 4;
}

function quickPicks(field: FieldSpec) {
  if (field.kind === "MINUTES") return [5, 10, 15, 20, 30, 45, 60];
  if (field.max) return Array.from({ length: field.max }, (_, i) => i + 1);
  return [];
}

export function NumberSheet({ open, onClose, field, value, practiceName, onSave }: { open: boolean; onClose: () => void; field: FieldSpec; value: number; practiceName: string; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState("");
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setDraft(value ? String(value) : field.fill ? String(field.fill) : "");
  }
  const max = field.max ?? 9999;
  const num = Math.min(max, Math.max(0, parseInt(draft) || 0));
  const step = (d: number) => setDraft(String(Math.min(max, Math.max(0, num + d))));
  const base = quickPicks(field);
  const picks = base.length ? [...new Set([...(field.fill ? [field.fill] : []), ...base])].sort((a, b) => a - b).slice(0, 7) : [];
  const save = () => { onSave(num); onClose(); };

  return (
    <PickerPanel
      open={open}
      onClose={onClose}
      title={practiceName}
      footer={
        <>
          <button type="button" onClick={() => { onSave(0); onClose(); }} className="press h-11 px-4 rounded-[14px] bg-surface-2 text-ink-soft font-ui text-[14px] font-semibold">Clear</button>
          <button type="button" onClick={save} className="press flex-1 h-11 rounded-[14px] bg-accent text-bg font-ui text-[14px] font-semibold">Save</button>
        </>
      }
    >
      <p className="font-ui text-[14px] font-semibold text-ink">{field.title}</p>
      {field.hint && <p className="font-ui text-[12.5px] text-ink-soft mt-0.5">{field.hint}</p>}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" aria-label="Less" onClick={() => step(-1)} className="press grid place-items-center w-11 h-11 rounded-full bg-surface text-ink"><MinusMark size={20} /></button>
        <label className="flex flex-col items-center">
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="0"
            aria-label={`${field.title} for ${practiceName}`}
            className="w-[120px] text-center bg-transparent outline-none focus-visible:outline-none font-display text-[44px] font-semibold text-ink tabular leading-none placeholder:text-ink-soft/40"
          />
          <span className="font-ui text-[13px] text-ink-soft mt-1">{field.unit}</span>
        </label>
        <button type="button" aria-label="More" onClick={() => step(1)} className="press grid place-items-center w-11 h-11 rounded-full bg-surface text-ink"><PlusMark size={20} /></button>
      </div>
      {picks.length > 0 && <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {picks.map((n) => (
          <button key={n} type="button" aria-pressed={num === n} onClick={() => setDraft(String(n))} className={cn("press h-9 min-w-[48px] px-3 rounded-full font-ui text-[13px] font-semibold tabular", num === n ? "bg-accent text-bg" : "bg-surface text-ink hover:bg-surface-2")}>
            {n}
            {field.kind === "MINUTES" ? "m" : ""}
          </button>
        ))}
      </div>}
    </PickerPanel>
  );
}

/** Three named levels (Low / Medium / High, or the practice's own words). */
export function ScalePicker({ field, value, onChange, practiceName }: { field: FieldSpec; value: unknown; onChange: (v: string) => void; practiceName: string }) {
  const labels = field.labels ?? DEFAULT_SCALE;
  return (
    <div role="radiogroup" aria-label={`${practiceName}: ${field.title}`} className="flex p-1 rounded-full bg-surface-2">
      {SCALE_KEYS.map((k, i) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(k)}
            className={cn("press h-8 px-3 rounded-full font-ui text-[12.5px] font-semibold transition-colors", on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {labels[i]}
          </button>
        );
      })}
    </div>
  );
}

/** The right control for one field. */
export function FieldControl({ field, value, onChange, practiceName }: { field: FieldSpec; value: string | number | undefined; onChange: (key: string, v: string | number) => void; practiceName: string }) {
  const num = typeof value === "number" ? value : parseInt(String(value ?? "")) || 0;
  switch (field.kind) {
    case "TIME":
      return <TimeField compact value={typeof value === "string" ? value : ""} onChange={(t) => onChange(field.key, t)} label={practiceName} />;
    case "ICONSCALE":
      return <ScalePicker field={field} value={value} onChange={(v) => onChange(field.key, v)} practiceName={practiceName} />;
    case "COUNT":
    case "MINUTES":
    case "NUMBER":
      return field.taps ? (
        <TapCount field={field} value={num} onChange={(v) => onChange(field.key, v)} practiceName={practiceName} />
      ) : (
        <NumberChip field={field} value={num} onChange={(v) => onChange(field.key, v)} practiceName={practiceName} />
      );
    default:
      return null;
  }
}
