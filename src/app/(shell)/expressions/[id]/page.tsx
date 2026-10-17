"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowCounterClockwise, MapPin } from "@phosphor-icons/react";
import { MomentBadge } from "@/components/art/MomentIcon";
import { StampChip } from "@/components/art/StampIcon";
import { PersonAvatar } from "@/components/people/People";
import { MomentComposer } from "@/components/moments/MomentComposer";
import { StoredAudio, StoredImg, StoredVideo } from "@/components/moments/StoredMedia";
import { useMediaSrc } from "@/lib/vault/files";
import { RichText, plainText } from "@/components/moments/RichText";
import { lookBackLabel, useDeleteMoment } from "@/components/moments/MomentCard";
import { fetchMoment } from "@/lib/journal";
import { MomentPageSkeleton } from "@/components/skeletons/ScreenSkeletons";
import type { Moment } from "@/lib/moment-types";
import { cn } from "@/lib/utils";
import { Portal } from "@/components/ui/Portal";
import { CloseButton } from "@/components/ui/CloseButton";
import { BackMark, DeleteMark, EditMark } from "@/components/art/PenMarks";

/**
 * One moment, in full: its media at full size (photos open fullscreen), the whole text, the
 * people and stamps, and when it comes back. Opened from any list; Back returns to it.
 */
export default function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const del = useDeleteMoment();
  const [editing, setEditing] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const back = () => (window.history.length > 1 ? router.back() : router.push("/expressions"));

  const { data: moment, isPending } = useQuery({
    queryKey: ["moments", "one", id],
    queryFn: () => fetchMoment(id),
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
      <div className="sticky top-[max(12px,calc(var(--safe-top)+6px))] lg:top-6 z-20 -mx-1 mb-4 flex items-center justify-between pointer-events-none">
        <button type="button" onClick={back} aria-label="Back to moments" className={cn(FLOAT, "pointer-events-auto")}>
          <BackMark size={18} />
        </button>
        {/* Only two things to do here, so both are out in the open: icons on phones, labelled from sm up. */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button type="button" onClick={() => setEditing(true)} aria-label="Edit moment" className={cn(FLOAT, "sm:w-auto sm:px-4 sm:gap-1.5 sm:flex sm:text-accent")}>
            <EditMark size={19} />
            <span className="hidden sm:inline font-ui text-[14px] font-semibold">Edit</span>
          </button>
          <button type="button" onClick={remove} aria-label="Delete moment" className={cn(FLOAT, "sm:w-auto sm:px-4 sm:gap-1.5 sm:flex hover:text-danger")}>
            <DeleteMark size={19} />
            <span className="hidden sm:inline font-ui text-[14px] font-semibold">Delete</span>
          </button>
        </div>
      </div>

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
              <span className="inline-flex items-center gap-1"><MapPin size={13} /> {moment.place}</span>
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
                  <StoredImg id={p.id} decoding="async" className={cn("w-full object-cover", photos.length === 1 ? "max-h-[70vh]" : "aspect-square")} />
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
              <ArrowCounterClockwise size={14} /> Comes back on {lookBackLabel(moment)}
            </p>
          )}
        </footer>
      )}

      <PhotoViewer photos={photos.map((p) => p.id)} index={viewer} onIndex={setViewer} />
      <MomentComposer open={editing} moment={moment} defaultKind={moment.kind} onClose={() => setEditing(false)} />
    </article>
  );
}

/** The round back, Edit and Delete buttons, on a soft blur so they read over photos and text. */
const FLOAT = "press grid place-items-center w-10 h-10 rounded-full bg-bg/90 backdrop-blur-xl border border-line/70 text-ink-soft shadow-[0_1px_3px_rgb(0_0_0/0.06)] hover:text-ink hover:bg-surface";

/** One photo in the viewer, opened on the device; fades in once it's ready. */
function ViewerPhoto({ id }: { id: string }) {
  const src = useMediaSrc(id);
  if (!src) return <span className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />;
  return (
    <motion.img
      src={src}
      alt=""
      draggable={false}
      className="max-w-full max-h-full object-contain select-none"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    />
  );
}

/** Photos fullscreen: swipe or use the arrows to move between them; Escape or ✕ closes. */
function PhotoViewer({ photos, index, onIndex }: { photos: string[]; index: number | null; onIndex: (i: number | null) => void }) {
  const [startX, setStartX] = useState<number | null>(null);
  const go = (d: number) => index !== null && onIndex(Math.min(photos.length - 1, Math.max(0, index + d)));

  useEffect(() => {
    if (index === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowRight") onIndex(Math.min(photos.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
    };
  }, [index, photos.length, onIndex]);

  return (
    <Portal>
    <AnimatePresence>
      {index !== null && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => setStartX(e.clientX)}
          onPointerUp={(e) => {
            if (startX !== null && Math.abs(e.clientX - startX) > 50) go(e.clientX < startX ? 1 : -1);
            setStartX(null);
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <ViewerPhoto key={index} id={photos[index]} />
          </AnimatePresence>
          <CloseButton onClick={() => onIndex(null)} onDark className="absolute top-[max(14px,var(--safe-top))] right-4" />
          {photos.length > 1 && (
            <>
              <span className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 font-ui text-[13px] text-white/80 tabular">{index + 1} / {photos.length}</span>
              {index > 0 && (
                <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="press hidden sm:grid absolute left-4 top-1/2 -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><BackMark size={20} /></button>
              )}
              {index < photos.length - 1 && (
                <button type="button" onClick={() => go(1)} aria-label="Next photo" className="press hidden sm:grid absolute right-4 top-1/2 -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><BackMark size={20} className="-scale-x-100" /></button>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
