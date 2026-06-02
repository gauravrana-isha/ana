/**
 * Digest template engine — pure deterministic templates, NO AI.
 */

export interface DigestData {
  weekStart: string;
  weekEnd: string;
  tended: Array<{ name: string; daysCompleted: number }>;
  trends: Array<{ name: string; values: number[]; unit: string }>;
}

/**
 * Build the "noticing" paragraph from practice data.
 * Returns HTML string with <b> tags or null if insufficient data.
 */
export function buildNoticing(data: DigestData): string | null {
  if (data.tended.length === 0) return null;

  const sorted = [...data.tended].sort((a, b) => b.daysCompleted - a.daysCompleted);
  const top = sorted[0];
  const least = sorted[sorted.length - 1];

  const parts: string[] = [];

  if (top.daysCompleted === 7) {
    parts.push(`You tended to <b>${top.name} every day</b> this week.`);
  } else if (top.daysCompleted >= 5) {
    parts.push(`You tended to <b>${top.name}</b> on ${top.daysCompleted} days this week.`);
  }

  if (least.daysCompleted < top.daysCompleted && least.daysCompleted > 0) {
    parts.push(
      `<b>${least.name}</b> asked for more of your attention — it was present on ${least.daysCompleted} days.`
    );
  }

  if (parts.length > 0) {
    parts.push(
      "Your own words above sit alongside this, whenever you return to read them."
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Build a trend caption from a values array.
 */
export function buildTrendCaption(values: number[], unit: string): string {
  if (values.length < 2) return "";
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const trend = values[values.length - 1] - values[0];

  if (Math.abs(trend) <= 1) return `Settling around ${avg} ${unit}.`;
  if (trend < 0) return `It tended to come a little easier as the week went on.`;
  return `Gradually building — around ${avg} ${unit} by week's end.`;
}
