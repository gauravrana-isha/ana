import type { PracticeField } from "./types";

export interface DefaultPractice {
  name: string;
  iconName: string;
  tier: "FIXED" | "CUSTOM";
  hasDoneToggle: boolean;
  order: number;
  fields: PracticeField[];
}

export const DEFAULT_PRACTICES: DefaultPractice[] = [
  { name: "Wake up", iconName: "Sun", tier: "FIXED", hasDoneToggle: false, order: 0, fields: [{ key: "time", kind: "TIME" }] },
  { name: "Shambhavi", iconName: "EyeClosed", tier: "FIXED", hasDoneToggle: true, order: 1, fields: [{ key: "count", kind: "COUNT", max: 2 }] },
  { name: "Shakti Chalana", iconName: "Wind", tier: "FIXED", hasDoneToggle: true, order: 2, fields: [{ key: "kapal", kind: "COUNT" }, { key: "times", kind: "COUNT" }] },
  { name: "Surya Kriya", iconName: "SunDim", tier: "FIXED", hasDoneToggle: true, order: 3, fields: [{ key: "cycles", kind: "COUNT" }] },
  { name: "Yogasanas", iconName: "PersonSimpleTaiChi", tier: "FIXED", hasDoneToggle: true, order: 4, fields: [{ key: "min", kind: "MINUTES" }] },
  { name: "Breath Watching", iconName: "Waveform", tier: "FIXED", hasDoneToggle: true, order: 5, fields: [{ key: "min", kind: "MINUTES" }] },
  { name: "Samyama", iconName: "Circle", tier: "FIXED", hasDoneToggle: true, order: 6, fields: [{ key: "min", kind: "MINUTES" }] },
  { name: "Shoonya", iconName: "CircleNotch", tier: "FIXED", hasDoneToggle: false, order: 7, fields: [{ key: "count", kind: "COUNT" }] },
  { name: "Dhyanalinga", iconName: "Pyramid", tier: "FIXED", hasDoneToggle: true, order: 8, fields: [{ key: "min", kind: "MINUTES" }] },
  { name: "Lingabhairavi", iconName: "Star", tier: "FIXED", hasDoneToggle: true, order: 9, fields: [{ key: "min", kind: "MINUTES" }] },
  { name: "Bedtime", iconName: "Moon", tier: "FIXED", hasDoneToggle: false, order: 10, fields: [{ key: "time", kind: "TIME" }] },
  { name: "Eating consciously", iconName: "Bowl", tier: "FIXED", hasDoneToggle: false, order: 11, fields: [{ key: "level", kind: "ICONSCALE" }] },
];
