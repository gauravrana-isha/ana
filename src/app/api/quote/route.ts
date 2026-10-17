import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://iso-facade.sadhguru.org/content/fetchcsr/content";

const HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "content-type": "application/json",
  "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  "sec-ch-ua-platform": '"macOS"',
  origin: "https://isha.sadhguru.org",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  referer: "https://isha.sadhguru.org/",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6",
};

const FALLBACK_QUOTES = [
  "The most beautiful moments in life are moments when you are expressing your joy, not when you are seeking it.",
  "If you resist change, you resist life.",
  "The sign of intelligence is that you are constantly wondering. Idiots are always dead sure about everything.",
  "Do not try to be special. If you are simply ordinary, more ordinary than others, you will become extraordinary.",
  "If you want to be successful, don't seek success — seek competence, empowerment; do nothing short of the best that you can do.",
  "The only thing that stands between you and your well-being is a simple fact: you have allowed your thoughts and emotions to take instruction from the outside rather than the inside.",
  "Life is a process, not a problem. The question is not about solving it but about experiencing it.",
  "If you think hundred percent logically, there is really no possibility of life.",
  "Confusion is better than stupid conclusions. In confusion, there is still a possibility. In stupid conclusions, there is no possibility.",
  "This is a tremendous moment in your life — to realize that your experience of life is entirely your making.",
  "When pain, misery, or anger happen, it is time to look within you, not around you.",
  "Every human being is capable of living absolutely blissfully within himself.",
];

function hashDate(date: string): number {
  let hash = 0;
  for (const ch of date) {
    hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

/*
 * Today's quote, by today's date in India (Isha publishes it around 07:31 IST). Two rules,
 * from the fix in kiran:
 *   1. Pick the card whose urlAlias is today's IST date (e.g. "october-17-2026"), never just
 *      "the newest": before it's published, the newest is yesterday's.
 *   2. Bust Isha's CDN (a changing query parameter, no-store): it has served day-old listings.
 * Caching follows what was found: today's quote is kept until IST midnight; before it's out,
 * the latest one is shown and checked again within minutes.
 */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const IST_OFFSET_MS = 330 * 60 * 1000;

function istToday(now: Date) {
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
function secondsToIstMidnight(now: Date) {
  const t = now.getTime() + IST_OFFSET_MS;
  const next = Math.floor(t / 86_400_000 + 1) * 86_400_000;
  return Math.max(60, Math.floor((next - t) / 1000));
}
const clean = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim();

type Card = { summary?: string; urlAlias?: string };

export async function GET(req: NextRequest) {
  const now = new Date();
  const ist = istToday(now);
  const today = `${ist.y}-${String(ist.m).padStart(2, "0")}-${String(ist.d).padStart(2, "0")}`;
  const alias = `${MONTHS[ist.m - 1]}-${ist.d}-${ist.y}`;

  try {
    const params = new URLSearchParams({
      format: "json",
      sitesection: "wisdom",
      slug: "wisdom",
      lang: "",
      topic: "",
      start: "0",
      limit: "7",
      contentType: "quotes",
      sortby: "newest",
      _: String(Math.floor(now.getTime() / 60_000)), // a fresh listing, not Isha's cached one
    });
    const res = await fetch(`${API_URL}?${params}`, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const cards: Card[] = ((await res.json())?.posts?.cards ?? []).filter(Boolean);
      const todays = cards.find((c) => c.urlAlias === alias && clean(c.summary));
      if (todays) {
        const ttl = secondsToIstMidnight(now);
        return NextResponse.json(
          { quote: clean(todays.summary), source: "api", date: today, today: true },
          { headers: { "Cache-Control": `public, s-maxage=${ttl}, max-age=0` } }
        );
      }
      // Not published yet today: show the latest for now, and look again soon.
      const latest = cards.find((c) => clean(c.summary));
      if (latest) {
        return NextResponse.json(
          { quote: clean(latest.summary), source: "api", date: today, today: false },
          { headers: { "Cache-Control": "public, s-maxage=240, max-age=0" } }
        );
      }
    }
  } catch {
    // Fall through to a fallback quote
  }

  const idx = hashDate(req.nextUrl.searchParams.get("date") ?? today) % FALLBACK_QUOTES.length;
  return NextResponse.json(
    { quote: FALLBACK_QUOTES[idx], source: "fallback", date: today, today: false },
    { headers: { "Cache-Control": "public, s-maxage=120, max-age=0" } }
  );
}
