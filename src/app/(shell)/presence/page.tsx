"use client";

import { ListSkeleton } from "@/components/skeletons/ScreenSkeletons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { PersonAvatar, usePeople } from "@/components/people/People";
import { PersonForm } from "@/components/people/PersonForm";
import { SyncMark } from "@/components/shell/SyncMark";
import { timeAgo } from "@/lib/dates";
import { CrossMark, PlusMark } from "@/components/art/PenMarks";
import { FeatureGlyph } from "@/components/art/FeatureBadge";
import { PresenceMark } from "@/components/people/PresenceMark";
import { PRESENCE_KINDS, presenceKind } from "@/lib/presence";

/**
 * Presence: everyone and everything you meet with attention, grouped by what it is (people
 * first), each with the moments you've had with it.
 */
export default function PresencePage() {
  const { data: people = [], isPending: isLoading } = usePeople();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q) || p.relation?.toLowerCase().includes(q)) : people;
  }, [people, query]);
  // People first, then each other kind, in Presence's own order.
  const groups = PRESENCE_KINDS.map((k) => ({ kind: k.key, label: k.plural, items: shown.filter((p) => presenceKind(p.kind) === k.key) })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <label className="relative flex-1">
          <span className="sr-only">Search Presence</span>
          <FeatureGlyph k="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Presence" className="w-full h-11 pl-11 pr-10 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80 [&::-webkit-search-cancel-button]:hidden" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface-2">
              <CrossMark size={17} />
            </button>
          )}
        </label>
        <Button onClick={() => setAdding(true)} className="shrink-0">
          <PlusMark size={18} /> Add
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton kind="person" count={5} />
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <Ornament name="kolam" width={180} className="text-accent/60" />
          <p className="font-serif italic text-[17px] text-ink-soft max-w-[340px]">
            The people, places and things you meet with attention. Add one, then keep the moments you have with them.
          </p>
          <Button variant="secondary" onClick={() => setAdding(true)}><PlusMark size={18} /> Add the first</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map((g) => (
            <section key={g.kind} aria-label={g.label}>
              {groups.length > 1 && (
                <h2 className="mb-2.5 px-1 flex items-center gap-2 font-ui text-[13px] font-semibold text-ink-soft">
                  <PresenceMark kind={g.kind} size={17} /> {g.label}
                </h2>
              )}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {g.items.map((p) => (
                <li key={p.id}>
                  <Link href={`/presence/${p.id}`} className="press flex items-center gap-3.5 p-3.5 rounded-[18px] bg-surface hover:bg-surface-2 transition-colors">
                    <PersonAvatar person={p} size={52} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-ui text-[15.5px] font-semibold text-ink truncate">{p.name}</span>
                      <span className="block font-ui text-[13px] text-ink-soft truncate">
                        {[p.relation, p.momentCount ? `${p.momentCount} moment${p.momentCount === 1 ? "" : "s"}` : "No moments yet"].filter(Boolean).join(" · ")}
                      </span>
                      {p.lastMomentAt && (
                        <span className="block font-ui text-[12.5px] text-accent mt-0.5">{presenceKind(p.kind) === "person" ? "Last together" : "Last moment"} {timeAgo(p.lastMomentAt)}</span>
                      )}
                    </span>
                    <SyncMark id={p.photoId ? [p.id, p.photoId] : p.id} />
                  </Link>
                </li>
                ))}
              </ul>
            </section>
          ))}
          {shown.length === 0 && <p className="font-ui text-[14px] text-ink-soft px-1">Nothing matches &ldquo;{query}&rdquo;.</p>}
        </div>
      )}

      <PersonForm open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
