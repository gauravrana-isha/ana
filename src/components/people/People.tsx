"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "@phosphor-icons/react";
import { mediaUrl } from "@/lib/media-client";
import { cn } from "@/lib/utils";

export interface PersonSummary {
  id: string;
  name: string;
  relation?: string | null;
  photoId: string | null;
  momentCount?: number;
  lastMomentAt?: string | null;
}

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: async (): Promise<PersonSummary[]> => {
      const res = await fetch("/api/people");
      return res.ok ? res.json() : [];
    },
  });
}

// Warm, quiet tones for initials, picked by name so a person always keeps theirs.
const TONES = ["#2f6b5e", "#8a5a3c", "#6b5b8a", "#3f6f8a", "#8a6b2f", "#7a4a5a"];
function tone(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

export function PersonAvatar({ person, size = 36, className }: { person: Pick<PersonSummary, "name" | "photoId">; size?: number; className?: string }) {
  if (person.photoId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl(person.photoId)}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-full object-cover shrink-0 bg-surface-2", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = person.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <span
      aria-hidden="true"
      className={cn("rounded-full grid place-items-center shrink-0 font-ui font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: tone(person.name) }}
    >
      {initials}
    </span>
  );
}

/** Tag people on a moment. Type to search; Enter on a new name adds that person. */
export function PeoplePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const qc = useQueryClient();
  const { data: people = [] } = usePeople();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value.map((id) => people.find((p) => p.id === id)).filter(Boolean) as PersonSummary[];
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => people.filter((p) => !value.includes(p.id) && (!q || p.name.toLowerCase().includes(q))).slice(0, 6),
    [people, value, q]
  );
  const exact = people.some((p) => p.name.toLowerCase() === q);

  async function create() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return;
      const person: PersonSummary = await res.json();
      qc.setQueryData<PersonSummary[]>(["people"], (old = []) => [...old, person].sort((a, b) => a.name.localeCompare(b.name)));
      onChange([...value, person.id]);
      setQuery("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-12 p-1.5 rounded-[14px] bg-surface-2 border border-transparent focus-within:border-accent transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 h-8 pl-1 pr-1.5 rounded-full bg-bg">
            <PersonAvatar person={p} size={24} />
            <span className="font-ui text-[13.5px] font-semibold text-ink">{p.name}</span>
            <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((id) => id !== p.id))} className="grid place-items-center w-5 h-5 rounded-full text-ink-soft hover:text-ink hover:bg-surface">
              <X size={11} weight="bold" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value.slice(0, 80)); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0] && (exact || matches.length === 1)) { onChange([...value, matches[0].id]); setQuery(""); }
              else if (q) create();
            } else if (e.key === "Backspace" && !query && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={selected.length ? "Add someone else" : "Who was there?"}
          aria-label="Add people"
          className="flex-1 min-w-[120px] h-9 px-2 bg-transparent outline-none focus-visible:outline-none font-ui text-[16px] text-ink placeholder:text-ink-soft/80"
        />
      </div>

      {open && (matches.length > 0 || (q && !exact)) && (
        <ul className="absolute z-20 left-0 right-0 mt-1.5 p-1.5 rounded-[14px] bg-bg shadow-[var(--shadow-lift)] border border-line max-h-[260px] overflow-y-auto">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange([...value, p.id]); setQuery(""); }}
                className="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left hover:bg-surface"
              >
                <PersonAvatar person={p} size={30} />
                <span className="flex-1 min-w-0">
                  <span className="block font-ui text-[14px] font-semibold text-ink truncate">{p.name}</span>
                  {p.relation && <span className="block font-ui text-[12.5px] text-ink-soft truncate">{p.relation}</span>}
                </span>
              </button>
            </li>
          ))}
          {q && !exact && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={create}
                className="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left hover:bg-surface text-accent"
              >
                <span className="grid place-items-center w-[30px] h-[30px] rounded-full bg-accent-soft"><Plus size={15} weight="bold" /></span>
                <span className="font-ui text-[14px] font-semibold">Add &ldquo;{query.trim()}&rdquo;</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
