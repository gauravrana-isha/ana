"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { CrossMark, PlusMark } from "@/components/art/PenMarks";
import { fetchPeople, savePerson } from "@/lib/journal";
import { StoredImg } from "@/components/moments/StoredMedia";
import { onScreen } from "@/lib/on-screen";
import { kindDef, presenceKind } from "@/lib/presence";
import { PresenceMark } from "./PresenceMark";

export interface PersonSummary {
  id: string;
  name: string;
  relation?: string | null;
  /** What it is (see lib/presence); none: a person. */
  kind?: string | null;
  photoId: string | null;
  momentCount?: number;
  lastMomentAt?: string | null;
}

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: () => fetchPeople<PersonSummary>(),
  });
}

// Warm, quiet tones for initials, picked by name so a person always keeps theirs.
const TONES = ["#2f6b5e", "#8a5a3c", "#6b5b8a", "#3f6f8a", "#8a6b2f", "#7a4a5a"];
function tone(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

export function PersonAvatar({ person, size = 36, className }: { person: Pick<PersonSummary, "name" | "photoId"> & { kind?: string | null }; size?: number; className?: string }) {
  if (person.photoId) {
    return (
      <StoredImg
        id={person.photoId}
        width={size}
        height={size}
        className={cn("rounded-full object-cover shrink-0 bg-surface-2", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  // Anything that isn't a person, without a photo: its kind's mark.
  const kind = presenceKind(person.kind);
  if (kind !== "person") {
    return (
      <span aria-hidden="true" className={cn("rounded-full grid place-items-center shrink-0 text-white", className)} style={{ width: size, height: size, background: tone(person.name) }}>
        <PresenceMark kind={kind} size={Math.round(size * 0.56)} />
      </span>
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
/**
 * Choose on the finger lifting, not on "click". On iPhone the click comes after the touch
 * ends, by which time the field has lost focus, the keyboard is sliding away and the sheet
 * has moved, so the click landed elsewhere and nothing was picked. A drag (scrolling the
 * list) doesn't pick. Keyboard Enter still works through onClick.
 */
function PickButton({ onPick, className, children }: { onPick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onPointerDown={(e) => {
        e.currentTarget.dataset.tapX = String(e.clientX);
        e.currentTarget.dataset.tapY = String(e.clientY);
        if (e.pointerType === "mouse") e.preventDefault(); // keep the field focused on desktop
      }}
      onPointerUp={(e) => {
        const { tapX, tapY } = e.currentTarget.dataset;
        delete e.currentTarget.dataset.tapX;
        if (tapX === undefined) return;
        if (Math.hypot(e.clientX - Number(tapX), e.clientY - Number(tapY)) < 10) {
          e.preventDefault();
          onPick();
        }
      }}
      onPointerCancel={(e) => {
        delete e.currentTarget.dataset.tapX;
      }}
      onClick={(e) => {
        if (e.detail === 0) onPick(); // keyboard activation only; pointers were handled above
      }}
    >
      {children}
    </button>
  );
}

export function PeoplePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data: people = [] } = usePeople();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close on a tap outside or Escape, never on blur: on iPhone the field loses focus (and the
  // keyboard starts to slide away) before Safari delivers the tap on a name, so closing on
  // blur swallowed the choice.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

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
      const { id } = await savePerson(null, { name });
      const person: PersonSummary = { id, name, relation: null, photoId: null, momentCount: 0, lastMomentAt: null };
      onScreen.person(person);
      onChange([...value, person.id]);
      setQuery("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={boxRef} className="relative" data-keep-room="230">
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-12 p-1.5 rounded-[14px] bg-surface-2 border border-transparent focus-within:border-accent transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 h-8 pl-1 pr-1.5 rounded-full bg-bg">
            <PersonAvatar person={p} size={24} />
            <span className="font-ui text-[13.5px] font-semibold text-ink">{p.name}</span>
            <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((id) => id !== p.id))} className="grid place-items-center w-5 h-5 rounded-full text-ink-soft hover:text-ink hover:bg-surface">
              <CrossMark size={14} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value.slice(0, 80)); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0] && (exact || matches.length === 1)) { onChange([...value, matches[0].id]); setQuery(""); }
              else if (q) create();
            } else if (e.key === "Backspace" && !query && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={selected.length ? "Add another" : "Who or what was with you?"}
          aria-label="Add who or what was with you"
          className="flex-1 min-w-[120px] h-9 px-2 bg-transparent outline-none focus-visible:outline-none font-ui text-[16px] text-ink placeholder:text-ink-soft/80"
        />
      </div>

      {open && (matches.length > 0 || (q && !exact)) && (
        <ul className="absolute z-20 left-0 right-0 mt-1.5 p-1.5 rounded-[14px] bg-bg shadow-[var(--shadow-lift)] border border-line max-h-[260px] overflow-y-auto">
          {matches.map((p) => (
            <li key={p.id}>
              <PickButton
                onPick={() => { onChange([...value, p.id]); setQuery(""); inputRef.current?.focus(); }}
                className="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left hover:bg-surface"
              >
                <PersonAvatar person={p} size={30} />
                <span className="flex-1 min-w-0">
                  <span className="block font-ui text-[14px] font-semibold text-ink truncate">{p.name}</span>
                  {presenceKind(p.kind) !== "person" ? (
                    <span className="block font-ui text-[12.5px] text-ink-soft truncate">{kindDef(presenceKind(p.kind)).label}</span>
                  ) : (
                    p.relation && <span className="block font-ui text-[12.5px] text-ink-soft truncate">{p.relation}</span>
                  )}
                </span>
              </PickButton>
            </li>
          ))}
          {q && !exact && (
            <li>
              <PickButton
                onPick={create}
                className="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left hover:bg-surface text-accent"
              >
                <span className="grid place-items-center w-[30px] h-[30px] rounded-full bg-accent-soft"><PlusMark size={17} /></span>
                <span className="font-ui text-[14px] font-semibold">Add &ldquo;{query.trim()}&rdquo;</span>
              </PickButton>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
