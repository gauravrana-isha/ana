"use client";

import { ListSkeleton, PersonSkeleton } from "@/components/skeletons/ScreenSkeletons";
import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cake, Camera, Feather, Handshake, Microphone, VideoCamera } from "@phosphor-icons/react";
import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PersonAvatar } from "@/components/people/People";
import { PersonForm, type PersonDetail } from "@/components/people/PersonForm";
import { LazyMomentComposer } from "@/components/moments/LazyMomentComposer";
import { MomentTimeline } from "@/components/moments/MomentCard";
import { useMoments } from "@/lib/moments-client";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BusyBar } from "@/components/ui/Busy";
import { deletePerson, fetchPerson } from "@/lib/journal";
import { useConfirm } from "@/components/ui/Confirm";
import { DetailBar } from "@/components/ui/DetailBar";

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const ask = useConfirm();
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: person, isPending: isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: () => fetchPerson<PersonDetail>(id),
  });
  const moments = useMoments({ person: id });
  const list = moments.data?.pages.flatMap((p) => p.items) ?? [];
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [composer, setComposer] = useState<{ open: boolean; moment: Moment | null; kind: MomentKind }>({ open: false, moment: null, kind: "writing" });

  async function remove() {
    if (!person || !(await ask({ title: `Remove ${person.name}?`, body: `Your moments stay; they just won't mention ${person.name} any more.`, confirmLabel: "Remove", tone: "danger" }))) return;
    setRemoving(true);
    try {
      await deletePerson(id);
    } catch {
      setRemoving(false);
      return toast("Couldn't remove. Please try again.", "error");
    }
    qc.setQueryData<{ id: string }[]>(["people"], (old) => old?.filter((p) => p.id !== id));
    qc.invalidateQueries({ queryKey: ["people"] });
    qc.invalidateQueries({ queryKey: ["moments"] });
    router.replace("/people");
  }

  if (isLoading) return <PersonSkeleton />;
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
    <div data-bare>
      {/* A full page, like a moment: back, Edit and Remove float at the top. */}
      <DetailBar backTo="/people" backLabel="Back to people" what="person" deleteWord="Remove" onEdit={() => setEditing(true)} onDelete={remove} />

      <section inert={removing} aria-busy={removing || undefined} className={cn("relative rounded-[22px] bg-surface p-5 sm:p-6 transition-opacity", removing && "opacity-60")}>
        <BusyBar show={removing} className="absolute top-0 inset-x-6" />
        <div className="relative flex items-center gap-4">
          <PersonAvatar person={person} size={64} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[24px] sm:text-[28px] font-semibold tracking-[-0.015em] text-ink leading-tight">{person.name}</h1>
            {person.relation && <p className="font-ui text-[14px] text-ink-soft mt-0.5">{person.relation}</p>}
            <p className="font-ui text-[13.5px] text-accent font-semibold mt-2">
              {person.lastMomentAt
                ? `Last moment together ${timeAgo(person.lastMomentAt)} · ${person.momentCount} in all`
                : "No moments yet"}
            </p>
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
        {moments.isPending ? (
          <ListSkeleton kind="moment" count={3} />
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
      <LazyMomentComposer
        open={composer.open}
        moment={composer.moment}
        defaultKind={composer.kind}
        defaultPersonIds={[id]}
        onClose={() => setComposer((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
