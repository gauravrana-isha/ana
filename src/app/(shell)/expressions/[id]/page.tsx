"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { MomentBadge } from "@/components/art/MomentIcon";
import { StampChip } from "@/components/art/StampIcon";
import { PersonAvatar } from "@/components/people/People";
import { PhotoViewer } from "@/components/moments/PhotoViewer";
import { MomentComposer } from "@/components/moments/MomentComposer";
import { StoredAudio, StoredImg, StoredVideo } from "@/components/moments/StoredMedia";
import { RichText, plainText } from "@/components/moments/RichText";
import { lookBackLabel, useDeleteMoment } from "@/components/moments/MomentCard";
import { fetchMoment, type MomentsCopy } from "@/lib/journal";
import { useRouteId } from "@/lib/route-id";
import { MomentPageSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { cn } from "@/lib/utils";
import { DetailBar } from "@/components/ui/DetailBar";
import { Glyph } from "@/components/art/Glyphs";

/**
 * One moment, in full: its media at full size (photos open fullscreen), the whole text, the
 * people and stamps, and when it comes back. Opened from any list; Back returns to it.
 */
export default function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const id = useRouteId(params);
  const router = useRouter();
  const qc = useQueryClient();
  const del = useDeleteMoment();
  const [editing, setEditing] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: moment, isPending } = useQuery({
    queryKey: ["moments", "one", id],
    queryFn: () => fetchMoment(id),
    // Shown from the list kept on this device until the full copy arrives (offline: a moment
    // never opened before, or one written offline, still opens).
    placeholderData: () => qc.getQueryData<MomentsCopy>(["moments", "all"])?.items.find((m) => m.id === id),
  });

  if (isPending) return <MomentPageSkeleton />;
  if (!moment) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif italic text-[17px] text-ink-soft">This moment isn&rsquo;t here any more.</p>
        <Link href="/expressions" className="press mt-4 inline-flex h-10 items-center px-4 rounded-full bg-surface font-ui text-[14px] font-semibold text-accent">All moments</Link>
      </div>
    );
  }

  const photos = moment.attachments.filter((a) => a.kind === "photo");
  const videos = moment.attachments.filter((a) => a.kind === "video");
  const audios = moment.attachments.filter((a) => a.kind === "audio");
  const when = new Date(moment.occurredAt);
  const text = plainText(moment.body);

  async function remove() {
    setDeleting(true);
    if (await del(moment!)) router.replace("/expressions");
    else setDeleting(false);
  }

  return (
    <article data-bare inert={deleting} className={cn("pb-10 transition-opacity", deleting && "opacity-50")}>
      {/* No page header here: back, Edit and Delete float at the top and stay in reach while reading. */}
      <DetailBar backTo="/expressions" backLabel="Back to moments" what="moment" onEdit={() => setEditing(true)} onDelete={remove} />

      <header className="flex items-start gap-3.5">
        <MomentBadge kind={moment.kind} size={44} className="mt-1" />
        <div className="min-w-0">
          {moment.title && <h1 className="font-display text-[26px] sm:text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink text-balance">{moment.title}</h1>}
          <p className={cn("font-ui text-[13.5px] text-ink-soft tabular flex flex-wrap items-center gap-x-2.5 gap-y-1", moment.title && "mt-1.5")}>
            <span>
              {when.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {moment.hasTime && ` · ${when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
            </span>
            {moment.place && (
              <span className="inline-flex items-center gap-1"><Glyph k="pin" size={15} /> {moment.place}</span>
            )}
          </p>
        </div>
      </header>

      {(photos.length > 0 || videos.length > 0 || audios.length > 0) && (
        <div className="mt-6 flex flex-col gap-3">
          {videos.map((v) => (
            <StoredVideo key={v.id} id={v.id} controls playsInline preload="metadata" className="w-full max-h-[70vh] rounded-[18px] bg-black" />
          ))}
          {photos.length > 0 && (
            <div className={cn("grid gap-2", photos.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {photos.map((p, i) => (
                <button key={p.id} type="button" onClick={() => setViewer(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`} className={cn("press overflow-hidden rounded-[16px] bg-surface-2", photos.length === 3 && i === 0 && "col-span-2")}>
                  <StoredImg id={p.id} thumb={photos.length > 1} decoding="async" className={cn("w-full object-cover", photos.length === 1 ? "max-h-[70vh]" : "aspect-square")} />
                </button>
              ))}
            </div>
          )}
          {audios.map((a) => (
            <StoredAudio key={a.id} id={a.id} duration={a.durationSec} />
          ))}
        </div>
      )}

      {text && <RichText body={moment.body} className="mt-6 font-serif text-[18px] leading-[1.75] text-ink space-y-3 max-w-[62ch]" />}

      {(moment.people.length > 0 || moment.stamps.length > 0 || moment.lookBackOn) && (
        <footer className="mt-8 pt-6 border-t border-line flex flex-col gap-4">
          {moment.people.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {moment.people.map((p) => (
                <Link key={p.id} href={`/people/${p.id}`} className="press inline-flex items-center gap-2 h-10 pl-1.5 pr-3.5 rounded-full bg-surface hover:bg-surface-2">
                  <PersonAvatar person={p} size={28} />
                  <span className="font-ui text-[14px] font-semibold text-ink">{p.name}</span>
                </Link>
              ))}
            </div>
          )}
          {moment.stamps.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {moment.stamps.map((s) => (
                <StampChip key={s} k={s} />
              ))}
            </div>
          )}
          {moment.lookBackOn && (
            <p className="inline-flex items-center gap-1.5 font-ui text-[13.5px] text-accent">
              <Glyph k="returns" size={16} /> Comes back on {lookBackLabel(moment)}
            </p>
          )}
        </footer>
      )}

      <PhotoViewer photos={photos.map((p) => p.id)} index={viewer} onIndex={setViewer} />
      <MomentComposer open={editing} moment={moment} defaultKind={moment.kind} onClose={() => setEditing(false)} />
    </article>
  );
}
