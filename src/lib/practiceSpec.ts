import type { DayLogEntry, PracticeField } from "./types";
import { catalogFor } from "./practiceCatalog";

/*
 * One description of how a practice is tracked, used by the tracker row, the number editor,
 * the weekly table and insights. Library practices follow the library (so improvements reach
 * existing practices); custom ones follow what was saved. A saved `default` always wins, so
 * people keep their own usual wake-up time and so on.
 */

export interface FieldSpec extends PracticeField {
  /** Short word shown under the value: "min", "times", "kapalbhati". */
  unit: string;
  /** Title for the editor: "Minutes", "Kapalbhati". */
  title: string;
  /** Shown as a pair/trio of taps rather than a number (1×, 2×). */
  taps: boolean;
}

export interface PracticeSpec {
  hasDoneToggle: boolean;
  fields: FieldSpec[];
  /** Always has a value (defaults fill any gap); never "missed". */
  rhythm: boolean;
  /** Typical length, for filling minutes on a tick. */
  minutes?: number;
}

type PracticeLike = {
  name: string;
  catalogId?: string | null;
  hasDoneToggle: boolean;
  fields: PracticeField[] | unknown;
};

export const DEFAULT_SCALE: [string, string, string] = ["Low", "Medium", "High"];
export const SCALE_KEYS = ["low", "steady", "high"] as const;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function specFor(p: PracticeLike): PracticeSpec {
  const saved = (Array.isArray(p.fields) ? p.fields : []) as PracticeField[];
  const entry = catalogFor(p);
  const base = entry ? entry.fields : saved;
  const hasDoneToggle = entry ? entry.hasDoneToggle : p.hasDoneToggle;

  const fields: FieldSpec[] = base.map((f) => {
    const own = saved.find((s) => s.key === f.key);
    // Your own settings win over the library's: usual values, defaults, level names.
    const merged: PracticeField = {
      ...f,
      ...(own?.default !== undefined ? { default: own.default } : {}),
      ...(own?.fill !== undefined ? { fill: own.fill } : {}),
      ...(own?.labels ? { labels: own.labels } : {}),
    };
    const unit =
      merged.kind === "MINUTES" ? "min" : merged.kind === "COUNT" ? merged.label ?? "times" : merged.kind === "NUMBER" ? merged.label ?? "" : "";
    const title = merged.kind === "MINUTES" ? "Minutes" : merged.kind === "TIME" ? "Time" : cap(merged.label ?? (merged.kind === "COUNT" ? "Count" : "Value"));
    return {
      ...merged,
      fill: merged.fill ?? (merged.kind === "MINUTES" ? entry?.minutes : undefined),
      unit,
      title,
      taps: merged.kind === "COUNT" && !!merged.max && merged.max <= 3,
    };
  });

  const rhythm = !hasDoneToggle && fields.length > 0 && fields.every((f) => f.default !== undefined && f.default !== "");
  return { hasDoneToggle, fields, rhythm, minutes: entry?.minutes };
}

function filled(v: unknown) {
  return v !== undefined && v !== null && v !== "" && v !== 0;
}

/** Values with rhythm defaults standing in for anything not logged. */
export function valuesWithDefaults(spec: PracticeSpec, values: Record<string, string | number> = {}) {
  const out = { ...values };
  for (const f of spec.fields) if (!filled(out[f.key]) && f.default !== undefined) out[f.key] = f.default;
  return out;
}

/** What a tick means: fill each empty field with its usual value. Unticking clears the day. */
export function toggleDone(spec: PracticeSpec, entry: Partial<DayLogEntry> | undefined): DayLogEntry {
  const done = !entry?.done;
  if (!done) return { done: false, values: {} };
  const values = { ...(entry?.values ?? {}) };
  for (const f of spec.fields) if (!filled(values[f.key]) && f.fill !== undefined) values[f.key] = f.fill;
  return { done: true, values };
}

/** A value changed: entering something ticks the practice; clearing everything unticks it. */
export function setValue(spec: PracticeSpec, entry: Partial<DayLogEntry> | undefined, key: string, value: string | number): DayLogEntry {
  const values = { ...(entry?.values ?? {}), [key]: value };
  const any = spec.fields.some((f) => filled(values[f.key]));
  const done = spec.hasDoneToggle ? any : !!entry?.done;
  // Becoming done by entering a value fills the other empty fields, just like a tick.
  if (done && !entry?.done && filled(value)) {
    for (const f of spec.fields) if (f.key !== key && !filled(values[f.key]) && f.fill !== undefined) values[f.key] = f.fill;
  }
  return { done, values };
}

export function isKept(spec: PracticeSpec, entry: Partial<DayLogEntry> | undefined) {
  if (spec.rhythm) return true;
  return !!entry && (!!entry.done || spec.fields.some((f) => filled(entry.values?.[f.key])));
}

export function scaleLabel(f: PracticeField, key: unknown) {
  const i = SCALE_KEYS.indexOf(key as (typeof SCALE_KEYS)[number]);
  return i < 0 ? "" : (f.labels ?? DEFAULT_SCALE)[i];
}

export function time12(hhmm: unknown, short = false) {
  if (typeof hhmm !== "string" || !hhmm.includes(":")) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? (short ? "p" : " pm") : short ? "a" : " am";
  return `${hh}:${String(m).padStart(2, "0")}${suffix}`;
}

/** A compact summary for a table cell: "2×", "12m", "1× · 108", "4:30a", "Balanced", "✓". */
export function cellSummary(spec: PracticeSpec, entry: Partial<DayLogEntry> | undefined): { text: string; muted: boolean } | null {
  const logged = entry?.values ?? {};
  const values = spec.rhythm ? valuesWithDefaults(spec, logged) : logged;
  const parts: string[] = [];
  let usedDefault = false;
  for (const f of spec.fields) {
    const v = values[f.key];
    if (!filled(v)) continue;
    if (spec.rhythm && !filled(logged[f.key])) usedDefault = true;
    if (f.kind === "TIME") parts.push(time12(v, true));
    else if (f.kind === "ICONSCALE") parts.push(scaleLabel(f, v));
    else if (f.kind === "MINUTES") parts.push(`${v}m`);
    else if (f.taps) parts.push(`${v}×`);
    else parts.push(String(v));
  }
  if (parts.length) return { text: parts.join(" · "), muted: usedDefault };
  if (entry?.done) return { text: "✓", muted: false };
  return null;
}
