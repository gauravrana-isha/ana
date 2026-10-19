"use client";

import { MomentsSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { usePersistentState } from "@/lib/persist";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MomentGlyph } from "@/components/art/MomentIcon";
import { StampChip } from "@/components/art/StampIcon";
import { STAMP_GUIDE } from "@/components/reflection/StampRow";
import { PersonAvatar, usePeople } from "@/components/people/People";
import { PickerPanel } from "@/components/ui/pickers";
import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { LazyMomentComposer } from "@/components/moments/LazyMomentComposer";
import { MomentCard, MomentTimeline } from "@/components/moments/MomentCard";
import { useMoments } from "@/lib/moments-client";
import { fetchMoment } from "@/lib/journal";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { cn } from "@/lib/utils";
import { CrossMark, FiltersMark, PlusMark } from "@/components/art/PenMarks";
import { FeatureGlyph } from "@/components/art/FeatureBadge";
import { TickMark } from "@/components/tracker/FieldInput";
import { Glyph } from "@/components/art/Glyphs";
import { Segmented } from "@/components/ui/Segmented";

const FILTERS = [
  { id: "", label: "All" },
  { id: "writing", label: "Writing" },
  { id: "audio", label: "Voice" },
  { id: "video", label: "Video" },
  { id: "photo", label: "Photo" },
] as const;

export default function ExpressionsPage() {
  return (
    <Suspense fallback={<MomentsSkeleton />}>
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
    queryFn: () => fetchMoment(openId!),
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
  // Search once typing pauses, not on every keystroke.
  const q = useDebounced(query.trim(), 300);
  const { data, isPending: isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMoments({ kind, q, person, stamp, sort });
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
          <FeatureGlyph k="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search moments, places, words"
            className="w-full h-11 pl-11 pr-10 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface-2">
              <CrossMark size={17} />
            </button>
          )}
        </label>
        <Button onClick={() => openNew()} className="shrink-0">
          <PlusMark size={18} /> New moment
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {/* Phones: one segmented row, icons only, so every kind is in view. Wider: labelled chips. */}
        <Segmented
          label="Kind of moment"
          tone="accent"
          fill="mobile"
          className="flex-1 min-w-0 sm:flex-none"
          value={kind}
          onChange={setKind}
          options={FILTERS.map((f) => ({
            value: f.id,
            name: f.id ? f.label : "All moments",
            icon: f.id ? <MomentGlyph kind={f.id} size={17} strokeWidth={kind === f.id ? 3 : 2.6} className="sm:w-[15px] sm:h-[15px]" /> : undefined,
            label: <span className={cn(f.id && "max-sm:sr-only")}>{f.label}</span>,
          }))}
        />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label={`Filter and sort${extraFilters ? `, ${extraFilters} on` : ""}`}
          className={cn("press relative shrink-0 grid place-items-center w-9 h-9 rounded-full border transition-colors", extraFilters ? "border-accent text-accent bg-accent-soft" : "border-line text-ink-soft hover:text-ink")}
        >
          <FiltersMark size={19} />
          {extraFilters > 0 && <span className="absolute -top-1 -right-1 grid place-items-center min-w-[17px] h-[17px] px-1 rounded-full bg-accent text-bg font-ui text-[10.5px] font-bold tabular">{extraFilters}</span>}
        </button>
        <Segmented
          label="View"
          tone="outline"
          size="sm"
          iconOnly
          className="shrink-0 hidden sm:inline-flex"
          value={view}
          onChange={setView}
          options={[
            { value: "full", label: "Full moments", icon: <Glyph k="cards" size={18} /> },
            { value: "folded", label: "One line each", icon: <Glyph k="list" size={18} /> },
          ]}
        />
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
        <MomentsSkeleton toolbar={false} />
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
            <Segmented
              label="View"
              fill
              value={view}
              onChange={setView}
              options={[
                { value: "full", label: "Full moments", icon: <Glyph k="cards" size={17} /> },
                { value: "folded", label: "One line each", icon: <Glyph k="list" size={17} /> },
              ]}
            />
          </div>
          <div>
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">Group by</p>
            <Segmented
              label="Group by"
              fill
              value={group}
              onChange={setGroup}
              options={[
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
                { value: "none", label: "None" },
              ]}
            />
          </div>
          <div>
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">Order</p>
            <Segmented
              label="Order"
              fill
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
              ]}
            />
          </div>
          <div>
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">What it carries</p>
            <div className="flex flex-wrap gap-1.5">
              {STAMP_GUIDE.map((st) => (
                <StampChip key={st.key} k={st.key} selected={stamp === st.key} onToggle={() => setStamp(stamp === st.key ? "" : st.key)} />
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
                      {person === p.id && <TickMark size={17} className="text-accent" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PickerPanel>

      <LazyMomentComposer
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
      {label} <CrossMark size={15} />
    </button>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

function noopSubscribe() {
  return () => {};
}
