/*
 * The questions of the Daily and Weekly reflections. The built-in ones live here; each person
 * can reword, hide, reorder and add to them in Settings, and that list is kept sealed on their
 * account (only their devices can read it). Answers are stored by question key, so keys never
 * change: built-ins keep "1", "2"…, questions someone adds get "c_…". A question they remove
 * stays in the list, marked removed, so past answers can still show it. Each question can carry
 * a description (a line to help answer it); a built-in's own is used until it's changed.
 */

export type ReflectionKind = "daily" | "weekly";

export interface Question {
  key: string;
  q: string;
  /** The description shown under the question. Stored only when it differs from the built-in's
      ("" when someone cleared it). */
  hint?: string;
  /** A built-in question switched off (it can be switched back on). */
  hidden?: boolean;
  /** A question someone added and then removed: kept only to show past answers. */
  removed?: boolean;
}

export type QuestionSets = Partial<Record<ReflectionKind, Question[]>>;

export const BUILT_IN: Record<ReflectionKind, Question[]> = {
  daily: [
    { key: "1", q: "How many times a day am I doing the Inner Engineering Crash Course?" },
    { key: "2", q: "Am I eating more consciously?", hint: "Aware of chewing count, texture, quantity; eating with gratitude, setting aside likes/dislikes." },
    { key: "3", q: "Am I reacting or responding to people around me?", hint: "How often angry/impatient/irritated; do I see all I experience is my making?" },
    { key: "4", q: "Am I becoming more willing?", hint: "(a) First feeling/thought on receiving instructions; (b) can I set myself aside and act with a sense of offering; (c) would I act the same if someone were watching?" },
    { key: "5", q: "Is my system more vibrant or dull?", hint: "Energetic all day? Ease of waking?" },
    { key: "6", q: "How well am I maintaining Vak Shuddhi?", hint: "Fewer words; conscious word choice and intention; silence after 9:30pm?" },
    { key: "7", q: "Am I staying more focused throughout the day?", hint: "Is focus becoming effortless, or must I remind myself?" },
  ],
  weekly: [
    { key: "1", q: "How is my experience of Sadhana?", hint: "Sitting still with more ease, for longer? Stronger? During or after Pradakshina?" },
    { key: "2", q: "Am I making Bhakti Sadhana part of my life?", hint: "Seeing something higher than myself? Seeing the best in people?" },
    { key: "3", q: "Is my commitment toward my growth unwavering?", hint: "Even when unwell, can I use the situation for growth?" },
    { key: "4", q: "Am I experiencing an effortless sense of joy and love?", hint: "Irrespective of the situation — am I smiling naturally?" },
    { key: "5", q: "How often am I part of the problem, and how often part of the solution?" },
    { key: "6", q: "Am I feeling more balanced and still within?", hint: "Regardless of body, mind, or surroundings?" },
    { key: "7", q: "What is my current level of intensity in seva?", hint: "Am I giving myself fully to what needs to happen?" },
    { key: "8", q: "What is holding me back from being more intense in seva?", hint: "Body, mind, emotion, or situation?" },
    { key: "9", q: "What can I do to enhance my intensity?", hint: "One concrete step for the coming week." },
  ],
};

/** The longest question and description someone can write. */
export const QUESTION_MAX = 300;
export const HINT_MAX = 400;

/** A built-in question's own description, if it has one. */
export function builtInHint(kind: ReflectionKind, key: string) {
  return BUILT_IN[kind].find((b) => b.key === key)?.hint;
}

/**
 * Every question of a reflection in order, hidden and removed ones too, each with the
 * description to show (its own, or the built-in's). Built-ins someone's list doesn't have yet
 * go last.
 */
export function allQuestions(kind: ReflectionKind, sets: QuestionSets | null | undefined): Question[] {
  const saved = sets?.[kind];
  if (!Array.isArray(saved) || saved.length === 0) return BUILT_IN[kind];
  const list = saved.map((s) => {
    // "" (cleared) is kept as "", so saving the list again doesn't bring the built-in's back.
    return { ...s, hint: s.hint !== undefined ? s.hint : builtInHint(kind, s.key) };
  });
  return [...list, ...BUILT_IN[kind].filter((b) => !saved.some((s) => s.key === b.key))];
}

/** The questions a reflection asks now. */
export function shownQuestions(kind: ReflectionKind, sets: QuestionSets | null | undefined) {
  const shown = allQuestions(kind, sets).filter((x) => !x.hidden && !x.removed);
  return shown.length ? shown : BUILT_IN[kind];
}

/**
 * The questions to read a saved reflection by: those asked now (numbered), then any others it
 * has answers for (hidden or removed since, or unknown on this device), so no answer goes missing.
 */
export function readingQuestions(kind: ReflectionKind, sets: QuestionSets | null | undefined, answered: string[]) {
  const shown = shownQuestions(kind, sets);
  const all = allQuestions(kind, sets);
  const others: Question[] = [
    ...all.filter((x) => answered.includes(x.key) && !shown.some((s) => s.key === x.key)),
    ...[...new Set(answered)].filter((k) => !all.some((x) => x.key === k)).map((k) => ({ key: k, q: "" })),
  ];
  return [...shown.map((x, i) => ({ ...x, number: String(i + 1) })), ...others.map((x) => ({ ...x, hint: undefined, number: "" }))];
}

/** A key for a question someone adds. */
export function newQuestionKey() {
  return `c_${crypto.randomUUID().slice(0, 8)}`;
}

/** What's kept: a description only when it isn't the built-in's own, and no empty flags. */
export function toStored(kind: ReflectionKind, list: Question[]): Question[] {
  return list.map(({ key, q, hint, hidden, removed }) => {
    // No description stored means the built-in's own (or none); "" means cleared.
    const own = hint !== undefined && hint.trim() !== (builtInHint(kind, key) ?? "");
    return { key, q, ...(own ? { hint: hint.trim() } : {}), ...(hidden ? { hidden } : {}), ...(removed ? { removed } : {}) };
  });
}
