/*
 * One search across moments, people and reflections, run on the device over the opened
 * index (everything in it is sealed on the server).
 */

export interface SearchIndex {
  moments: { id: string; title: string; body: string; kind: string; occurredAt: string | null; date: string; place: string | null; people: { person: { name: string } }[] }[];
  people: { id: string; name: string; relation: string | null; notes: string | null; howMet: string | null; photoId: string | null }[];
  daily: { date: string; answers: Record<string, string> }[];
  weekly: { weekStart: string; answers: Record<string, string> }[];
}

function snippet(text: string, q: string, width = 90) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, width);
  const start = Math.max(0, i - 30);
  return (start > 0 ? "…" : "") + text.slice(start, start + width).trim() + (start + width < text.length ? "…" : "");
}

function textOf(body: string) {
  try {
    const out: string[] = [];
    const walk = (n: { text?: string; content?: unknown[] }) => {
      if (n.text) out.push(n.text);
      (n.content as { text?: string }[] | undefined)?.forEach(walk);
    };
    walk(JSON.parse(body));
    return out.join(" ");
  } catch {
    return body;
  }
}

export function searchIndex(index: SearchIndex, raw: string, has: (f: string) => boolean) {
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return { moments: [], people: [], reflections: [] };
  const lq = q.toLowerCase();
  const hit = (s: string | null | undefined) => !!s && s.toLowerCase().includes(lq);
  const firstHit = (answers: Record<string, string>) => Object.values(answers ?? {}).find((v) => typeof v === "string" && hit(v));

  const moments = has("expressions")
    ? index.moments
        .map((m) => ({ m, text: textOf(m.body ?? "") }))
        .filter(({ m, text }) => hit(m.title) || hit(text) || hit(m.place) || m.people.some((p) => hit(p.person.name)))
        .sort((a, b) => (b.m.occurredAt ?? b.m.date).localeCompare(a.m.occurredAt ?? a.m.date))
        .slice(0, 6)
        .map(({ m, text }) => ({
          id: m.id,
          title: m.title || text.slice(0, 60) || (m.kind === "audio" ? "Voice note" : m.kind === "video" ? "Video" : m.kind === "photo" ? "Photos" : "Moment"),
          kind: m.kind,
          at: m.occurredAt ?? m.date,
          snippet: hit(text) ? snippet(text, q) : m.place ?? "",
        }))
    : [];

  const people =
    has("people") || has("expressions")
      ? index.people
          .filter((p) => hit(p.name) || hit(p.relation) || hit(p.notes) || hit(p.howMet))
          .slice(0, 6)
          .map((p) => ({ id: p.id, name: p.name, relation: p.relation, photoId: p.photoId }))
      : [];

  const reflections = [
    ...(has("daily")
      ? index.daily
          .filter((d) => firstHit(d.answers))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 6)
          .map((d) => {
            const date = d.date.slice(0, 10);
            return { kind: "daily" as const, date, href: `/daily?date=${date}`, snippet: snippet(firstHit(d.answers) ?? "", q) };
          })
      : []),
    ...(has("weekly")
      ? index.weekly
          .filter((w) => firstHit(w.answers))
          .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
          .slice(0, 4)
          .map((w) => {
            const date = w.weekStart.slice(0, 10);
            return { kind: "weekly" as const, date, href: `/weekly?week=${date}`, snippet: snippet(firstHit(w.answers) ?? "", q) };
          })
      : []),
  ];

  return { moments, people, reflections };
}
