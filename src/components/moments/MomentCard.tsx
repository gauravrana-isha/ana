"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, Camera, DotsThree, Feather, MapPin, Microphone, PencilSimple, Trash, VideoCamera } from "@phosphor-icons/react";
import { PersonAvatar } from "@/components/people/People";
import { useToast } from "@/components/ui/Toast";
import type { Moment } from "@/lib/moment-types";
import { dayHeading } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MediaView } from "./Media";
import { StampIcon, type StampKey } from "@/components/art/StampIcon";
import { BusyBar } from "@/components/ui/Busy";
import { RichText, plainText } from "./RichText";

const KIND_ICON = { writing: Feather, moment: Feather, audio: Microphone, video: VideoCamera, photo: Camera };
const STAMP_LABEL: Record<string, string> = {
  growth: "Growth", struggle: "Struggle", insight: "Insight", stillness: "Stillness", devotion: "Devotion",
};

function timeOf(m: Moment) {
  return m.hasTime ? new Date(m.occurredAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
}

export function MomentCard({ moment, onEdit, hidePersonId }: { moment: Moment; onEdit: (m: Moment) => void; hidePersonId?: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const Icon = KIND_ICON[moment.kind] ?? Feather;
  const people = moment.people.filter((p) => p.id !== hidePersonId);
  const text = plainText(moment.body);

  async function remove() {
    setMenu(false);
    if (!confirm("Delete this moment? Its recordings and photos are deleted too.")) return;
    setDeleting(true);
    const res = await fetch(`/api/expressions/${moment.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      return toast("Couldn't delete. Please try again.", "error");
    }
    toast("Moment deleted", "success", 1800);
    qc.invalidateQueries({ queryKey: ["moments"] });
    qc.invalidateQueries({ queryKey: ["people"] });
    qc.invalidateQueries({ queryKey: ["person"] });
  }

  return (
    <article inert={deleting} aria-busy={deleting || undefined} className={cn("relative rounded-[18px] bg-surface p-4 sm:p-5 transition-opacity", deleting && "opacity-50")}>
      <BusyBar show={deleting} className="absolute top-0 inset-x-5" />
      <header className="flex items-start gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-bg text-accent shrink-0 mt-0.5">
          <Icon size={18} />
        </span>
        <div className="flex-1 min-w-0">
          {moment.title && <h3 className="font-display text-[18px] font-semibold text-ink leading-snug">{moment.title}</h3>}
          <p className="font-ui text-[12.5px] text-ink-soft mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular">
            {timeOf(moment) && <span>{timeOf(moment)}</span>}
            {moment.place && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {moment.place}
              </span>
            )}
            {moment.lookBackOn && (
              <span className="inline-flex items-center gap-1 text-accent">
                <ArrowCounterClockwise size={12} /> back on {dayHeading(moment.lookBackOn + "T12:00:00")}
              </span>
            )}
          </p>
        </div>
        <div className="relative">
          <button type="button" aria-label="Moment options" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="press grid place-items-center w-9 h-9 -mr-1.5 -mt-1 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2">
            <DotsThree size={22} weight="bold" />
          </button>
          {menu && (
            <>
              <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-10 z-20 w-40 p-1 rounded-[14px] bg-bg border border-line shadow-[var(--shadow-lift)]">
                <button type="button" onClick={() => { setMenu(false); onEdit(moment); }} className="w-full flex items-center gap-2 h-10 px-3 rounded-[10px] font-ui text-[14px] text-ink hover:bg-surface">
                  <PencilSimple size={16} /> Edit
                </button>
                <button type="button" onClick={remove} className="w-full flex items-center gap-2 h-10 px-3 rounded-[10px] font-ui text-[14px] text-danger hover:bg-danger/10">
                  <Trash size={16} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {moment.attachments.length > 0 && (
        <div className="mt-3">
          <MediaView attachments={moment.attachments} compact />
        </div>
      )}

      {text && <RichText body={moment.body} className="mt-3 font-serif text-[16px] leading-[1.65] text-ink space-y-2" />}

      {(people.length > 0 || moment.stamps.length > 0) && (
        <footer className="mt-3 flex flex-wrap items-center gap-1.5">
          {people.map((p) => (
            <Link key={p.id} href={`/people/${p.id}`} className="press inline-flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full bg-bg hover:bg-surface-2">
              <PersonAvatar person={p} size={24} />
              <span className="font-ui text-[13px] font-semibold text-ink">{p.name}</span>
            </Link>
          ))}
          {moment.stamps.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line font-ui text-[12.5px] text-ink-soft">
              {s in STAMP_LABEL && <StampIcon k={s as StampKey} size={14} />}
              {STAMP_LABEL[s] ?? s}
            </span>
          ))}
        </footer>
      )}
    </article>
  );
}

/** Moments grouped under a day heading, newest first. */
export function MomentTimeline({ moments, onEdit, hidePersonId }: { moments: Moment[]; onEdit: (m: Moment) => void; hidePersonId?: string }) {
  const groups: { day: string; items: Moment[] }[] = [];
  for (const m of moments) {
    const day = dayHeading(m.occurredAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.day + g.items[0].id}>
          <h2 className={cn("font-ui text-[13px] font-semibold text-ink-soft mb-2 px-1 tabular")}>{g.day}</h2>
          <div className="flex flex-col gap-2.5">
            {g.items.map((m) => (
              <MomentCard key={m.id} moment={m} onEdit={onEdit} hidePersonId={hidePersonId} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
