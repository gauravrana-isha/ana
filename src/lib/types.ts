export type FieldKind = "TIME" | "COUNT" | "MINUTES" | "NUMBER" | "ICONSCALE" | "MOOD";

export interface PracticeField {
  key: string;
  kind: FieldKind;
  label?: string;
  min?: number;
  max?: number;
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
