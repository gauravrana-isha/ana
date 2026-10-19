/*
 * Presence: everyone and everything met with attention. A person is one kind among others
 * (food, water, the earth, a thing, an act…). The kind is sealed like the rest; none means a
 * person (everyone from before Presence).
 */

export const PRESENCE_KINDS = [
  { key: "person", label: "A person", plural: "People", hint: "Someone in your life", example: "Their name" },
  { key: "food", label: "Food", plural: "Food", hint: "A meal, a fruit, the rice", example: "e.g. Amma's rasam" },
  { key: "water", label: "Water", plural: "Water", hint: "A river, the rain, a glass of water", example: "e.g. The Kaveri" },
  { key: "earth", label: "Earth & places", plural: "Earth & places", hint: "Mountains, the road, a place", example: "e.g. Velliangiri" },
  { key: "thing", label: "A thing", plural: "Things", hint: "Your phone, your bed", example: "e.g. My bed" },
  { key: "act", label: "An act", plural: "Acts", hint: "Walking, cooking, sweeping", example: "e.g. Walking barefoot" },
  { key: "other", label: "Something else", plural: "Something else", hint: "Anything at all", example: "What you call it" },
] as const;

export type PresenceKind = (typeof PRESENCE_KINDS)[number]["key"];

export function presenceKind(v: string | null | undefined): PresenceKind {
  return PRESENCE_KINDS.some((k) => k.key === v) ? (v as PresenceKind) : "person";
}

export function kindDef(k: PresenceKind) {
  return PRESENCE_KINDS.find((x) => x.key === k)!;
}
