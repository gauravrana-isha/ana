"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowCounterClockwise, CaretLeft, CaretRight, MapPin, PencilSimple, Trash, X } from "@phosphor-icons/react";
import { MomentBadge } from "@/components/art/MomentIcon";
import { StampIcon, type StampKey } from "@/components/art/StampIcon";
import { PersonAvatar } from "@/components/people/People";
import { MomentComposer } from "@/components/moments/MomentComposer";
import { AudioPlayer } from "@/components/moments/Media";
import { RichText, plainText } from "@/components/moments/RichText";
import { STAMP_LABEL, lookBackLabel, useDeleteMoment } from "@/components/moments/MomentCard";
import { MomentPageSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { mediaUrl } from "@/lib/media-client";
import type { Moment } from "@/lib/moment-types";
import { cn } from "@/lib/utils";

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

  const { data: moment, isPending } = useQuery({
    queryKey: ["moments", "one", id],
    queryFn: async (): Promise<Moment | null> => {
      const res = await fetch(`/api/expressions/${id}`);
      return res.ok ? res.json() : null;
    },
  });

  const back = () => (window.history.length > 1 ? router.back() : router.push("/expressions"));

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
    <article inert={deleting} className={cn("pb-10 transition-opacity", deleting && "opacity-50")}>
      <div className="flex items-center justify-between gap-2 -mt-2 mb-5">
        <button type="button" onClick={back} className="press inline-flex items-center gap-1 h-10 pl-2 pr-3.5 rounded-full font-ui text-[14px] font-semibold text-ink-soft hover:text-ink hover:bg-surface">
          <CaretLeft size={18} /> Moments
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setEditing(true)} className="press inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full font-ui text-[14px] font-semibold text-accent hover:bg-accent-soft">
            <PencilSimple size={16} /> Edit
          </button>
          <button type="button" onClick={remove} aria-label="Delete moment" className="press grid place-items-center w-10 h-10 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
            <Trash size={17} />
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
            <video key={v.id} src={mediaUrl(v.id)} controls playsInline preload="metadata" className="w-full max-h-[70vh] rounded-[18px] bg-black" />
          ))}
          {photos.length > 0 && (
            <div className={cn("grid gap-2", photos.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {photos.map((p, i) => (
                <button key={p.id} type="button" onClick={() => setViewer(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`} className={cn("press overflow-hidden rounded-[16px] bg-surface-2", photos.length === 3 && i === 0 && "col-span-2")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(p.id)} alt="" decoding="async" className={cn("w-full object-cover", photos.length === 1 ? "max-h-[70vh]" : "aspect-square")} />
                </button>
              ))}
            </div>
          )}
          {audios.map((a) => (
            <AudioPlayer key={a.id} src={mediaUrl(a.id)} duration={a.durationSec} />
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
                <span key={s} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line font-ui text-[13px] text-ink-soft">
                  {s in STAMP_LABEL && <StampIcon k={s as StampKey} size={14} />}
                  {STAMP_LABEL[s] ?? s}
                </span>
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

      <PhotoViewer photos={photos.map((p) => mediaUrl(p.id))} index={viewer} onIndex={setViewer} />
      <MomentComposer open={editing} moment={moment} defaultKind={moment.kind} onClose={() => setEditing(false)} />
    </article>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              key={index}
              src={photos[index]}
              alt=""
              draggable={false}
              className="max-w-full max-h-full object-contain select-none"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
          </AnimatePresence>
          <button type="button" onClick={() => onIndex(null)} aria-label="Close" className="press absolute top-[max(14px,env(safe-area-inset-top))] right-4 grid place-items-center w-11 h-11 rounded-full bg-white/15 text-white">
            <X size={20} />
          </button>
          {photos.length > 1 && (
            <>
              <span className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 font-ui text-[13px] text-white/80 tabular">{index + 1} / {photos.length}</span>
              {index > 0 && (
                <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="press hidden sm:grid absolute left-4 top-1/2 -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><CaretLeft size={20} /></button>
              )}
              {index < photos.length - 1 && (
                <button type="button" onClick={() => go(1)} aria-label="Next photo" className="press hidden sm:grid absolute right-4 top-1/2 -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><CaretRight size={20} /></button>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
