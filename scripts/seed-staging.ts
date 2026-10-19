/*
 * Fills a staging journal with realistic data, sealed with that person's own journal key, so
 * staging looks and behaves like a well-used journal: practices and ~11 weeks of logs, daily
 * and weekly reflections, two sankalpa letters, Presence (people and things) and moments
 * (some coming back today, some from this day in earlier years). Also adds a few other members
 * (waiting, active, paused) for the Access page.
 *
 *   SEED_DATABASE_URL=<staging database> npx tsx scripts/seed-staging.ts --email you@example.com
 *
 * Sign in to staging once and set up the journal key first; the script asks for the recovery
 * words (to unlock the key, on this machine only). It refuses the production database, and
 * refuses a journal that already has moments (unless --force).
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { PrismaClient, Prisma } from "@prisma/client";
import { mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import * as crypto from "../src/lib/vault/crypto";
import { STARTER_IDS, catalogById } from "../src/lib/practiceCatalog";
import { shownQuestions } from "../src/lib/questions";

const args = process.argv.slice(2);
const email = args[args.indexOf("--email") + 1];
const force = args.includes("--force");
const url = process.env.SEED_DATABASE_URL;
if (!email || args.indexOf("--email") < 0) throw new Error("Pass --email <the staging account's email>.");
if (!url) throw new Error("Set SEED_DATABASE_URL to the staging database.");

// Never production: the production database is the one in .env.
const prodUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)/m)?.[1];
const host = (u: string) => new URL(u).hostname.replace("-pooler", "");
if (prodUrl && host(prodUrl) === host(url)) throw new Error("That's the production database. Refusing.");

// A steady pseudo-random sequence, so a run is reproducible.
let s = 20261019;
const rand = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const some = <T,>(xs: readonly T[], n: number) => [...xs].sort(() => rand() - 0.5).slice(0, n);
const chance = (p: number) => rand() < p;

const DAY = 864e5;
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
const daysAgo = (n: number) => new Date(today.getTime() - n * DAY);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const weekStart = (d: Date) => new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
const newId = () => "c" + Array.from(crypto.randomBytes(15), (b) => (b % 36).toString(36)).join("") + Date.now().toString(36).slice(-4);

const STAMPS = ["growth", "struggle", "insight", "stillness", "devotion"] as const;
const MOODS = ["low", "agitated", "neutral", "content", "content", "blissful", "content", "neutral"] as const;

const DAILY_LINES: Record<string, string[]> = {
  "1": ["Twice today, once before breakfast and once in the evening.", "Only once; the evening slipped away with work.", "Three times. The pause before lunch is becoming natural.", "Once, sitting on the terrace after waking."],
  "2": ["Ate slowly at lunch, counted chewing for the first few bites.", "Rushed breakfast. Noticed it halfway and slowed down.", "Offered the food before eating; it changed how I ate.", "Skipped the second helping without struggle."],
  "3": ["Felt irritation in the meeting, but let it pass before speaking.", "Reacted sharply to a call from home. Apologised later.", "Responded rather than reacted most of the day.", "Caught myself blaming the traffic. It was my own impatience."],
  "4": ["Said yes to the seva without the usual inner bargaining.", "First thought was resistance; the doing was lighter than the thought.", "Did the dishes for everyone, quietly.", "Willing, but watched for appreciation. Still there."],
  "5": ["Vibrant all morning; heavy after a late lunch.", "Woke before the alarm, light and clear.", "Dull afternoon. Hatha yoga in the evening lifted it.", "Energetic through the day."],
  "6": ["Fewer words in the office; it felt spacious.", "Spoke too much at dinner. Silence after 9:30 held.", "Chose words with care when it mattered.", "Kept quiet through the commute."],
  "7": ["Focus came easily in the morning hours.", "Scattered; kept reaching for the phone.", "Remembered to come back to the breath, again and again.", "Steady attention while cooking, of all things."],
};
const WEEKLY_LINES: Record<string, string[]> = {
  "1": ["Sitting still comes easier; Shambhavi feels deeper this week.", "Restless during practice early in the week, settled by Friday.", "Longer sittings without discomfort."],
  "2": ["Bowing down to the trees on the morning walk.", "Saw the best in a difficult colleague.", "Offering each meal; small, but daily."],
  "3": ["Unwell on Wednesday and still sat for practice, briefly.", "Steady, even on the busy days.", "Wavered mid-week; came back to it."],
  "4": ["Smiling without reason a few times this week.", "Joy came and went with situations; noticed the dependence.", "A quiet sweetness most evenings."],
  "5": ["Part of the solution at work more often than not.", "Added to the problem at home once; set it right.", "More solutions than problems."],
  "6": ["Balanced despite the travel.", "Disturbed by news, but it didn't stay.", "More still within than last week."],
  "7": ["Gave myself fully to the Sunday seva.", "Seva felt mechanical early on, alive by the end.", "Intense during the event, slack before it."],
  "8": ["Tiredness, mostly; the body asks for rest.", "The mind's preference for comfort.", "Nothing really, only habit."],
  "9": ["Sleep earlier so the morning is mine.", "One extra hour of seva on Saturday.", "Do the practice before opening the phone."],
};
const MOMENTS = [
  ["Sunrise at the lake", "The water held the whole sky this morning. Sat on the steps for a long time without thinking anything.", "Ukkadam lake"],
  ["Amma's rasam", "She made it the old way, tamarind soaked overnight. The smell filled the house before I was awake.", "Home"],
  ["Volunteering at the kitchen", "Cut vegetables with forty others in silence. The rhythm of the knives was a kind of chant.", "Isha Yoga Center"],
  ["Rain on the tin roof", "Couldn't sleep, so I listened. Every drop distinct, then all of them one sound.", null],
  ["Walking barefoot", "The ground was cool and uneven. Felt every stone. Felt very alive.", "The farm road"],
  ["A call with Ravi", "We hadn't spoken in months. He's going through a hard time and simply listening seemed to help.", null],
  ["Velliangiri in the distance", "Clouds on the seventh hill. Stood and looked until the bus came.", "Poondi"],
  ["Meera's question", "She asked why I keep doing the practice when nothing seems to change. I didn't have an answer, only a smile.", "Satsang hall"],
  ["The Kaveri at dusk", "Children jumping in, women washing clothes, the river carrying it all.", "Srirangapatna"],
  ["First Surya Kriya after a week", "Stiff and slow, but the breath remembered.", null],
  ["Cooking for the neighbours", "Arjun's family was unwell. Took over idlis. The thank-you was in their eyes.", "Next door"],
  ["My bed, after the night shift", "Never felt so grateful for a simple mattress.", "Home"],
  ["The morning bell", "Heard it from across the valley and stopped mid-step.", "Ashram"],
  ["Mahashivratri preparations", "Sweeping the grounds at 3am with strangers who felt like family.", "Isha Yoga Center"],
  ["Silence at dinner", "We ate without talking. Tasted everything.", "Home"],
  ["A sparrow on the window", "It looked at me looking at it. Neither of us moved.", null],
  ["Old photographs", "Found Appa's letters. His handwriting, his care.", "Home"],
  ["The bus ride home", "Packed, noisy, slow. Somehow peaceful inside.", "Coimbatore"],
  ["Guru Pooja in the morning", "The flame steady, the room still.", "Home"],
  ["Harvest at the farm", "Turmeric roots, earth under the nails.", "The farm"],
] as const;
const LETTERS = [
  "I commit to sitting for Shambhavi every morning before anything else, and to watching my reactions with honesty. Not to become someone, but to stop being in my own way.",
  "This year I want my sadhana to be the first thing, not the leftover. I will offer one hour of seva each week, eat consciously, and speak only what is needed. When I fall, I will begin again without drama.",
];

/** The recovery words: typed at the prompt, or piped in (all of stdin). */
async function askWords() {
  if (!process.stdin.isTTY) {
    let all = "";
    for await (const chunk of process.stdin) all += chunk;
    return all;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question("Recovery words (12, kept on this machine only): ");
  } finally {
    rl.close();
  }
}

async function main() {
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const user = await db.user.findUnique({ where: { email }, include: { vaultKeys: true } });
    if (!user) throw new Error(`No account for ${email} on staging. Sign in there once first.`);
    const phraseKey = user.vaultKeys.find((k) => k.kind === "phrase");
    if (!phraseKey?.salt) throw new Error("This account has no recovery words yet. Set up the journal key on staging first.");
    if (!force && (await db.expression.count({ where: { userId: user.id } })) > 0) throw new Error("This journal already has moments. Pass --force to add more anyway.");

    const phrase = (await askWords()).trim().toLowerCase().split(/\s+/).join(" ");
    if (!validateMnemonic(phrase, wordlist)) throw new Error("Those aren't valid recovery words.");
    const wrapping = await crypto.wrappingKeyFromSecret(new Uint8Array(mnemonicToEntropy(phrase, wordlist)), crypto.fromB64(phraseKey.salt), "ana phrase v1");
    const key = await crypto.importAesKey(await crypto.unwrap(wrapping, phraseKey.wrapped));
    // The key opens this account's check value: the words are right.
    if (user.vaultCheck) await crypto.openValue(key, user.vaultCheck);
    const seal = (v: unknown) => crypto.sealValue(key, v);

    // ---- practices
    let practices = await db.practice.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } });
    if (!practices.length) {
      const chosen = STARTER_IDS.map(catalogById).filter((p) => !!p);
      for (const [order, p] of chosen.entries()) {
        await db.practice.create({
          data: { id: newId(), userId: user.id, name: await seal(p.name), iconName: await seal(p.icon), catalogId: await seal(p.id), tier: "FIXED", hasDoneToggle: p.hasDoneToggle, order, fields: (await seal(p.fields)) as Prisma.InputJsonValue },
        });
      }
      practices = await db.practice.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } });
    }
    const catalogOf = async (p: (typeof practices)[number]) => catalogById(await crypto.openValue<string>(key, p.catalogId!));

    // ---- 11 weeks of practice logs (kept on most days, a few quiet stretches)
    for (let n = 1; n <= 77; n++) {
      const date = daysAgo(n);
      const entries: Record<string, string> = {};
      for (const p of practices) {
        const c = p.catalogId ? await catalogOf(p) : undefined;
        if (!c || !chance(n % 23 < 3 ? 0.3 : 0.82)) continue;
        const values: Record<string, string | number> = {};
        for (const f of c.fields) {
          if (f.kind === "TIME") {
            const [h, m] = String(f.default ?? "05:00").split(":").map(Number);
            const t = h * 60 + m + Math.round((rand() - 0.45) * 50);
            values[f.key] = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(((t % 60) + 60) % 60).padStart(2, "0")}`;
          } else if (f.kind === "MINUTES") values[f.key] = Math.max(5, (c.minutes ?? 20) + Math.round((rand() - 0.5) * 10));
          else if (f.kind === "COUNT") values[f.key] = chance(0.25) ? f.max ?? 2 : f.fill ?? 1;
          else if (f.kind === "ICONSCALE") values[f.key] = pick(["low", "steady", "high"]);
          else if (f.fill) values[f.key] = f.fill;
        }
        entries[p.id] = await seal({ done: c.hasDoneToggle ? true : undefined, values });
      }
      if (Object.keys(entries).length) await db.dayLog.upsert({ where: { userId_date: { userId: user.id, date } }, create: { userId: user.id, date, entries }, update: { entries } });
    }

    // ---- daily reflections (most days, not today, so Daily opens as cards)
    const dailyQs = shownQuestions("daily", null);
    for (let n = 1; n <= 60; n++) {
      if (!chance(0.7)) continue;
      const date = daysAgo(n);
      const answers: Record<string, string> = {};
      const stamps: Record<string, string> = {};
      for (const q of some(dailyQs, 3 + Math.floor(rand() * 4))) {
        answers[q.key] = await seal(pick(DAILY_LINES[q.key] ?? ["Noticed it today."]));
        if (chance(0.45)) stamps[q.key] = await seal(some(STAMPS, 1 + Math.floor(rand() * 2)));
      }
      const moodKey = await seal(pick(MOODS));
      await db.dailyReflection.upsert({ where: { userId_date: { userId: user.id, date } }, create: { userId: user.id, date, answers, stamps, moodKey }, update: { answers, stamps, moodKey } });
    }

    // ---- weekly reflections (the last 10 weeks, not this one)
    const weeklyQs = shownQuestions("weekly", null);
    for (let w = 1; w <= 10; w++) {
      const ws = weekStart(daysAgo(w * 7));
      const answers: Record<string, string> = {};
      const stamps: Record<string, string> = {};
      for (const q of some(weeklyQs, 5 + Math.floor(rand() * 4))) {
        answers[q.key] = await seal(pick(WEEKLY_LINES[q.key] ?? ["A steady week."]));
        if (chance(0.35)) stamps[q.key] = await seal(some(STAMPS, 1));
      }
      await db.weeklyReflection.upsert({ where: { userId_weekStart: { userId: user.id, weekStart: ws } }, create: { userId: user.id, weekStart: ws, answers, stamps }, update: { answers, stamps } });
    }

    // ---- sankalpa: an earlier letter and the current one (due to be read again)
    if (!(await db.commitment.count({ where: { userId: user.id } }))) {
      await db.commitment.create({ data: { id: newId(), userId: user.id, body: await seal(LETTERS[0]), revisit: "monthly", createdAt: daysAgo(150), revisitedAt: daysAgo(120), supersededAt: daysAgo(40) } });
      await db.commitment.create({ data: { id: newId(), userId: user.id, body: await seal(LETTERS[1]), revisit: "monthly", createdAt: daysAgo(40), revisitedAt: daysAgo(35) } });
    }

    // ---- Presence: people (one birthday in two days) and things
    const soon = new Date(today.getTime() + 2 * DAY);
    const presence = [
      { name: "Amma", relation: "Family", birthday: `1958-${iso(soon).slice(5)}`, howMet: null, kind: null },
      { name: "Ravi", relation: "Friend", birthday: "1990-03-14", howMet: "College hostel, 2008", kind: null },
      { name: "Meera", relation: "Seva", birthday: null, howMet: "Volunteering at Mahashivratri 2024", kind: null },
      { name: "Arjun", relation: "Neighbour", birthday: null, howMet: null, kind: null },
      { name: "Ananya", relation: "Colleague", birthday: "1994-11-02", howMet: null, kind: null },
      { name: "Amma's rasam", kind: "food" },
      { name: "The Kaveri", kind: "water" },
      { name: "Velliangiri", kind: "earth" },
      { name: "My bed", kind: "thing" },
      { name: "Walking barefoot", kind: "act" },
      { name: "The morning bell", kind: "other" },
    ];
    const ids: Record<string, string> = {};
    for (const p of presence) {
      const birthday = "birthday" in p ? p.birthday : null;
      const row = await db.person.create({
        data: {
          id: newId(),
          userId: user.id,
          name: await seal(p.name),
          relation: "relation" in p && p.relation ? await seal(p.relation) : null,
          howMet: "howMet" in p && p.howMet ? await seal(p.howMet) : null,
          birthdaySealed: birthday ? await seal(birthday) : null,
          birthdayMD: birthday ? birthday.slice(5) : null,
          kind: p.kind ? await seal(p.kind) : null,
        },
      });
      ids[p.name] = row.id;
    }
    const linkFor: Record<string, string[]> = {
      "Amma's rasam": ["Amma", "Amma's rasam"], "Walking barefoot": ["Walking barefoot"], "A call with Ravi": ["Ravi"], "Velliangiri in the distance": ["Velliangiri"],
      "Meera's question": ["Meera"], "The Kaveri at dusk": ["The Kaveri"], "Cooking for the neighbours": ["Arjun"], "My bed, after the night shift": ["My bed"],
      "The morning bell": ["The morning bell"], "Volunteering at the kitchen": ["Meera"], "Silence at dinner": ["Amma"], "Old photographs": ["Amma"],
    };

    // ---- moments: spread over four months, two coming back today, three from this day in past years
    for (const [i, [title, body, place]] of MOMENTS.entries()) {
      const pastYear = i < 3;
      const occurredAt = pastYear
        ? new Date(Date.UTC(today.getUTCFullYear() - (i + 1), today.getUTCMonth(), today.getUTCDate(), 6 + i * 3, 15))
        : new Date(daysAgo(2 + Math.floor(rand() * 120)).getTime() + (6 + Math.floor(rand() * 14)) * 3600e3);
      const comingBack = i === 3 || i === 4;
      await db.expression.create({
        data: {
          id: newId(),
          userId: user.id,
          kind: "writing",
          title: await seal(title),
          body: await seal(body),
          place: place ? await seal(place) : null,
          stamps: await seal(chance(0.6) ? some(STAMPS, 1 + Math.floor(rand() * 2)) : []),
          date: new Date(iso(occurredAt)),
          occurredAt,
          refDates: [],
          ...(comingBack ? { lookBackOn: today, lookBackAt: new Date(today.getTime() + 3 * 3600e3), lookBackSentAt: new Date() } : {}),
          people: { create: (linkFor[title] ?? []).map((n) => ({ personId: ids[n] })) },
        },
      });
    }

    // ---- a few other members, for the Access page
    const others = [
      { name: "Lakshmi Iyer", email: "lakshmi.staging@example.com", status: "PENDING", bundles: null },
      { name: "Karthik Rao", email: "karthik.staging@example.com", status: "APPROVED", bundles: ["sadhana", "reflection"] },
      { name: "Priya Nair", email: "priya.staging@example.com", status: "APPROVED", bundles: ["reflection"] },
      { name: "Suresh Menon", email: "suresh.staging@example.com", status: "SUSPENDED", bundles: ["expressions"] },
    ] as const;
    for (const o of others) {
      if (await db.user.findUnique({ where: { email: o.email } })) continue;
      await db.user.create({
        data: {
          name: o.name,
          email: o.email,
          status: o.status,
          onboardedAt: o.status === "PENDING" ? null : daysAgo(20),
          approvedAt: o.status === "PENDING" ? null : daysAgo(19),
          lastSeenAt: o.status === "APPROVED" ? daysAgo(Math.floor(rand() * 5)) : null,
          accounts: { create: { type: "oidc", provider: "google", providerAccountId: `staging-${o.email}` } },
          features: o.bundles ? { create: ["sadhana", "reflection", "expressions"].map((b) => ({ feature: b, allowed: (o.bundles as readonly string[]).includes(b) })) } : undefined,
        },
      });
    }

    console.log(`Done: ${practices.length} practices, 11 weeks of logs, reflections, 2 letters, ${presence.length} in Presence, ${MOMENTS.length} moments, ${others.length} other members.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
