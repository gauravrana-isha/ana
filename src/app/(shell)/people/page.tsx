"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { PersonAvatar, usePeople } from "@/components/people/People";
import { PersonForm } from "@/components/people/PersonForm";
import { timeAgo } from "@/lib/dates";

export default function PeoplePage() {
  const { data: people = [], isLoading } = usePeople();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q) || p.relation?.toLowerCase().includes(q)) : people;
  }, [people, query]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <label className="relative flex-1">
          <span className="sr-only">Search people</span>
          <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${people.length || ""} people`.replace("  ", " ")} className="w-full h-11 pl-11 pr-10 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80 [&::-webkit-search-cancel-button]:hidden" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface-2">
              <X size={15} />
            </button>
          )}
        </label>
        <Button onClick={() => setAdding(true)} className="shrink-0">
          <Plus size={16} weight="bold" /> Add a person
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 grid place-items-center"><Loader /></div>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <Ornament name="kolam" width={180} className="text-accent/60" />
          <p className="font-serif italic text-[17px] text-ink-soft max-w-[340px]">
            The people you meet along the way. Add someone, then keep the moments you share with them.
          </p>
          <Button variant="secondary" onClick={() => setAdding(true)}><Plus size={16} weight="bold" /> Add the first person</Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {shown.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}`} className="press flex items-center gap-3.5 p-3.5 rounded-[18px] bg-surface hover:bg-surface-2 transition-colors">
                <PersonAvatar person={p} size={52} />
                <span className="flex-1 min-w-0">
                  <span className="block font-ui text-[15.5px] font-semibold text-ink truncate">{p.name}</span>
                  <span className="block font-ui text-[13px] text-ink-soft truncate">
                    {[p.relation, p.momentCount ? `${p.momentCount} moment${p.momentCount === 1 ? "" : "s"}` : "No moments yet"].filter(Boolean).join(" · ")}
                  </span>
                  {p.lastMomentAt && (
                    <span className="block font-ui text-[12.5px] text-accent mt-0.5">Last together {timeAgo(p.lastMomentAt)}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
          {shown.length === 0 && <li className="font-ui text-[14px] text-ink-soft px-1">No one matches &ldquo;{query}&rdquo;.</li>}
        </ul>
      )}

      <PersonForm open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
