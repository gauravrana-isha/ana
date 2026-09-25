import type { PracticeField } from "./types";

/**
 * The Isha practice library. Illustrations live in /public/images/practices/<id>.webp.
 * kind: guided (with a recording) | timed (an open-ended sit) | self (done on your own) | rhythm (daily rhythm).
 */
export type PracticeKind = "guided" | "timed" | "self" | "rhythm";

export interface CatalogPractice {
  id: string;
  name: string;
  minutes?: number;
  kind: PracticeKind;
  /** Illustration file name, when there is one. */
  image?: string;
  /** Phosphor icon for entries without an illustration. */
  icon: string;
  hasDoneToggle: boolean;
  fields: PracticeField[];
  /** Older names people may have used, so existing practices find their illustration. */
  aliases?: string[];
}

const minutes: PracticeField[] = [{ key: "min", kind: "MINUTES" }];

function p(
  id: string,
  name: string,
  mins: number | undefined,
  kind: PracticeKind,
  extra: Partial<CatalogPractice> = {}
): CatalogPractice {
  return {
    id,
    name,
    minutes: mins,
    kind,
    image: id,
    icon: "Leaf",
    hasDoneToggle: true,
    // Guided practices follow a recording of fixed length: a tick is enough.
    fields: kind === "guided" ? [] : minutes,
    ...extra,
  };
}

export const CATALOG: CatalogPractice[] = [
  p("achala-arpanam", "Achala Arpanam", 12, "guided"),
  p("angamardana", "Angamardana", 40, "self", { fields: [{ key: "rounds", kind: "COUNT", max: 2, label: "rounds", fill: 1 }] }),
  p("ardhasiddhasana", "Ardhasiddhasana", 20, "timed"),
  p("aum-chanting", "AUM Chanting", 20, "timed"),
  p("bhakti-sadhana", "Bhakti Sadhana", 13, "self"),
  p("bhastrika-kriya", "Bhastrika Kriya", 12, "self"),
  p("bhuta-shuddhi", "Bhuta Shuddhi", 10, "self"),
  p("breath-watching", "Breath Watching", 40, "timed"),
  p("chit-shakti-health", "Chit Shakti for Health", 19, "guided", { image: "chit-shakti-health.svg", icon: "Heartbeat" }),
  p("chit-shakti-love", "Chit Shakti for Love", 17, "guided"),
  p("chit-shakti-peace", "Chit Shakti for Peace", 19, "guided"),
  p("chit-shakti-success", "Chit Shakti for Success", 19, "guided"),
  p("devi-sadhana", "Devi Sadhana", 8, "guided"),
  p("directional-movements", "Directional Movements of the Arms", 6, "guided"),
  p("eye-care", "Eye Care Practices", 10, "self"),
  p("guru-mahima", "Guru Mahima", 6, "self"),
  p("guru-pooja", "Guru Pooja", 6, "guided"),
  p("infinity-meditation", "Infinity Meditation", 15, "guided"),
  p("ie-crash-course", "Inner Engineering Crash Course", 2, "guided", {
    fields: [{ key: "count", kind: "COUNT", label: "times", fill: 1 }],
    aliases: ["IE Crash Course"],
  }),
  p("isha-kriya", "Isha Kriya", 14, "guided"),
  p("jala-neti", "Jala Neti", 10, "self"),
  p("knee-rotations", "Knee Rotations", 2, "self"),
  p("linga-bhairavi-arati", "Linga Bhairavi Arati", 2, "guided"),
  p("living-soil", "Living Soil Meditation", 12, "guided"),
  p("mahamantra", "Mahamantra", 21, "guided"),
  p("margazhi-mantra", "Margazhi Mantra", 15, "guided"),
  p("nada-yoga", "Nada Yoga", 6, "guided"),
  p("nadi-shuddhi", "Nadi Shuddhi", 4, "guided"),
  p("namaskar-process", "Namaskar Process", 4, "guided"),
  p("neck-practices", "Neck Practices", 7, "guided", { aliases: ["Upa Yoga"] }),
  p("rudraksha-diksha", "Rudraksha Diksha", 4, "guided"),
  p("sadhguru-presence", "Sadhguru's Presence", 10, "guided"),
  p("samyama", "Samyama", 30, "timed"),
  p("shakti-chalana", "Shakti Chalana Kriya", 45, "self", {
    fields: [
      { key: "times", kind: "COUNT", max: 2, label: "times", fill: 1 },
      { key: "kapal", kind: "COUNT", label: "kapalbhati", hint: "Kapalbhati breaths in the kriya" },
    ],
    aliases: ["Shakti Chalana"],
  }),
  p("shambhavi", "Shambhavi Mahamudra Kriya", 21, "self", {
    fields: [{ key: "count", kind: "COUNT", max: 2, label: "times", fill: 1 }],
    aliases: ["Shambhavi", "Shambhavi Mahamudra"],
  }),
  p("shambhavi-mudra", "Shambhavi Mudra", 4, "guided"),
  p("shanmuki-mudra", "Shanmuki Mudra", 16, "self"),
  p("shiva-namaskar", "Shiva Namaskar", 10, "self"),
  p("shoonya", "Shoonya", 15, "self", { fields: [{ key: "count", kind: "COUNT", max: 2, label: "times", fill: 1 }] }),
  p("simha-kriya", "Simha Kriya", 3, "self"),
  p("squatting", "Squatting", 1, "self"),
  p("sukha-kriya", "Sukha Kriya", 20, "timed"),
  p("surya-kriya", "Surya Kriya", 15, "self"),
  p("surya-shakti", "Surya Shakti", 12, "self", { fields: [{ key: "cycles", kind: "COUNT", label: "cycles" }] }),
  p("thoppukarnam", "Thoppukarnam", 2, "self", { image: "thoppukarnam.svg", icon: "PersonSimple" }),
  p("yoga-namaskar", "Yoga Namaskar", 4, "guided"),
  p("yogasanas", "Yogasanas", 50, "self"),

  // Daily rhythm: the shape of the day, not practices from a program.
  p("wake-up", "Wake up", undefined, "rhythm", { image: "wake-up.svg", icon: "SunHorizon", hasDoneToggle: false, fields: [{ key: "time", kind: "TIME", default: "04:30" }] }),
  p("bedtime", "Bedtime", undefined, "rhythm", { image: "bedtime.svg", icon: "Moon", hasDoneToggle: false, fields: [{ key: "time", kind: "TIME", default: "21:30" }] }),
  p("dhyanalinga", "Dhyanalinga", undefined, "self", { image: "dhyanalinga.svg", icon: "Triangle" }),
  p("linga-bhairavi", "Linga Bhairavi", undefined, "self", { image: "linga-bhairavi.svg", icon: "Star", aliases: ["Lingabhairavi"] }),
  p("eating-consciously", "Eating consciously", undefined, "rhythm", {
    image: "eating-consciously.svg",
    icon: "BowlFood",
    hasDoneToggle: false,
    fields: [{ key: "level", kind: "ICONSCALE", default: "steady", labels: ["Under", "Balanced", "Over"] }],
  }),
];

/** Shown first in the library, in this order. */
export const COMMON_IDS = [
  "shambhavi", "isha-kriya", "surya-kriya", "angamardana", "yogasanas", "shakti-chalana",
  "shoonya", "samyama", "bhuta-shuddhi", "breath-watching", "guru-pooja", "mahamantra",
  "ie-crash-course", "yoga-namaskar", "devi-sadhana", "sadhguru-presence",
];

/** Pre-selected when someone first sets up their tracker. */
export const STARTER_IDS = ["wake-up", "shambhavi", "isha-kriya", "surya-kriya", "yogasanas", "breath-watching", "bedtime"];

export const KIND_LABEL: Record<PracticeKind, string> = {
  guided: "guided",
  timed: "a sit",
  self: "on your own",
  rhythm: "daily rhythm",
};

const byId = new Map(CATALOG.map((c) => [c.id, c]));

function normalise(name: string) {
  return name.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}
const byName = new Map<string, CatalogPractice>();
for (const c of CATALOG) {
  byName.set(normalise(c.name), c);
  c.aliases?.forEach((a) => byName.set(normalise(a), c));
}

export function catalogById(id: string | null | undefined) {
  return id ? byId.get(id) : undefined;
}

/** Find the catalog entry for a saved practice, by its catalog id or, for older practices, by name. */
export function catalogFor(practice: { catalogId?: string | null; name: string }) {
  return catalogById(practice.catalogId) ?? byName.get(normalise(practice.name));
}

export function catalogImage(entry: CatalogPractice | undefined) {
  if (!entry?.image) return null;
  return `/images/practices/${entry.image.includes(".") ? entry.image : entry.image + ".webp"}`;
}

export function describeTracking(fields: PracticeField[], hasDoneToggle: boolean) {
  const parts: string[] = [];
  if (hasDoneToggle && fields.length === 0) parts.push("done");
  for (const f of fields) {
    if (f.kind === "TIME") parts.push("time of day");
    else if (f.kind === "MINUTES") parts.push("minutes");
    else if (f.kind === "COUNT") parts.push(f.max ? `up to ${f.max}${f.label ? ` ${f.label}` : ""}` : (f.label ?? "count"));
    else if (f.kind === "ICONSCALE") parts.push("3-level scale");
    else parts.push(f.kind.toLowerCase());
  }
  return parts.join(" + ");
}
