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

export async function GET(req: NextRequest) {
  const date =
    req.nextUrl.searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);

  try {
    const params = new URLSearchParams({
      format: "json",
      sitesection: "wisdom",
      slug: "wisdom",
      lang: "",
      topic: "",
      start: "0",
      limit: "1",
      contentType: "quotes",
      sortby: "newest",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_URL}?${params}`, {
      headers: HEADERS,
      signal: controller.signal,
      next: { revalidate: 60 },
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const cards: Array<{ summary?: string }> = data?.posts?.cards ?? [];
      if (cards.length > 0) {
        // Always take the most recent quote (today's)
        const quote = cards[0]?.summary?.trim();
        if (quote) {
          return NextResponse.json({ quote, source: "api" });
        }
      }
    }
  } catch {
    // Fall through to fallback
  }

  const idx = hashDate(date) % FALLBACK_QUOTES.length;
  return NextResponse.json({ quote: FALLBACK_QUOTES[idx], source: "fallback" });
}
