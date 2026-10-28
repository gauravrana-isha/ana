"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import { MomentGlyph } from "@/components/art/MomentIcon";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TiptapEditor } from "@/components/expressions/TiptapEditor";
import { StampRow } from "@/components/reflection/StampRow";
import { PeoplePicker } from "@/components/people/People";
import { useMe } from "@/lib/me";
import { type AttachmentDTO, type MediaKind } from "@/lib/media-client";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { saveMoment } from "@/lib/journal";
import { toLocalInput } from "@/lib/dates";
import { DateField, DateTimeField, TimeField } from "@/components/ui/pickers";
import { NotifyNudge } from "@/components/push/Notifications";
import { AudioCapture, MediaView, PhotoCapture, UploadStrip, VideoCapture, type CapturedMedia } from "./Media";
import { useEagerUploads } from "./useEagerUploads";
import { plainText } from "./RichText";
import { CrossMark } from "@/components/art/PenMarks";
import { Segmented } from "@/components/ui/Segmented";
import { onScreen } from "@/lib/on-screen";

const KINDS: { id: MomentKind; label: string }[] = [
  { id: "writing", label: "Write" },
  { id: "audio", label: "Voice" },
  { id: "video", label: "Video" },
  { id: "photo", label: "Photo" },
];

const LOOK_BACK = [
  { id: "none", label: "No", tiny: "No", full: "Don't bring it back" },
  { id: "1m", label: "1 month", tiny: "1 mo", full: "In a month" },
  { id: "6m", label: "6 months", tiny: "6 mo", full: "In 6 months" },
  { id: "1y", label: "1 year", tiny: "1 yr", full: "In a year" },
  { id: "date", label: "Date", tiny: "Date", full: "On a date I pick" },
] as const;

/** Now plus some months, at the same time of day (worked out when saving, not when opened). */
function addMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// The current minute, re-read every 30 seconds (so "that time has passed" stays true to the clock).
function subscribeMinute(cb: () => void) {
  const id = window.setInterval(cb, 30_000);
  return () => window.clearInterval(id);
}
function currentMinute() {
  return Math.floor(Date.now() / 60_000);
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
  const [lookBackTime, setLookBackTime] = useState("09:00");
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
      setLookBackDate(m?.lookBackAt ? localDate(new Date(m.lookBackAt)) : (m?.lookBackOn ?? ""));
      setLookBackTime(m?.lookBackAt ? localTime(new Date(m.lookBackAt)) : "09:00");
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

  /** When to bring it back, measured against the clock at the moment of saving. */
  function lookBackAt(): Date | null {
    if (lookBack === "1m") return addMonths(1);
    if (lookBack === "6m") return addMonths(6);
    if (lookBack === "1y") return addMonths(12);
    if (lookBack === "date" && lookBackDate) return new Date(`${lookBackDate}T${lookBackTime || "09:00"}`);
    return null;
  }
  // A picked day and time that has already gone by (checked live, and again on save).
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => 0);
  const pickedPast = lookBack === "date" && !!lookBackDate && minute > 0 && new Date(`${lookBackDate}T${lookBackTime || "09:00"}`).getTime() <= minute * 60_000;

  async function save() {
    if (!me || !hasContent) return;
    const back = lookBackAt();
    if (lookBack === "date" && (!back || back.getTime() <= Date.now())) {
      toast(back ? "Pick a time after now to bring it back." : "Choose the day to bring it back.", "error");
      return;
    }
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
        lookBackOn: back ? localDate(back) : null,
        lookBackAt: back ? back.toISOString() : null,
        personIds,
        attachmentIds: [...kept, ...uploaded].map((a) => a.id),
      };
      const known = qc.getQueryData<Moment["people"]>(["people"]) ?? moment?.people ?? [];
      const { moment: saved, queued } = await saveMoment(moment ?? null, payload, { people: known, attachments: [...kept, ...uploaded] });
      // Show it at once (offline it only exists here until the connection is back).
      onScreen.moment(saved);
      if (queued) {
        toast("Kept on this device. It's saved when you're back online.", "success", 2600);
        uploads.settle();
        onClose();
        return;
      }
      void Promise.all([
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
        <Segmented
          label="Kind of moment"
          fill
          className="mt-4"
          value={kind}
          onChange={setKind}
          options={KINDS.map((k) => ({
            value: k.id,
            name: k.label,
            icon: <MomentGlyph kind={k.id} size={17} strokeWidth={kind === k.id ? 3 : 2.5} />,
            label: <span className="hidden min-[380px]:inline">{k.label}</span>,
          }))}
        />
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
                    ? uploads.waiting
                      ? "Kept on this phone ✓"
                      : "All uploaded ✓"
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
                      <CrossMark size={15} /> Remove {a.kind}
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

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4">
          <div>
            <span className="font-ui text-[13px] font-semibold text-ink">When</span>
            <div className="mt-2"><DateTimeField label="When" value={when} max={maxWhen.slice(0, 10)} onChange={setWhen} /></div>
          </div>
          <label className="block">
            <span className="font-ui text-[13px] font-semibold text-ink">Where <span className="font-normal text-ink-soft">(optional)</span></span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value.slice(0, 120))}
              placeholder="e.g. Dhyanalinga, home"
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
          {/* One choice, so one control: the filled pill glides to the chosen option. */}
          <Segmented
            label="Bring it back to me"
            tone="accent"
            size="sm"
            fill
            className="mt-2"
            value={lookBack}
            onChange={setLookBack}
            options={LOOK_BACK.map((o) => ({
              value: o.id,
              name: o.full,
              icon: lookBack === o.id && o.id !== "none" ? <ReturnMark key={o.id} date={o.id === "date"} /> : undefined,
              label: (
                <>
                  <span className="max-[440px]:hidden">{o.label}</span>
                  <span className="min-[441px]:hidden">{o.tiny}</span>
                </>
              ),
            }))}
          />
          {lookBack === "date" && (
            <>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:max-w-[380px]">
                <DateField compact label="Bring it back on" value={lookBackDate} min={localDate(new Date())} onChange={setLookBackDate} />
                <TimeField label="Bring it back at" value={lookBackTime} onChange={setLookBackTime} />
              </div>
              {pickedPast && <p className="mt-1.5 font-ui text-[12.5px] text-danger">That time has passed. Pick a time after now.</p>}
            </>
          )}
          <NotifyNudge show={lookBack !== "none"} />
        </div>
      </div>
    </Sheet>
  );
}

/** The small mark on the chosen "bring it back" option: a returning arrow (half-turn as it lands), or a calendar for a picked date. */
function ReturnMark({ date }: { date: boolean }) {
  return (
    <motion.svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      initial={{ rotate: date ? 0 : -180, scale: 0.6, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      {date ? (
        <>
          <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
          <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
        </>
      ) : (
        <>
          <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
          <path d="M19.8 4.2v3.6h-3.6" />
        </>
      )}
    </motion.svg>
  );
}
