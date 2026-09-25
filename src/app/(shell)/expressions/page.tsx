"use client";

import { usePersistentState } from "@/lib/persist";

import { Suspense, useDeferredValue, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Camera, Feather, MagnifyingGlass, Microphone, Plus, VideoCamera, X } from "@phosphor-icons/react";
import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { MomentComposer } from "@/components/moments/MomentComposer";
import { MomentCard, MomentTimeline } from "@/components/moments/MomentCard";
import { useMoments } from "@/lib/moments-client";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "", label: "All", icon: null },
  { id: "writing", label: "Writing", icon: Feather },
  { id: "audio", label: "Voice", icon: Microphone },
  { id: "video", label: "Video", icon: VideoCamera },
  { id: "photo", label: "Photo", icon: Camera },
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
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMoments({ kind, q });
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

  const filtering = !!kind || !!q;

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

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={kind === f.id}
            onClick={() => setKind(f.id)}
            className={cn(
              "press shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-ui text-[13.5px] font-semibold border transition-colors",
              kind === f.id ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink"
            )}
          >
            {f.icon && <f.icon size={15} weight={kind === f.id ? "fill" : "regular"} />}
            {f.label}
          </button>
        ))}
      </div>

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
              <Button variant="secondary" onClick={() => openNew("writing")}><Feather size={16} /> Write</Button>
              <Button variant="secondary" onClick={() => openNew("audio")}><Microphone size={16} /> Voice</Button>
              <Button variant="secondary" onClick={() => openNew("video")}><VideoCamera size={16} /> Video</Button>
              <Button variant="secondary" onClick={() => openNew("photo")}><Camera size={16} /> Photo</Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <MomentTimeline moments={moments} onEdit={(m) => setComposer({ open: true, moment: m, kind: m.kind })} />
          {hasNextPage && (
            <div className="flex justify-center mt-6">
              <Button variant="ghost" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
                Show older moments
              </Button>
            </div>
          )}
        </>
      )}

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

function noopSubscribe() {
  return () => {};
}
