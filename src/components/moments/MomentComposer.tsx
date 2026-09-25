"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Feather, Microphone, VideoCamera, X } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TiptapEditor } from "@/components/expressions/TiptapEditor";
import { StampRow } from "@/components/reflection/StampRow";
import { PeoplePicker } from "@/components/people/People";
import { useMe } from "@/lib/me";
import { type AttachmentDTO, type MediaKind } from "@/lib/media-client";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { toLocalInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DateField, DateTimeField } from "@/components/ui/pickers";
import { AudioCapture, MediaView, PhotoCapture, UploadStrip, VideoCapture, type CapturedMedia } from "./Media";
import { useEagerUploads } from "./useEagerUploads";
import { plainText } from "./RichText";

const KINDS: { id: MomentKind; label: string; icon: typeof Feather }[] = [
  { id: "writing", label: "Write", icon: Feather },
  { id: "audio", label: "Voice", icon: Microphone },
  { id: "video", label: "Video", icon: VideoCamera },
  { id: "photo", label: "Photo", icon: Camera },
];

const LOOK_BACK = [
  { id: "none", label: "No" },
  { id: "1m", label: "In a month" },
  { id: "6m", label: "In 6 months" },
  { id: "1y", label: "In a year" },
  { id: "date", label: "Pick a date" },
] as const;

function addMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Editing an existing moment. */
  moment?: Moment | null;
  /** Prefill (e.g. from a person's page). */
  defaultPersonIds?: string[];
  defaultKind?: MomentKind;
}

export function MomentComposer({ open, onClose, moment, defaultPersonIds = [], defaultKind = "writing" }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();

  const [kind, setKind] = useState<MomentKind>(defaultKind);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [place, setPlace] = useState("");
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [stamps, setStamps] = useState<string[]>([]);
  const [lookBack, setLookBack] = useState<(typeof LOOK_BACK)[number]["id"]>("none");
  const [lookBackDate, setLookBackDate] = useState("");
  const [kept, setKept] = useState<AttachmentDTO[]>([]);
  const [audio, setAudio] = useState<CapturedMedia | null>(null);
  const [video, setVideo] = useState<CapturedMedia | null>(null);
  const [photos, setPhotos] = useState<CapturedMedia[]>([]);
  const [saving, setSaving] = useState<null | string>(null);
  const [editorKey, setEditorKey] = useState(0);

  const [maxWhen] = useState(() => toLocalInput(new Date(Date.now() + 86_400_000)));

  // Reset every time the sheet opens, from the moment being edited or the defaults.
  // (Adjusting state while rendering, keyed on what was opened, avoids an extra effect pass.)
  const openKey = open ? `${moment?.id ?? "new"}:${defaultKind}:${defaultPersonIds.join(",")}` : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey) {
      const m = moment;
      setKind(m ? (m.kind === "moment" ? "writing" : m.kind) : defaultKind);
      setTitle(m?.title ?? "");
      setBody(m?.body ?? "");
      setWhen(toLocalInput(m ? new Date(m.occurredAt) : new Date()));
      setPlace(m?.place ?? "");
      setPersonIds(m ? m.people.map((p) => p.id) : defaultPersonIds);
      setStamps(m?.stamps ?? []);
      setLookBack(m?.lookBackOn ? "date" : "none");
      setLookBackDate(m?.lookBackOn ?? "");
      setKept(m?.attachments ?? []);
      setAudio(null);
      setVideo(null);
      setPhotos([]);
      setSaving(null);
      setEditorKey((k) => k + 1);
    }
  }

  const pending: { kind: MediaKind; media: CapturedMedia }[] = [
    ...(audio ? [{ kind: "audio" as const, media: audio }] : []),
    ...(video ? [{ kind: "video" as const, media: video }] : []),
    ...photos.map((p) => ({ kind: "photo" as const, media: p })),
  ];
  const hasContent = !!title.trim() || !!plainText(body).trim() || kept.length > 0 || pending.length > 0;
  const uploads = useEagerUploads(pending, me);

  // Closing without saving: anything uploaded for this moment is removed again.
  function close() {
    if (saving) return;
    uploads.discardAll();
    onClose();
  }

  function lookBackOn() {
    if (lookBack === "1m") return addMonths(1);
    if (lookBack === "6m") return addMonths(6);
    if (lookBack === "1y") return addMonths(12);
    if (lookBack === "date" && lookBackDate) return lookBackDate;
    return null;
  }

  async function save() {
    if (!me || !hasContent) return;
    try {
      // Most files are already up by now; wait only for what's still going.
      if (uploads.uploadingCount) setSaving(`Finishing ${uploads.uploadingCount} upload${uploads.uploadingCount > 1 ? "s" : ""}…`);
      const uploaded: AttachmentDTO[] = await uploads.finish((left) => left && setSaving(`Finishing ${left} upload${left > 1 ? "s" : ""}…`));
      setSaving("Saving");
      const payload = {
        title: title.trim(),
        kind,
        body: plainText(body).trim() ? body : "",
        occurredAt: new Date(when).toISOString(),
        place: place.trim() || null,
        stamps,
        lookBackOn: lookBackOn(),
        personIds,
        attachmentIds: [...kept, ...uploaded].map((a) => a.id),
      };
      const res = await fetch(moment ? `/api/expressions/${moment.id}` : "/api/expressions", {
        method: moment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Couldn't save the moment");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["moments"] }),
        qc.invalidateQueries({ queryKey: ["people"] }),
        qc.invalidateQueries({ queryKey: ["person"] }),
        qc.invalidateQueries({ queryKey: ["today"] }),
      ]);
      toast(moment ? "Moment updated" : "Moment kept", "success", 2000);
      uploads.settle();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save. Please try again.", "error");
      setSaving(null);
    }
  }

  const keptOfKind = kept.filter((a) => (kind === "photo" ? a.kind === "photo" : a.kind === kind));

  return (
    <Sheet
      open={open}
      onClose={close}
      title={moment ? "Edit moment" : "New moment"}
      size="lg"
      busy={!!saving}
      header={
        <div role="tablist" aria-label="Kind of moment" className="mt-4 p-1 rounded-full bg-surface grid grid-cols-4">
          {KINDS.map((k) => (
            <button
              key={k.id}
              role="tab"
              type="button"
              aria-selected={kind === k.id}
              onClick={() => setKind(k.id)}
              className={cn("relative h-10 rounded-full font-ui text-[13.5px] font-semibold transition-colors", kind === k.id ? "text-ink" : "text-ink-soft hover:text-ink")}
            >
              {kind === k.id && (
                <motion.span layoutId="composer-kind" className="absolute inset-0 rounded-full bg-bg shadow-[var(--shadow-soft)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                <k.icon size={16} weight={kind === k.id ? "fill" : "regular"} />
                <span className="hidden min-[380px]:inline">{k.label}</span>
              </span>
            </button>
          ))}
        </div>
      }
      footer={
        <div className="flex items-center gap-3">
          <span className="flex-1 font-ui text-[13px] text-ink-soft tabular truncate" aria-live="polite">
            {saving ??
              (uploads.failed
                ? "An upload failed. Retry it or remove it."
                : uploads.uploadingCount
                  ? `Uploading ${uploads.uploadingCount} · ${uploads.progress}%`
                  : pending.length
                    ? "All uploaded ✓"
                    : "")}
          </span>
          <Button variant="secondary" onClick={close} disabled={!!saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={!!saving} disabled={!hasContent || !me || uploads.failed}>
            {moment ? "Save" : "Keep it"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Media for the chosen kind */}
        <AnimatePresence mode="wait" initial={false}>
        {kind !== "writing" && (
          <motion.div
            key={kind}
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {keptOfKind.length > 0 && (
              <div className="flex flex-col gap-2">
                <MediaView attachments={keptOfKind} compact />
                <div className="flex flex-wrap gap-1.5">
                  {keptOfKind.map((a) => (
                    <button key={a.id} type="button" onClick={() => setKept((k) => k.filter((x) => x.id !== a.id))} className="press inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-surface font-ui text-[12.5px] font-semibold text-ink-soft hover:text-danger">
                      <X size={12} weight="bold" /> Remove {a.kind}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {kind === "audio" && <AudioCapture value={audio} onChange={setAudio} />}
            {kind === "audio" && audio && <UploadStrip state={uploads.states[audio.url]} onRetry={() => uploads.retry(audio.url)} />}
            {kind === "video" && <VideoCapture value={video} onChange={setVideo} />}
            {kind === "video" && video && <UploadStrip state={uploads.states[video.url]} onRetry={() => uploads.retry(video.url)} />}
            {kind === "photo" && <PhotoCapture value={photos} onChange={setPhotos} statusOf={(u) => uploads.states[u]} onRetry={uploads.retry} />}
          </motion.div>
        )}
        </AnimatePresence>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 150))}
          placeholder={kind === "writing" ? "A title, if it wants one" : "Give it a title (optional)"}
          aria-label="Title"
          className="w-full bg-transparent outline-none font-display text-[24px] font-semibold tracking-[-0.01em] text-ink placeholder:text-ink-soft/60"
        />

        <div className="rounded-[16px] bg-surface px-4 py-3">
          <TiptapEditor
            key={editorKey}
            content={body}
            onChange={setBody}
            placeholder={kind === "writing" ? "What happened? What stayed with you?" : "Add a few words about it…"}
            minHeight={kind === "writing" ? "180px" : "72px"}
          />
        </div>

        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">With</span>
          <div className="mt-2">
            <PeoplePicker value={personIds} onChange={setPersonIds} />
          </div>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="font-ui text-[13px] font-semibold text-ink">When</span>
            <div className="mt-2"><DateTimeField label="When" value={when} max={maxWhen.slice(0, 10)} onChange={setWhen} /></div>
          </div>
          <label className="block">
            <span className="font-ui text-[13px] font-semibold text-ink">Where <span className="font-normal text-ink-soft">(optional)</span></span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value.slice(0, 120))}
              placeholder="e.g. Dhyanalinga, home, the Ashram kitchen"
              className="mt-2 w-full h-12 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80"
            />
          </label>
        </div>

        <div>
          <span className="font-ui text-[13px] font-semibold text-ink">What it carries</span>
          <StampRow selected={stamps} onToggle={(s) => setStamps((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))} />
        </div>

        <div>
          <span className="font-ui text-[13px] font-semibold text-ink">Bring it back to me</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LOOK_BACK.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={lookBack === o.id}
                onClick={() => setLookBack(o.id)}
                className={cn(
                  "press h-9 px-3.5 rounded-full font-ui text-[13px] font-semibold border transition-colors",
                  lookBack === o.id ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {lookBack === "date" && (
            <DateField label="Bring it back on" value={lookBackDate} min={maxWhen.slice(0, 10)} onChange={setLookBackDate} className="mt-2 sm:max-w-[280px]" />
          )}
        </div>
      </div>
    </Sheet>
  );
}
