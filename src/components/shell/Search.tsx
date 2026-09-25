"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CalendarBlank, Camera, Feather, Microphone, Plus, ShieldCheck, SunHorizon, UserCircle, VideoCamera, X } from "@phosphor-icons/react";
import { PersonAvatar } from "@/components/people/People";
import { FeatureBadge, FeatureGlyph } from "@/components/art/FeatureBadge";
import { FEATURES } from "@/lib/features";
import { useMe } from "@/lib/me";
import { Loader } from "@/components/ui/Loader";
import { dayHeading } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface Results {
  moments: { id: string; title: string; kind: string; at: string; snippet: string }[];
  people: { id: string; name: string; relation: string | null; photoId: string | null }[];
  reflections: { kind: "daily" | "weekly"; date: string; href: string; snippet: string }[];
}

const KIND_ICON: Record<string, typeof Feather> = { writing: Feather, moment: Feather, audio: Microphone, video: VideoCamera, photo: Camera };

export function openSearch() {
  window.dispatchEvent(new Event("ana:search"));
}

/** A search button for headers. */
export function SearchButton({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label="Search"
      className={cn(
        "press inline-flex items-center gap-2 rounded-[12px] text-ink-soft hover:text-ink hover:bg-surface transition-colors",
        withLabel ? "w-full h-10 px-3 font-ui text-[14px]" : "justify-center w-9 h-9",
        className
      )}
    >
      <FeatureGlyph k="search" size={20} />
      {withLabel && (
        <>
          <span className="flex-1 text-left">Search</span>
          <kbd className="font-ui text-[11px] font-semibold text-ink-soft/80 border border-line rounded-[6px] px-1.5 py-0.5">⌘K</kbd>
        </>
      )}
    </button>
  );
}

/** Mounted once in the app shell. */
export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setDebounced("");
      }
    };
    window.addEventListener("ana:search", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("ana:search", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    setDebounced("");
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    enabled: debounced.length >= 2,
    queryFn: async (): Promise<Results> => (await fetch(`/api/search?q=${encodeURIComponent(debounced)}`)).json(),
    staleTime: 10_000,
  });

  const { data: me } = useMe();
  // Pages you can open (and a few quick actions), matched by name or description.
  const pages = useMemo(() => {
    const all = [
      ...FEATURES.filter((f) => me?.features.includes(f.key)).map((f) => ({ key: f.key, label: f.label, hint: f.description, href: f.href, icon: "badge" as const })),
      ...(me?.features.includes("expressions") ? [{ key: "new-moment", label: "New moment", hint: "Write, record or add a photo", href: "/expressions?new=1", icon: "plus" as const }] : []),
      { key: "profile", label: "Profile & settings", hint: "Theme, sections, practices, data", href: "/profile", icon: "profile" as const },
      ...(me?.role === "ADMIN" ? [{ key: "admin", label: "People & access", hint: "Approve sign-ups, manage access", href: "/admin", icon: "admin" as const }] : []),
    ];
    const q = query.trim().toLowerCase();
    return q ? all.filter((p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q) || p.key.includes(q)) : all;
  }, [me, query]);

  // A flat list of destinations, for arrow-key navigation.
  const items = useMemo(() => {
    const pageItems = pages.map((p) => ({ key: "g" + p.key, href: p.href }));
    if (!data || debounced.length < 2) return pageItems;
    return [
      ...pageItems,
      ...data.people.map((p) => ({ key: "p" + p.id, href: `/people/${p.id}` })),
      ...data.moments.map((m) => ({ key: "m" + m.id, href: `/expressions?open=${m.id}` })),
      ...data.reflections.map((r) => ({ key: "r" + r.kind + r.date, href: r.href })),
    ];
  }, [data, pages, debounced]);

  function go(href: string) {
    close();
    router.push(href);
  }

  const empty = !!data && data.people.length + data.moments.length + data.reflections.length === 0;
  let idx = -1;
  const itemClass = (i: number) =>
    cn("w-full flex items-center gap-3 p-2.5 rounded-[12px] text-left transition-colors", i === active ? "bg-surface" : "hover:bg-surface");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
          <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.36)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            className="relative w-full max-w-[600px] rounded-[22px] bg-bg shadow-[var(--shadow-lift)] overflow-hidden"
            initial={{ y: -12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
              <FeatureGlyph k="search" size={20} className="text-ink-soft" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                  else if (e.key === "Enter" && items[active]) go(items[active].href);
                }}
                placeholder="Search moments, people, reflections"
                aria-label="Search"
                className="flex-1 h-full bg-transparent outline-none focus-visible:outline-none font-ui text-[16px] text-ink placeholder:text-ink-soft/80"
              />
              {isFetching ? <Loader size="sm" /> : query && (
                <button type="button" aria-label="Clear" onClick={() => setQuery("")} className="grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface"><X size={15} /></button>
              )}
            </div>

            <div className="max-h-[60dvh] overflow-y-auto p-2">
              {pages.length > 0 && <Group title={query.trim() ? "Go to" : "Jump to"} />}
              {pages.map((p) => {
                const i = ++idx;
                return (
                  <button key={p.key} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(p.href)} className={itemClass(i)}>
                    {p.icon === "badge" ? (
                      <FeatureBadge k={p.key} size={32} />
                    ) : (
                      <span className="grid place-items-center w-8 h-8 rounded-[10px] bg-surface-2 text-accent shrink-0">
                        {p.icon === "plus" ? <Plus size={16} weight="bold" /> : p.icon === "admin" ? <ShieldCheck size={16} /> : <UserCircle size={17} />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{p.label}</span>
                      <span className="block font-ui text-[12.5px] text-ink-soft truncate">{p.hint}</span>
                    </span>
                  </button>
                );
              })}
              {debounced.length < 2 ? (
                pages.length === 0 && <p className="px-3 py-6 font-ui text-[13.5px] text-ink-soft text-center">Type a name, a place, a word you wrote.</p>
              ) : empty && pages.length === 0 ? (
                <p className="px-3 py-6 font-ui text-[13.5px] text-ink-soft text-center">Nothing found for &ldquo;{debounced}&rdquo;.</p>
              ) : data ? (
                <>
                  {data.people.length > 0 && <Group title="People" />}
                  {data.people.map((p) => {
                    const i = ++idx;
                    return (
                      <button key={p.id} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/people/${p.id}`)} className={itemClass(i)}>
                        <PersonAvatar person={p} size={32} />
                        <span className="min-w-0">
                          <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{p.name}</span>
                          {p.relation && <span className="block font-ui text-[12.5px] text-ink-soft truncate">{p.relation}</span>}
                        </span>
                      </button>
                    );
                  })}
                  {data.moments.length > 0 && <Group title="Moments" />}
                  {data.moments.map((m) => {
                    const i = ++idx;
                    const Icon = KIND_ICON[m.kind] ?? Feather;
                    return (
                      <button key={m.id} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/expressions?open=${m.id}`)} className={itemClass(i)}>
                        <span className="grid place-items-center w-8 h-8 rounded-[10px] bg-surface-2 text-accent shrink-0"><Icon size={16} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{m.title}</span>
                          {m.snippet && <span className="block font-ui text-[12.5px] text-ink-soft truncate">{m.snippet}</span>}
                        </span>
                        <span className="font-ui text-[12px] text-ink-soft tabular shrink-0">{dayHeading(m.at)}</span>
                      </button>
                    );
                  })}
                  {data.reflections.length > 0 && <Group title="Reflections" />}
                  {data.reflections.map((r) => {
                    const i = ++idx;
                    return (
                      <button key={r.kind + r.date} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r.href)} className={itemClass(i)}>
                        <span className="grid place-items-center w-8 h-8 rounded-[10px] bg-surface-2 text-accent shrink-0">
                          {r.kind === "daily" ? <SunHorizon size={16} /> : <CalendarBlank size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">
                            {r.kind === "daily" ? "Daily reflection" : "Weekly reflection"} · {dayHeading(r.date + "T12:00:00")}
                          </span>
                          <span className="block font-ui text-[12.5px] text-ink-soft truncate">{r.snippet}</span>
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Group({ title }: { title: string }) {
  return <p className="px-3 pt-3 pb-1 font-ui text-[12px] font-semibold text-ink-soft">{title}</p>;
}
