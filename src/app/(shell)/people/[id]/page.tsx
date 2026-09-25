"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cake, Camera, Feather, Handshake, Microphone, PencilSimple, Trash, VideoCamera } from "@phosphor-icons/react";
import { Ornament } from "@/components/art/Ornament";
import { Chevron } from "@/components/ui/Arrows";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { PersonAvatar } from "@/components/people/People";
import { PersonForm, type PersonDetail } from "@/components/people/PersonForm";
import { MomentComposer } from "@/components/moments/MomentComposer";
import { MomentTimeline } from "@/components/moments/MomentCard";
import { useMoments } from "@/lib/moments-client";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BusyBar } from "@/components/ui/Busy";

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: person, isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: async (): Promise<PersonDetail | null> => {
      const res = await fetch(`/api/people/${id}`);
      return res.ok ? res.json() : null;
    },
  });
  const moments = useMoments({ person: id });
  const list = moments.data?.pages.flatMap((p) => p.items) ?? [];
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [composer, setComposer] = useState<{ open: boolean; moment: Moment | null; kind: MomentKind }>({ open: false, moment: null, kind: "writing" });

  async function remove() {
    if (!person || !confirm(`Remove ${person.name}? Your moments stay; they just won't mention ${person.name} any more.`)) return;
    setRemoving(true);
    const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRemoving(false);
      return toast("Couldn't remove. Please try again.", "error");
    }
    qc.invalidateQueries({ queryKey: ["people"] });
    qc.invalidateQueries({ queryKey: ["moments"] });
    router.replace("/people");
  }

  if (isLoading) return <div className="py-20 grid place-items-center"><Loader /></div>;
  if (!person) {
    return (
      <div className="py-16 text-center">
        <p className="font-ui text-[15px] text-ink-soft">This person isn&rsquo;t in your journal.</p>
        <Link href="/people" className="inline-block mt-4 font-ui text-[14px] font-semibold text-accent">Back to People</Link>
      </div>
    );
  }

  const birthday = person.birthday ? new Date(person.birthday + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long" }) : null;
  const openNew = (k: MomentKind) => setComposer({ open: true, moment: null, kind: k });

  return (
    <div>
      <Link href="/people" className="press inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[10px] font-ui text-[13.5px] font-semibold text-ink-soft hover:text-ink mb-3">
        <Chevron dir="left" size={15} /> People
      </Link>

      <section inert={removing} aria-busy={removing || undefined} className={cn("relative rounded-[22px] bg-surface p-5 sm:p-6 transition-opacity", removing && "opacity-60")}>
        <BusyBar show={removing} className="absolute top-0 inset-x-6" />
        <div className="relative flex items-center gap-4 pr-20">
          <PersonAvatar person={person} size={64} />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[24px] sm:text-[28px] font-semibold tracking-[-0.015em] text-ink leading-tight">{person.name}</h2>
            {person.relation && <p className="font-ui text-[14px] text-ink-soft mt-0.5">{person.relation}</p>}
            <p className="font-ui text-[13.5px] text-accent font-semibold mt-2">
              {person.lastMomentAt
                ? `Last moment together ${timeAgo(person.lastMomentAt)} · ${person.momentCount} in all`
                : "No moments yet"}
            </p>
          </div>
          <div className="absolute right-0 top-0 flex gap-1 -mr-1.5 -mt-1">
            <button type="button" aria-label="Edit" onClick={() => setEditing(true)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2"><PencilSimple size={18} /></button>
            <button type="button" aria-label="Remove person" onClick={remove} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10"><Trash size={18} /></button>
          </div>
        </div>

        {(person.howMet || birthday || person.notes) && (
          <div className="mt-5 pt-4 border-t border-line flex flex-col gap-2.5 font-ui text-[14px] text-ink">
            {person.howMet && <p className="flex gap-2.5"><Handshake size={18} className="text-ink-soft shrink-0 mt-0.5" /> {person.howMet}</p>}
            {birthday && <p className="flex gap-2.5"><Cake size={18} className="text-ink-soft shrink-0 mt-0.5" /> Birthday {birthday}</p>}
            {person.notes && <p className="font-serif text-[15.5px] leading-[1.6] whitespace-pre-line text-ink-soft">{person.notes}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => openNew("writing")}><Feather size={15} /> Write a moment</Button>
          <Button size="sm" variant="secondary" onClick={() => openNew("audio")}><Microphone size={15} /> Voice</Button>
          <Button size="sm" variant="secondary" onClick={() => openNew("video")}><VideoCamera size={15} /> Video</Button>
          <Button size="sm" variant="secondary" onClick={() => openNew("photo")}><Camera size={15} /> Photo</Button>
        </div>
      </section>

      <div className="mt-8">
        {moments.isLoading ? (
          <div className="py-12 grid place-items-center"><Loader /></div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10 gap-3">
            <Ornament name="divider" width={200} className="text-ink-soft/40" />
            <p className="font-serif italic text-[16px] text-ink-soft max-w-[320px]">
              When you share something with {person.name.split(" ")[0]}, keep it here.
            </p>
          </div>
        ) : (
          <>
            <MomentTimeline moments={list} hidePersonId={id} onEdit={(m) => setComposer({ open: true, moment: m, kind: m.kind })} />
            {moments.hasNextPage && (
              <div className="flex justify-center mt-6">
                <Button variant="ghost" onClick={() => moments.fetchNextPage()} loading={moments.isFetchingNextPage}>Show older moments</Button>
              </div>
            )}
          </>
        )}
      </div>

      <PersonForm open={editing} onClose={() => setEditing(false)} person={person} />
      <MomentComposer
        open={composer.open}
        moment={composer.moment}
        defaultKind={composer.kind}
        defaultPersonIds={[id]}
        onClose={() => setComposer((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
