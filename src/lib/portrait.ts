import type { CSSProperties } from "react";

/*
 * "Who am I?": three rings, from the outside in. The words are suggestions; a few chosen
 * words and an optional line per ring make a portrait. Energy is left out on purpose:
 * when that is alive, this page isn't needed.
 */
export const RINGS = [
  {
    key: "body",
    label: "Body",
    question: "How is this body, these days?",
    words: ["light", "heavy", "rested", "tired", "restless", "strong", "tender", "stiff", "supple", "alive", "aching", "at ease"],
  },
  {
    key: "mind",
    label: "Mind",
    question: "What is the mind doing?",
    words: ["clear", "busy", "scattered", "quiet", "curious", "dwelling", "sharp", "dull", "open", "anxious", "steady", "wandering"],
  },
  {
    key: "emotion",
    label: "Emotion",
    question: "What is moving in you?",
    words: ["joy", "longing", "calm", "grief", "gratitude", "irritation", "love", "fear", "tenderness", "contentment", "loneliness", "devotion"],
  },
] as const;

/**
 * How a word sits, from -1 (heaviest: strain, contraction) to 1 (lightest: ease, openness).
 * Not good or bad, just the weather at a glance. Every word has its own value, so every
 * word gets its own colour on the scale below.
 */
export const WEIGHT: Record<string, number> = {
  alive: 1, light: 0.9, "at ease": 0.8, rested: 0.7, supple: 0.6, strong: 0.5,
  tender: -0.1, restless: -0.5, stiff: -0.6, tired: -0.7, aching: -0.85, heavy: -1,
  quiet: 1, clear: 0.9, open: 0.8, curious: 0.6, steady: 0.5, sharp: 0.35,
  wandering: -0.35, dull: -0.5, busy: -0.6, dwelling: -0.7, scattered: -0.8, anxious: -1,
  joy: 1, love: 0.95, gratitude: 0.9, calm: 0.85, devotion: 0.8, contentment: 0.7, tenderness: 0.6,
  longing: -0.1, irritation: -0.7, loneliness: -0.8, fear: -0.9, grief: -1,
};

/**
 * Ten colours from heaviest to lightest: ash grey through olive and sage to deep forest
 * green. Grey reads as heavy and dull; green as alive.
 */
export const WEIGHT_SCALE = ["#8c8680", "#857f76", "#7d7a68", "#747a5c", "#6a7a52", "#5c7a4a", "#4b7543", "#3d6e3d", "#2f6336", "#23572f"];

/** Custom words carry their own weight (chosen as a colour when they were added). */
export type Weights = Record<string, number>;

export function weightOf(word: string, custom?: Weights | null) {
  return custom?.[word] ?? WEIGHT[word] ?? 0;
}

/** The weight each of the ten colours stands for, heaviest first. */
export const SCALE_WEIGHTS = WEIGHT_SCALE.map((_, i) => -1 + (i * 2) / (WEIGHT_SCALE.length - 1));

const rgb = (hex: string) => hex.match(/\w\w/g)!.map((h) => parseInt(h, 16));
const hexOf = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, f: number) => hexOf(rgb(a).map((v, k) => v + (rgb(b)[k] - v) * f));

/** A word's own colour: its weight, read off the scale (blended between neighbours). */
export function weightHex(word: string, custom?: Weights | null) {
  const t = ((weightOf(word, custom) + 1) / 2) * (WEIGHT_SCALE.length - 1);
  const i = Math.min(WEIGHT_SCALE.length - 2, Math.floor(t));
  return mix(WEIGHT_SCALE[i], WEIGHT_SCALE[i + 1], t - i);
}

/**
 * CSS variables for a word, for light and dark themes: --c/--t in light, --cd/--td in dark
 * (lifted toward white so they stay readable). Use with the .tone-* classes.
 */
export function toneStyle(word: string, custom?: Weights | null): CSSProperties {
  const hex = weightHex(word, custom);
  const w = weightOf(word, custom);
  return {
    ["--c" as string]: hex,
    ["--t" as string]: hex,
    ["--cd" as string]: mix(hex, "#ffffff", 0.35),
    ["--td" as string]: mix(hex, "#ffffff", w > 0.3 ? 0.42 : 0.3),
  };
}

/** Plain colour for places that can't use the variables (legacy callers). */
export function weightColor(word: string, custom?: Weights | null) {
  return weightHex(word, custom);
}

export type RingKey = (typeof RINGS)[number]["key"];
export const MAX_WORDS = 4;
export const CENTRE_LINE = "The one who knows all three is none of them.";

export interface PortraitDTO {
  id: string;
  body: { words: string[]; note: string | null };
  mind: { words: string[]; note: string | null };
  emotion: { words: string[]; note: string | null };
  /** Weights for the person's own words. */
  weights: Weights;
  createdAt: string;
}

export const REVISIT_CHOICES = [
  { months: 3, label: "Every 3 months" },
  { months: 6, label: "Every 6 months" },
  { months: 12, label: "Every year" },
  { months: 0, label: "Don't ask" },
] as const;
