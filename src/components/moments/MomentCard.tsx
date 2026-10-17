"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, CaretDown, CaretRight, DotsThree, MapPin, PencilSimple, Trash } from "@phosphor-icons/react";
import { MomentBadge } from "@/components/art/MomentIcon";
import { PersonAvatar } from "@/components/people/People";
import { useToast } from "@/components/ui/Toast";
import type { Moment } from "@/lib/moment-types";
import { dayHeading } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MediaPreview } from "./Media";
import { StampChip } from "@/components/art/StampIcon";
import { BusyBar } from "@/components/ui/Busy";
import { plainText } from "./RichText";

export const STAMP_LABEL: Record<string, string> = {
  growth: "Growth", struggle: "Struggle", insight: "Insight", stillness: "Stillness", devotion: "Devotion",
};

export function lookBackLabel(m: Moment) {
  if (!m.lookBackAt) return dayHeading(m.lookBackOn + "T12:00:00");
  const at = new Date(m.lookBackAt);
  return `${dayHeading(m.lookBackAt)}, ${at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export function timeOf(m: Moment) {
  return m.hasTime ? new Date(m.occurredAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
}

const KIND_NAME: Record<string, string> = { writing: "Writing", moment: "Writing", audio: "Voice note", video: "Video", photo: "Photos" };

/** One line that stands for a moment when it is folded: its title, else its first words. */
function headline(m: Moment, text: string) {
  if (m.title) return m.title;
  const first = text.trim().split(/\n/)[0];
  return first ? (first.length > 90 ? first.slice(0, 88) + "…" : first) : KIND_NAME[m.kind] ?? "Moment";
}

/** Deleting a moment, shared by the card and the moment's own page. */
export function useDeleteMoment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return async (moment: Moment) => {
    if (!confirm("Delete this moment? Its recordings and photos are deleted too.")) return false;
    const res = await fetch(`/api/expressions/${moment.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Couldn't delete. Please try again.", "error");
      return false;
    }
    toast("Moment deleted", "success", 1800);
    qc.invalidateQueries({ queryKey: ["moments"] });
    qc.invalidateQueries({ queryKey: ["people"] });
    qc.invalidateQueries({ queryKey: ["person"] });
    return true;
  };
}

export const momentHref = (m: Moment) => `/expressions/${m.id}`;

/** The ⋯ menu for one moment (Edit, Delete), on its card and on its own page. */
export function MomentMenu({ onEdit, onDelete, className }: { onEdit: () => void; onDelete: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Closes on a tap anywhere else (sidebar and header included) or Escape. The closing tap
  // does nothing more, so it can't also open the card underneath.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
      const swallow = (c: MouseEvent) => {
        c.preventDefault();
        c.stopPropagation();
      };
      document.addEventListener("click", swallow, { capture: true, once: true });
      // A drag or scroll sends no click; don't eat the next real one.
      setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 600);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" aria-label="Moment options" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-ink hover:bg-ink/5">
        <DotsThree size={22} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-40 p-1 rounded-[14px] bg-bg border border-line shadow-[var(--shadow-lift)]">
          <button type="button" onClick={() => { setOpen(false); onEdit(); }} className="w-full flex items-center gap-2 h-10 px-3 rounded-[10px] font-ui text-[14px] text-ink hover:bg-surface">
            <PencilSimple size={16} /> Edit
          </button>
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2 h-10 px-3 rounded-[10px] font-ui text-[14px] text-danger hover:bg-danger/10">
            <Trash size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A moment in a list: a steady preview (title, time, a few lines, one media thumbnail) that
 * never changes shape. Tapping anywhere on it opens the moment's own page; the menu and the
 * people links still work on their own. `folded` shows it as one line instead.
 */
export function MomentCard({ moment, onEdit, hidePersonId, folded = false }: { moment: Moment; onEdit: (m: Moment) => void; hidePersonId?: string; folded?: boolean }) {
  const qc = useQueryClient();
  const del = useDeleteMoment();
  const [deleting, setDeleting] = useState(false);
  const people = moment.people.filter((p) => p.id !== hidePersonId);
  const text = plainText(moment.body);
  // The page opens with this copy straight away while it checks for a fresher one.
  const seed = () => qc.setQueryData(["moments", "one", moment.id], (old: Moment | undefined) => old ?? moment);

  async function remove() {
    setDeleting(true);
    if (!(await del(moment))) setDeleting(false);
  }

  if (folded) {
    const media = moment.attachments.length;
    return (
      <Link
        href={momentHref(moment)}
        onPointerDown={seed}
        className="press group w-full flex items-center gap-3 rounded-[16px] bg-surface hover:bg-surface-2 px-3.5 py-3 text-left transition-colors"
      >
        <MomentBadge kind={moment.kind} size={34} />
        <span className="flex-1 min-w-0">
          <span className={cn("block truncate text-ink", moment.title ? "font-display text-[16px] font-semibold" : "font-serif text-[15.5px]")}>{headline(moment, text)}</span>
          <span className="block truncate font-ui text-[12.5px] text-ink-soft tabular mt-0.5">
            {[timeOf(moment), moment.place, people.map((p) => p.name).join(", "), media > 1 ? `${media} files` : null].filter(Boolean).join(" · ")}
          </span>
        </span>
        <CaretRight size={16} className="shrink-0 text-ink-soft group-hover:text-ink" />
      </Link>
    );
  }

  return (
    <article inert={deleting} aria-busy={deleting || undefined} className={cn("press relative rounded-[18px] bg-surface hover:bg-surface-2 p-4 sm:p-5 transition-[opacity,background-color]", deleting && "opacity-50")}>
      <Link href={momentHref(moment)} onPointerDown={seed} aria-label={`Open ${moment.title || headline(moment, text)}`} className="absolute inset-0 rounded-[18px] z-0" />
      <BusyBar show={deleting} className="absolute top-0 inset-x-5" />
      <header className="flex items-start gap-3">
        <MomentBadge kind={moment.kind} size={38} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-display text-[18px] font-semibold leading-snug truncate", moment.title ? "text-ink" : "text-ink-soft")}>{moment.title || KIND_NAME[moment.kind] || "Moment"}</h3>
          <p className="font-ui text-[12.5px] text-ink-soft mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular">
            {timeOf(moment) && <span>{timeOf(moment)}</span>}
            {moment.place && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {moment.place}
              </span>
            )}
            {moment.lookBackOn && (
              <span className="inline-flex items-center gap-1 text-accent">
                <ArrowCounterClockwise size={12} /> back on {lookBackLabel(moment)}
              </span>
            )}
          </p>
        </div>
        <MomentMenu onEdit={() => onEdit(moment)} onDelete={remove} className="relative z-10 -mr-1.5 -mt-1" />
      </header>

      {moment.attachments.length > 0 && (
        <div className="mt-3 pointer-events-none">
          <MediaPreview attachments={moment.attachments} />
        </div>
      )}

      {text && <p className="mt-3 font-serif text-[16px] leading-[1.65] text-ink line-clamp-3 whitespace-pre-line">{text}</p>}

      {(people.length > 0 || moment.stamps.length > 0) && (
        <footer className="mt-3 flex flex-wrap items-center gap-1.5">
          {people.map((p) => (
            <Link key={p.id} href={`/people/${p.id}`} className="press relative z-10 inline-flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full bg-bg hover:bg-surface-2">
              <PersonAvatar person={p} size={24} />
              <span className="font-ui text-[13px] font-semibold text-ink">{p.name}</span>
            </Link>
          ))}
          {moment.stamps.map((s) => (
            <StampChip key={s} k={s} />
          ))}
        </footer>
      )}
    </article>
  );
}

export type TimelineGroup = "month" | "year" | "none";

/**
 * Moments grouped by month or year (each folds away), or not at all, and then by day.
 * `folded` shows every moment as one line until it is opened.
 */
export function MomentTimeline({ moments, onEdit, hidePersonId, folded = false, group = "month" }: { moments: Moment[]; onEdit: (m: Moment) => void; hidePersonId?: string; folded?: boolean; group?: TimelineGroup }) {
  const [closedMonths, setClosedMonths] = useState<Set<string>>(() => new Set());
  // Grouped by key, not by position: older entries without an exact time sort last, so a
  // month (or day) can turn up twice in the list.
  const byMonth = new Map<string, { key: string; label: string; days: Map<string, Moment[]>; count: number }>();
  for (const m of moments) {
    const d = new Date(m.occurredAt);
    const key = group === "none" ? "all" : group === "year" ? `${d.getFullYear()}` : `${d.getFullYear()}-${d.getMonth()}`;
    let month = byMonth.get(key);
    if (!month) {
      const label = group === "year" ? String(d.getFullYear()) : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      month = { key, label, days: new Map(), count: 0 };
      byMonth.set(key, month);
    }
    month.count++;
    const day = dayHeading(m.occurredAt);
    month.days.set(day, [...(month.days.get(day) ?? []), m]);
  }
  const months = [...byMonth.values()].map((mo) => ({ ...mo, days: [...mo.days].map(([day, items]) => ({ day, items })) }));
  const toggle = (key: string) =>
    setClosedMonths((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-7">
      {months.map((month) => {
        const closed = group !== "none" && closedMonths.has(month.key);
        return (
          <section key={month.key}>
            {group !== "none" && <button
              type="button"
              onClick={() => toggle(month.key)}
              aria-expanded={!closed}
              className="press group -mx-1 mb-3 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-[12px] px-1 py-1.5 text-left"
            >
              <span className="font-display text-[19px] font-semibold text-ink">{month.label}</span>
              <span className="font-ui text-[12.5px] text-ink-soft tabular">{month.count}</span>
              <span className="flex-1 h-px bg-line ml-1" />
              <CaretDown size={16} className={cn("text-ink-soft transition-transform group-hover:text-ink", closed && "-rotate-90")} />
            </button>}
            {!closed && (
              <div className="flex flex-col gap-5">
                {month.days.map((g) => (
                  <div key={g.day + g.items[0].id}>
                    <h3 className="font-ui text-[13px] font-semibold text-ink-soft mb-2 px-1 tabular">{g.day}</h3>
                    <div className={cn("flex flex-col", folded ? "gap-1.5" : "gap-2.5")}>
                      {g.items.map((m) => (
                        <MomentCard key={m.id + (folded ? ":f" : "")} moment={m} onEdit={onEdit} hidePersonId={hidePersonId} folded={folded} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
