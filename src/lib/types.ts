export type FieldKind = "TIME" | "COUNT" | "MINUTES" | "NUMBER" | "ICONSCALE" | "MOOD";

export interface PracticeField {
  key: string;
  kind: FieldKind;
  label?: string;
  min?: number;
  max?: number;
  /** Value used when nothing is logged for the day (rhythm practices). */
  default?: string | number;
  /** Value filled in when the practice is ticked and this field is empty. */
  fill?: number;
  /** One-line explanation shown in the editor. */
  hint?: string;
  /** Names for the three levels of a 3-level scale. */
  labels?: [string, string, string];
}

export interface DayLogEntry {
  done?: boolean;
  values: Record<string, string | number>;
}

export type DayLogEntries = Record<string, DayLogEntry>;

export interface DailyAnswers {
  [promptKey: string]: string;
}

export interface DailyStamps {
  [promptKey: string]: string[];
}

export interface Practice {
  id: string;
  userId: string;
  name: string;
  iconName: string;
  catalogId?: string | null;
  tier: "FIXED" | "CUSTOM";
  hasDoneToggle: boolean;
  order: number;
  fields: PracticeField[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteResponse {
  quote: string;
  source: "api" | "fallback";
}
