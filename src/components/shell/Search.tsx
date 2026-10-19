"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PersonAvatar } from "@/components/people/People";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { FEATURES } from "@/lib/features";
import { useMe } from "@/lib/me";
import { Loader } from "@/components/ui/Loader";
import { Portal } from "@/components/ui/Portal";
import { dayHeading } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BackMark, CrossMark, PlusMark, SearchMark } from "@/components/art/PenMarks";
import { fetchSearchIndex, syncMoments, type MomentsCopy } from "@/lib/journal";
import { MOMENTS_KEY } from "@/lib/moments-client";
import { searchIndex } from "@/lib/compute/search";
import { Glyph } from "@/components/art/Glyphs";
import { MomentGlyph } from "@/components/art/MomentIcon";
import { NotificationBell } from "./NotificationBell";
import { lockScroll } from "@/lib/scroll-lock";
import { ProfileLink } from "./ProfileLink";

/*
 * Search lives on Today: a search field with the bell beside it. Tapping the field opens the
 * search over everything: a full page on phones (back arrow in the field, filters, recent
 * searches, results as you type), a panel on wider screens. ⌘K or / opens it from anywhere.
 */

interface Results {
  moments: { id: string; title: string; kind: string; at: string; snippet: string }[];
  people: { id: string; name: string; relation: string | null; photoId: string | null }[];
  reflections: { kind: "daily" | "weekly"; date: string; href: string; snippet: string }[];
}

type Filter = "all" | "moments" | "people" | "reflections";

const OPEN_EVENT = "ana:search";
const RECENT_KEY = "ana:recent-searches";
const RECENT_MAX = 8;

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Today's top row: the search field (which opens search) and the bell. */
export function TodaySearchBar() {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={openSearch}
        className="press flex-1 min-w-0 flex items-center gap-3 h-12 pl-4 pr-3 rounded-full bg-surface text-ink-soft hover:bg-surface-2 transition-colors"
      >
        <SearchMark size={20} />
        <span className="flex-1 text-left font-ui text-[15px] truncate">Search your journal</span>
        <kbd className="hidden lg:inline font-ui text-[11px] font-semibold text-ink-soft/80 border border-line rounded-[6px] px-1.5 py-0.5">⌘K</kbd>
      </button>
      <NotificationBell />
      <ProfileLink />
    </div>
  );
}

// ---------------------------------------------------------------- recent searches (this device)

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* private mode: nothing to remember */
  }
}

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia("(min-width: 1024px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia("(min-width: 1024px)").matches,
    () => false
  );
}

// ---------------------------------------------------------------- the search itself

/** Mounted once in the app shell. */
export function SearchDialog() {
  const router = useRouter();
  const wide = useWide();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  // On phones an open search is a step in history, so the system back gesture closes it.
  const pushed = useRef(false);

  useEffect(() => {
    const onOpen = () => {
      setRecent(readRecent());
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function reset() {
    setOpen(false);
    setQuery("");
    setDebounced("");
    setFilter("all");
    setActive(0);
  }

  function close() {
    if (pushed.current) {
      pushed.current = false;
      history.back(); // the popstate below resets
    } else reset();
  }

  // While open: the page held still, and Escape or back closes it.
  useEffect(() => {
    if (!open) return;
    if (!matchMedia("(min-width: 1024px)").matches) {
      history.pushState({ anaSearch: true }, "");
      pushed.current = true;
    }
    const onPop = () => {
      pushed.current = false;
      reset();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pushed.current) {
        pushed.current = false;
        history.back();
      } else reset();
    };
    const unlock = lockScroll();
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  function remember(q: string) {
    const t = q.trim();
    if (t.length < 2) return;
    writeRecent([t, ...readRecent().filter((r) => r.toLowerCase() !== t.toLowerCase())]);
  }

  function go(href: string) {
    remember(query);
    const wasPushed = pushed.current;
    pushed.current = false;
    reset();
    // Take the place of the search's own history step, so back from the result returns to the page.
    if (wasPushed) router.replace(href);
    else router.push(href);
  }

  // Words are sealed, so the search runs here, over an index fetched once while it's open.
  const qc = useQueryClient();
  const { data: index, isFetching } = useQuery({
    queryKey: ["search-index"],
    enabled: open,
    queryFn: async () => {
      const copy = await qc.ensureQueryData({ queryKey: MOMENTS_KEY, queryFn: () => syncMoments(qc.getQueryData<MomentsCopy>(MOMENTS_KEY)) });
      return fetchSearchIndex(copy.items);
    },
    staleTime: 60_000,
  });

  const { data: me } = useMe();
  const data = useMemo<Results | undefined>(
    () => (index && debounced.length >= 2 ? searchIndex(index, debounced, (f) => !!me?.features.includes(f as never)) : undefined),
    [index, debounced, me]
  );

  const has = (k: string) => !!me?.features.includes(k as never);
  const filters = (
    [
      { key: "all", label: "All", on: true },
      { key: "moments", label: "Moments", on: has("expressions") },
      { key: "people", label: "Presence", on: has("people") },
      { key: "reflections", label: "Reflections", on: has("daily") || has("weekly") },
    ] as const
  ).filter((f) => f.on);

  // Pages you can open (and a few quick actions), matched by name or description.
  const pages = useMemo(() => {
    const all = [
      ...FEATURES.filter((f) => me?.features.includes(f.key)).map((f) => ({ key: f.key, label: f.label, hint: f.description, href: f.href, icon: "badge" as const })),
      ...(me?.features.includes("expressions") ? [{ key: "new-moment", label: "New moment", hint: "Write, record or add a photo", href: "/moments?new=1", icon: "plus" as const }] : []),
      { key: "profile", label: "Profile & settings", hint: "Theme, sections, practices, data", href: "/profile", icon: "profile" as const },
      ...(me?.role === "ADMIN" ? [{ key: "admin", label: "People & access", hint: "Approve sign-ups, manage access", href: "/admin", icon: "admin" as const }] : []),
    ];
    const q = query.trim().toLowerCase();
    return q ? all.filter((p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q) || p.key.includes(q)) : all;
  }, [me, query]);

  const searching = debounced.length >= 2;
  const people = searching && (filter === "all" || filter === "people") ? (data?.people ?? []) : [];
  const moments = searching && (filter === "all" || filter === "moments") ? (data?.moments ?? []) : [];
  const reflections = searching && (filter === "all" || filter === "reflections") ? (data?.reflections ?? []) : [];
  const shownPages = filter === "all" ? pages : [];
  const sections = shownPages.filter((p) => p.icon === "badge");
  const actions = shownPages.filter((p) => p.icon !== "badge");
  const nothing = searching && !!data && people.length + moments.length + reflections.length + shownPages.length === 0;

  // Every destination, in the order shown, for arrow-key navigation.
  const items = [
    ...sections.map((p) => p.href),
    ...actions.map((p) => p.href),
    ...people.map((p) => `/presence/${p.id}`),
    ...moments.map((m) => `/moments/${m.id}`),
    ...reflections.map((r) => r.href),
  ];

  let idx = -1;
  const row = (i: number) => cn("press w-full flex items-center gap-3 px-2.5 py-2.5 rounded-[14px] text-left transition-colors", i === active ? "bg-surface" : "hover:bg-surface");

  const field = (
    <div className="flex items-center gap-1 h-12 pl-1 pr-2 rounded-full bg-surface">
      {wide ? (
        <span className="grid place-items-center w-10 h-10 text-ink-soft">
          <SearchMark size={19} />
        </span>
      ) : (
        <button type="button" onClick={close} aria-label="Close search" className="press grid place-items-center w-10 h-10 rounded-full text-ink hover:bg-surface-2">
          <BackMark size={19} />
        </button>
      )}
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        autoFocus
        enterKeyHint="search"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && items[active]) go(items[active]);
        }}
        placeholder="Search moments, people, reflections"
        aria-label="Search"
        className="flex-1 min-w-0 h-full bg-transparent outline-none font-ui text-[16px] text-ink placeholder:text-ink-soft/80"
      />
      {isFetching && searching ? (
        <Loader size="sm" />
      ) : (
        query && (
          <button type="button" aria-label="Clear" onClick={() => setQuery("")} className="press grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface-2">
            <CrossMark size={16} />
          </button>
        )
      )}
    </div>
  );

  const body = (
    <>
      {filters.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-1 py-3" role="radiogroup" aria-label="Show">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setActive(0);
              }}
              className={cn(
                "press shrink-0 h-9 px-4 rounded-full border font-ui text-[13.5px] font-semibold transition-colors",
                filter === f.key ? "bg-accent-soft border-accent/30 text-accent" : "border-line text-ink-soft hover:text-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {!query.trim() && recent.length > 0 && (
        <section className="mb-2">
          <div className="flex items-center justify-between px-1 pt-1 pb-2">
            <p className="font-ui text-[13px] font-semibold text-ink-soft">Recent searches</p>
            <button
              type="button"
              onClick={() => {
                writeRecent([]);
                setRecent([]);
              }}
              className="press h-8 px-3 rounded-full bg-surface font-ui text-[12.5px] font-semibold text-ink hover:bg-surface-2"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2 px-1">
            {recent.map((r) => (
              <button key={r} type="button" onClick={() => setQuery(r)} className="press inline-flex items-center gap-1.5 h-9 max-w-full pl-3 pr-3.5 rounded-full bg-surface font-ui text-[13.5px] text-ink hover:bg-surface-2">
                <Glyph k="clock" size={15} className="text-ink-soft" />
                <span className="truncate">{r}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {shownPages.length > 0 && <Group title={query.trim() ? "Go to" : "Jump to"} />}
      {sections.length > 0 && (
        // The sections, as one row of round icons that scrolls sideways.
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-3 lg:-mx-1 lg:px-0 pb-1">
          {sections.map((p) => {
            const i = ++idx;
            return (
              <button
                key={p.key}
                type="button"
                title={p.hint}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(p.href)}
                className={cn("press shrink-0 w-[82px] flex flex-col items-center gap-1.5 py-2 rounded-[16px] transition-colors", i === active ? "bg-surface" : "hover:bg-surface")}
              >
                <FeatureBadge k={p.key} size={48} />
                <span className="w-full px-1 font-ui text-[12px] font-semibold text-ink text-center truncate">{p.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {actions.map((p) => {
        const i = ++idx;
        return (
          <button key={p.key} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(p.href)} className={row(i)}>
            <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-surface-2 text-accent shrink-0">
              {p.icon === "plus" ? <PlusMark size={18} /> : p.icon === "admin" ? <Glyph k="shield" size={18} /> : <Glyph k="person" size={19} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{p.label}</span>
              <span className="block font-ui text-[12.5px] text-ink-soft truncate">{p.hint}</span>
            </span>
          </button>
        );
      })}

      {people.length > 0 && <Group title="Presence" />}
      {people.map((p) => {
        const i = ++idx;
        return (
          <button key={p.id} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/presence/${p.id}`)} className={row(i)}>
            <PersonAvatar person={p} size={36} />
            <span className="min-w-0">
              <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{p.name}</span>
              {p.relation && <span className="block font-ui text-[12.5px] text-ink-soft truncate">{p.relation}</span>}
            </span>
          </button>
        );
      })}

      {moments.length > 0 && <Group title="Moments" />}
      {moments.map((m) => {
        const i = ++idx;
        return (
          <button key={m.id} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/moments/${m.id}`)} className={row(i)}>
            <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-surface-2 text-accent shrink-0">
              <MomentGlyph kind={m.kind} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{m.title}</span>
              {m.snippet && <span className="block font-ui text-[12.5px] text-ink-soft truncate">{m.snippet}</span>}
            </span>
            <span className="font-ui text-[12px] text-ink-soft tabular shrink-0">{dayHeading(m.at)}</span>
          </button>
        );
      })}

      {reflections.length > 0 && <Group title="Reflections" />}
      {reflections.map((r) => {
        const i = ++idx;
        return (
          <button key={r.kind + r.date} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r.href)} className={row(i)}>
            <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-surface-2 text-accent shrink-0">
              {r.kind === "daily" ? <Glyph k="sunrise" size={18} /> : <Glyph k="calendar" size={18} />}
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

      {nothing && <p className="px-3 py-10 font-ui text-[14px] text-ink-soft text-center">Nothing found for &ldquo;{debounced}&rdquo;.</p>}
      {!searching && filter !== "all" && <p className="px-3 py-10 font-ui text-[14px] text-ink-soft text-center">Type a name, a place, a word you wrote.</p>}
    </>
  );

  return (
    <Portal>
      <AnimatePresence>
        {open &&
          (wide ? (
            <div key="panel" className="fixed inset-0 z-[60] flex items-start justify-center p-6 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
              <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.36)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
              <motion.div
                className="relative w-full max-w-[620px] rounded-[24px] bg-bg shadow-[var(--shadow-lift)] p-3"
                initial={{ y: -12, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -12, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {field}
                <div className="max-h-[60dvh] overflow-y-auto overscroll-contain px-1 pb-1">{body}</div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              key="page"
              className="fixed inset-0 z-[60] flex flex-col bg-bg"
              style={{ paddingTop: "max(10px, calc(var(--safe-top) + 6px))" }}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="px-4">{field}</div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))]">{body}</div>
            </motion.div>
          ))}
      </AnimatePresence>
    </Portal>
  );
}

function Group({ title }: { title: string }) {
  return <p className="px-1 pt-4 pb-1.5 font-ui text-[13px] font-semibold text-ink-soft">{title}</p>;
}
