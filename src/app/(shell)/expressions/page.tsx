"use client";

import { usePersistentState } from "@/lib/persist";

import { Suspense, useDeferredValue, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, MagnifyingGlass, Plus, Cards, List, SlidersHorizontal, X } from "@phosphor-icons/react";
import { MomentGlyph } from "@/components/art/MomentIcon";
import { StampIcon, type StampKey } from "@/components/art/StampIcon";
import { STAMP_GUIDE } from "@/components/reflection/StampRow";
import { PersonAvatar, usePeople } from "@/components/people/People";
import { PickerPanel } from "@/components/ui/pickers";
import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { MomentComposer } from "@/components/moments/MomentComposer";
import { MomentCard, MomentTimeline } from "@/components/moments/MomentCard";
import { useMoments } from "@/lib/moments-client";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "", label: "All" },
  { id: "writing", label: "Writing" },
  { id: "audio", label: "Voice" },
  { id: "video", label: "Video" },
  { id: "photo", label: "Photo" },
] as const;

export default function ExpressionsPage() {
  return (
    <Suspense fallback={<div className="py-20 grid place-items-center"><Loader /></div>}>
      <ExpressionsContent />
    </Suspense>
  );
}

function ExpressionsContent() {
  // ?open=<id> (from search) pins that moment at the top.
  const params = useSearchParams();
  const openId = params.get("open");
  const { data: pinned } = useQuery({
    queryKey: ["moments", "one", openId],
    enabled: !!openId,
    queryFn: async (): Promise<Moment | null> => {
      const res = await fetch(`/api/expressions/${openId}`);
      return res.ok ? res.json() : null;
    },
  });
  const [kind, setKind] = usePersistentState("moments.filter", "", ["", "writing", "audio", "video", "photo"] as const);
  const [sort, setSort] = usePersistentState("moments.sort", "newest", ["newest", "oldest"] as const);
  const [view, setView] = usePersistentState("moments.view", "full", ["full", "folded"] as const);
  const [group, setGroup] = usePersistentState("moments.group", "month", ["month", "year", "none"] as const);
  const [person, setPerson] = useState("");
  const [stamp, setStamp] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: people = [] } = usePeople();
  const personName = people.find((p) => p.id === person)?.name;
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMoments({ kind, q, person, stamp, sort });
  const moments = data?.pages.flatMap((p) => p.items) ?? [];

  const [composer, setComposer] = useState<{ open: boolean; moment: Moment | null; kind: MomentKind }>({
    open: false,
    moment: null,
    kind: "writing",
  });
  const openNew = (k: MomentKind = "writing") => setComposer({ open: true, moment: null, kind: k });
  // ?new=1 (from search) opens the composer once the page is live in the browser, so the
  // "now" it shows is in your time zone, not the server's.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [newDismissed, setNewDismissed] = useState(false);
  const autoOpen = hydrated && params.get("new") === "1" && !newDismissed;

  const filtering = !!kind || !!q || !!person || !!stamp;
  const extraFilters = (person ? 1 : 0) + (stamp ? 1 : 0) + (sort === "oldest" ? 1 : 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <label className="relative flex-1">
          <span className="sr-only">Search moments</span>
          <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search moments, places, words"
            className="w-full h-11 pl-11 pr-10 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface-2">
              <X size={15} />
            </button>
          )}
        </label>
        <Button onClick={() => openNew()} className="shrink-0">
          <Plus size={16} weight="bold" /> New moment
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {/* Phones: one segmented row, icons only, so every kind is in view. Wider: labelled chips. */}
        <div role="group" aria-label="Kind of moment" className="flex-1 min-w-0 flex max-sm:justify-between max-sm:p-1 max-sm:rounded-full max-sm:bg-surface sm:gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={kind === f.id}
              aria-label={f.id ? f.label : "All moments"}
              title={f.label}
              onClick={() => setKind(f.id)}
              className={cn(
                "press shrink-0 inline-flex items-center justify-center gap-1.5 h-9 rounded-full font-ui text-[13.5px] font-semibold transition-colors",
                "max-sm:flex-1 max-sm:max-w-[64px] sm:px-3.5 sm:border",
                kind === f.id ? "bg-accent text-bg sm:border-accent" : "text-ink-soft hover:text-ink sm:border-line"
              )}
            >
              {f.id && <MomentGlyph kind={f.id} size={f.id ? 17 : 15} strokeWidth={kind === f.id ? 3 : 2.6} className="sm:w-[15px] sm:h-[15px]" />}
              <span className={cn(f.id && "max-sm:sr-only")}>{f.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label={`Filter and sort${extraFilters ? `, ${extraFilters} on` : ""}`}
          className={cn("press relative shrink-0 grid place-items-center w-9 h-9 rounded-full border transition-colors", extraFilters ? "border-accent text-accent bg-accent-soft" : "border-line text-ink-soft hover:text-ink")}
        >
          <SlidersHorizontal size={17} />
          {extraFilters > 0 && <span className="absolute -top-1 -right-1 grid place-items-center min-w-[17px] h-[17px] px-1 rounded-full bg-accent text-bg font-ui text-[10.5px] font-bold tabular">{extraFilters}</span>}
        </button>
        <div role="radiogroup" aria-label="View" className="shrink-0 hidden sm:flex p-0.5 rounded-full border border-line">
          {([["full", "Full moments", Cards], ["folded", "One line each", List]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" role="radio" aria-checked={view === id} aria-label={label} title={label} onClick={() => setView(id)} className={cn("press grid place-items-center w-8 h-8 rounded-full transition-colors", view === id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {extraFilters > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {person && <ActiveChip label={`With ${personName ?? "someone"}`} onClear={() => setPerson("")} />}
          {stamp && <ActiveChip label={STAMP_GUIDE.find((s) => s.key === stamp)?.label ?? stamp} onClear={() => setStamp("")} />}
          {sort === "oldest" && <ActiveChip label="Oldest first" onClear={() => setSort("newest")} />}
        </div>
      )}
      <div className="mb-5" />

      {pinned && (
        <section className="mb-8">
          <h2 className="font-ui text-[13px] font-semibold text-accent mb-2 px-1">From search</h2>
          <MomentCard moment={pinned} onEdit={(m) => setComposer({ open: true, moment: m, kind: m.kind })} />
        </section>
      )}

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader />
        </div>
      ) : moments.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <Ornament name="kolam" width={180} className="text-accent/60" />
          <p className="font-serif italic text-[17px] text-ink-soft max-w-[320px]">
            {filtering ? "Nothing matches yet." : "Nothing here yet. When something touches you, give it a place."}
          </p>
          {!filtering && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <Button variant="secondary" onClick={() => openNew("writing")}><MomentGlyph kind="writing" size={16} /> Write</Button>
              <Button variant="secondary" onClick={() => openNew("audio")}><MomentGlyph kind="audio" size={16} /> Voice</Button>
              <Button variant="secondary" onClick={() => openNew("video")}><MomentGlyph kind="video" size={16} /> Video</Button>
              <Button variant="secondary" onClick={() => openNew("photo")}><MomentGlyph kind="photo" size={16} /> Photo</Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <MomentTimeline moments={moments} folded={view === "folded"} group={group} onEdit={(m) => setComposer({ open: true, moment: m, kind: m.kind })} />
          {hasNextPage && (
            <div className="flex justify-center mt-6">
              <Button variant="ghost" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
                Show older moments
              </Button>
            </div>
          )}
        </>
      )}

      <PickerPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter and sort"
        footer={
          <>
            <button type="button" onClick={() => { setPerson(""); setStamp(""); setSort("newest"); setGroup("month"); setView("full"); }} className="press flex-1 h-11 rounded-[14px] bg-surface-2 text-ink font-ui text-[14px] font-semibold">Clear</button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="press flex-1 h-11 rounded-[14px] bg-accent text-bg font-ui text-[14px] font-semibold">Show moments</button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="sm:hidden">
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">View</p>
            <div className="grid grid-cols-2 p-1 rounded-full bg-surface-2">
              {([["full", "Full moments", Cards], ["folded", "One line each", List]] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={cn("press inline-flex items-center justify-center gap-1.5 h-9 rounded-full font-ui text-[13.5px] font-semibold transition-colors", view === id ? "bg-bg text-ink shadow-[var(--shadow-soft)]" : "text-ink-soft")}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">Group by</p>
            <div className="grid grid-cols-3 p-1 rounded-full bg-surface-2">
              {([["month", "Month"], ["year", "Year"], ["none", "None"]] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={group === id} onClick={() => setGroup(id)} className={cn("press h-9 rounded-full font-ui text-[13.5px] font-semibold transition-colors", group === id ? "bg-bg text-ink shadow-[var(--shadow-soft)]" : "text-ink-soft")}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">Order</p>
            <div className="grid grid-cols-2 p-1 rounded-full bg-surface-2">
              {([["newest", "Newest first"], ["oldest", "Oldest first"]] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={sort === id} onClick={() => setSort(id)} className={cn("press h-9 rounded-full font-ui text-[13.5px] font-semibold transition-colors", sort === id ? "bg-bg text-ink shadow-[var(--shadow-soft)]" : "text-ink-soft")}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">What it carries</p>
            <div className="flex flex-wrap gap-1.5">
              {STAMP_GUIDE.map((st) => (
                <button key={st.key} type="button" aria-pressed={stamp === st.key} onClick={() => setStamp(stamp === st.key ? "" : st.key)} className={cn("press inline-flex items-center gap-1.5 h-9 px-3 rounded-full border font-ui text-[13px] font-semibold transition-colors", stamp === st.key ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink")}>
                  <StampIcon k={st.key as StampKey} size={15} /> {st.label}
                </button>
              ))}
            </div>
          </div>
          {people.length > 0 && (
            <div>
              <p className="font-ui text-[13px] font-semibold text-ink mb-2">With</p>
              <ul className="flex flex-col gap-1 max-h-[240px] overflow-y-auto -mx-1 px-1">
                {people.map((p) => (
                  <li key={p.id}>
                    <button type="button" aria-pressed={person === p.id} onClick={() => setPerson(person === p.id ? "" : p.id)} className={cn("press w-full flex items-center gap-3 h-11 px-2 rounded-[12px] text-left transition-colors", person === p.id ? "bg-accent-soft" : "hover:bg-surface")}>
                      <PersonAvatar person={p} size={30} />
                      <span className="flex-1 truncate font-ui text-[14.5px] font-semibold text-ink">{p.name}</span>
                      {person === p.id && <Check size={16} weight="bold" className="text-accent" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PickerPanel>

      <MomentComposer
        open={composer.open || autoOpen}
        moment={composer.open ? composer.moment : null}
        defaultKind={composer.open ? composer.kind : "writing"}
        onClose={() => {
          setNewDismissed(true);
          setComposer((c) => ({ ...c, open: false }));
        }}
      />
    </div>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} aria-label={`Remove filter: ${label}`} className="press inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-accent-soft text-accent font-ui text-[12.5px] font-semibold">
      {label} <X size={12} weight="bold" />
    </button>
  );
}

function noopSubscribe() {
  return () => {};
}
