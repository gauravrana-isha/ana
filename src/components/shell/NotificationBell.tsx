"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FeatureBadge, FeatureGlyph } from "@/components/art/FeatureBadge";
import { BellMark } from "@/components/art/PenMarks";
import { BellBadge } from "@/components/push/Notifications";
import { timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CloseButton } from "@/components/ui/CloseButton";
import { Sheet } from "@/components/ui/Sheet";

/** Wide screens (lg up) show the list under the bell; phones and tablets, in the bottom sheet. */
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (on) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

interface Item {
  id: string;
  kind: "moment" | "commitment" | "birthday" | "approval" | "portrait";
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
}

const BADGE: Record<Item["kind"], string | null> = { moment: "expressions", commitment: "commitment", birthday: "people", approval: null, portrait: null };

function when(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 12) return `${Math.round(mins / 60)} h ago`;
  return timeAgo(iso);
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<{ items: Item[]; unread: number }> => {
      const res = await fetch("/api/notifications");
      return res.ok ? res.json() : { items: [], unread: 0 };
    },
    // Every few minutes, and whenever the app comes back to the front.
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * The bell. A dot (never a count) when something is new. Opens a list: new first, then
 * earlier; tapping one opens it and marks it read. Things end on their own (see lib/notify).
 */
export function NotificationBell({ className }: { className?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const wide = useWide();
  const { data } = useNotifications();
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;
  const fresh = items.filter((i) => !i.readAt);
  const earlier = items.filter((i) => i.readAt);

  async function markRead(body: object) {
    // Show it read straight away; the server catches up.
    qc.setQueryData<{ items: Item[]; unread: number }>(["notifications"], (d) => {
      if (!d) return d;
      const ids = "ids" in body ? new Set((body as { ids: string[] }).ids) : null;
      const now = new Date().toISOString();
      const items = d.items.map((i) => (!i.readAt && (!ids || ids.has(i.id)) ? { ...i, readAt: now } : i));
      return { items, unread: items.filter((i) => !i.readAt).length };
    });
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  function openItem(i: Item) {
    setOpen(false);
    if (!i.readAt) markRead({ ids: [i.id] });
    router.push(i.url);
  }

  const markAll = unread > 0 && (
    <button type="button" onClick={() => markRead({ all: true })} className="press h-8 px-2.5 rounded-[10px] font-ui text-[13px] font-semibold text-accent hover:bg-accent-soft">
      Mark all read
    </button>
  );
  const list = (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 px-6 py-10">
          <BellBadge size={48} />
          <p className="font-serif italic text-[15.5px] text-ink-soft max-w-[260px]">Nothing new. Moments coming back, your letter and birthdays will find you here.</p>
        </div>
      ) : (
        <>
          {fresh.length > 0 && <Group title="New" items={fresh} onOpen={openItem} />}
          {earlier.length > 0 && <Group title="Earlier" items={earlier} onOpen={openItem} />}
        </>
      )}
    </>
  );

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        aria-expanded={open}
        className="press relative grid place-items-center w-12 h-12 rounded-full bg-surface text-ink-soft hover:text-ink hover:bg-surface-2 transition-colors"
      >
        <BellMark size={21} />
        {unread > 0 && <span className="absolute top-[11px] right-[12px] w-2.5 h-2.5 rounded-full bg-saffron ring-2 ring-surface" aria-hidden="true" />}
      </button>

      {wide ? (
        <AnimatePresence>
          {open && (
            <>
              <motion.div className="fixed inset-0 z-[65]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} aria-hidden="true" />
              <motion.div
                role="dialog"
                aria-label="Notifications"
                className="absolute right-0 top-11 z-[66] w-[380px] max-h-[520px] flex flex-col bg-bg shadow-[var(--shadow-lift)] rounded-[20px] border border-line"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                  <h2 className="flex-1 font-display text-[19px] font-semibold text-ink">Notifications</h2>
                  {markAll}
                  <CloseButton onClick={() => setOpen(false)} size="sm" />
                </div>
                <div className="overflow-y-auto overscroll-contain px-2 pb-3">{list}</div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <Sheet open={open} onClose={() => setOpen(false)} title="Notifications" action={markAll}>
          <div className="-mx-3">{list}</div>
        </Sheet>
      )}
    </div>
  );
}

function Group({ title, items, onOpen }: { title: string; items: Item[]; onOpen: (i: Item) => void }) {
  return (
    <section className="mt-1">
      <h3 className="px-3 pt-2 pb-1 font-ui text-[12px] font-semibold text-ink-soft uppercase tracking-[0.06em]">{title}</h3>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => onOpen(i)} className="press w-full flex items-start gap-3 px-3 py-2.5 rounded-[14px] text-left hover:bg-surface transition-colors">
              {BADGE[i.kind] ? (
                <FeatureBadge k={BADGE[i.kind]!} size={38} />
              ) : (
                <span className="grid place-items-center w-[38px] h-[38px] rounded-[10px] bg-accent-soft text-accent shrink-0"><FeatureGlyph k={i.kind === "approval" ? "admin" : "profile"} size={22} /></span>
              )}
              <span className="flex-1 min-w-0">
                <span className={cn("block font-ui text-[14px] leading-snug", i.readAt ? "text-ink-soft font-medium" : "text-ink font-semibold")}>{i.title}</span>
                <span className="block font-ui text-[13px] leading-[1.45] text-ink-soft line-clamp-2 mt-0.5">{i.body}</span>
                <span className="block font-ui text-[12px] text-ink-soft/80 mt-1 tabular" suppressHydrationWarning>{when(i.createdAt)}</span>
              </span>
              {!i.readAt && <span className="mt-2 w-2 h-2 rounded-full bg-saffron shrink-0" aria-label="New" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
