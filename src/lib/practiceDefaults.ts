import type { DayLogEntry, PracticeField } from "./types";
import { isKept as keptBySpec, specFor, valuesWithDefaults } from "./practiceSpec";

/** Thin helpers kept for existing callers; the rules live in practiceSpec. */
type PracticeLike = { name: string; catalogId?: string | null; hasDoneToggle: boolean; fields: PracticeField[] | unknown };

export function fieldDefault(p: PracticeLike, field: PracticeField) {
  return specFor(p).fields.find((f) => f.key === field.key)?.default;
}

export function withDefaults(p: PracticeLike, values: Record<string, string | number> = {}) {
  return valuesWithDefaults(specFor(p), values);
}

export function isRhythm(p: PracticeLike) {
  return specFor(p).rhythm;
}

export function isKept(p: PracticeLike, entry: Partial<DayLogEntry> | undefined) {
  return keptBySpec(specFor(p), entry);
}
