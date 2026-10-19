"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/lib/me";
import { uploadMedia } from "@/lib/media-client";
import { PhotoCropper } from "@/components/ui/PhotoCropper";
import { PersonAvatar } from "./People";
import { DateField } from "@/components/ui/pickers";
import { today } from "@/lib/dates";
import { savePerson } from "@/lib/journal";
import { MomentGlyph } from "@/components/art/MomentIcon";
import { onScreen } from "@/lib/on-screen";
import { PRESENCE_KINDS, kindDef, presenceKind, type PresenceKind } from "@/lib/presence";
import { PresenceMark } from "./PresenceMark";

export interface PersonDetail {
  id: string;
  name: string;
  relation: string | null;
  howMet: string | null;
  birthday: string | null;
  notes: string | null;
  kind?: string | null;
  photoId: string | null;
  momentCount: number;
  lastMomentAt: string | null;
}

const RELATIONS = ["Family", "Friend", "Seva", "Teacher", "Colleague", "Neighbour"];

const field = "mt-2 w-full h-12 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80";

/**
 * Add to Presence, or edit: first what it is (a person, food, water, the earth, a thing, an act,
 * something else), then its name and photo. Only a person has a relation, a birthday and how
 * you met. Returns the saved id through onSaved.
 */
export function PersonForm({ open, onClose, person, onSaved }: { open: boolean; onClose: () => void; person?: PersonDetail | null; onSaved?: (id: string) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<PresenceKind>("person");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [howMet, setHowMet] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const openKey = open ? person?.id ?? "new" : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey) {
      setKind(presenceKind(person?.kind));
      setName(person?.name ?? "");
      setRelation(person?.relation ?? "");
      setHowMet(person?.howMet ?? "");
      setBirthday(person?.birthday ?? "");
      setNotes(person?.notes ?? "");
      setPhoto(null);
      setSaving(false);
    }
  }

  async function save() {
    if (!name.trim() || !me) return;
    setSaving(true);
    try {
      let photoId: string | undefined;
      if (photo) photoId = (await uploadMedia(photo.blob, "photo", { userId: me.id, storage: me.storage, thumbnail: false })).id;
      const isPerson = kind === "person";
      const saved = await savePerson(person ?? null, {
        name: name.trim(),
        // Only a person has these.
        relation: isPerson ? relation.trim() || null : null,
        howMet: isPerson ? howMet.trim() || null : null,
        birthday: isPerson ? birthday || null : null,
        notes: notes.trim() || null,
        kind: isPerson ? null : kind,
        ...(photoId ? { photoId } : {}),
      });
      if (saved.queued) {
        // Offline: show them now; they're saved when the connection is back.
        onScreen.person({ id: saved.id, name: name.trim(), relation: kind === "person" ? relation.trim() || null : null, kind: kind === "person" ? null : kind, photoId: photoId ?? person?.photoId ?? null, momentCount: 0, lastMomentAt: null });
      } else {
        void Promise.all([qc.invalidateQueries({ queryKey: ["people"] }), qc.invalidateQueries({ queryKey: ["person"] })]);
      }
      toast(person ? "Saved" : `${name.trim()} added`, "success", 1800);
      onSaved?.(saved.id);
      onClose();
    } catch {
      toast("Couldn't save. Please try again.", "error");
      setSaving(false);
    }
  }

  const preview = photo?.url ?? null;

  return (
    <Sheet
      open={open}
      onClose={() => !saving && onClose()}
      title={person ? "Edit" : "Add to Presence"}
      busy={saving}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>{person ? "Save" : "Add"}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="What is it?">
          <span className="font-ui text-[13px] font-semibold text-ink">What is it?</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESENCE_KINDS.map((k) => {
              const on = kind === k.key;
              return (
                <button
                  key={k.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={k.hint}
                  onClick={() => setKind(k.key)}
                  className={`press inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full font-ui text-[13px] font-semibold border transition-colors ${on ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink"}`}
                >
                  <PresenceMark kind={k.key} size={17} />
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="press relative rounded-full" aria-label="Choose a photo">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <PersonAvatar person={{ name: name || "?", photoId: person?.photoId ?? null, kind }} size={80} />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-8 h-8 rounded-full bg-accent text-bg border-[3px] border-bg">
              <MomentGlyph kind="photo" size={16} />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setPicked(f); }} />
          <PhotoCropper file={picked} onCancel={() => setPicked(null)} onDone={(blob) => { setPicked(null); setPhoto({ blob, url: URL.createObjectURL(blob) }); }} />
          <label className="flex-1">
            <span className="font-ui text-[13px] font-semibold text-ink">Name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} className={field} placeholder={kindDef(kind).example} />
          </label>
        </div>

        {kind === "person" && (
        <>
        <div>
          <span className="font-ui text-[13px] font-semibold text-ink">Who they are to you</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RELATIONS.map((r) => (
              <button key={r} type="button" aria-pressed={relation === r} onClick={() => setRelation(relation === r ? "" : r)} className={`press h-9 px-3.5 rounded-full font-ui text-[13px] font-semibold border transition-colors ${relation === r ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink"}`}>
                {r}
              </button>
            ))}
          </div>
          <input value={RELATIONS.includes(relation) ? "" : relation} onChange={(e) => setRelation(e.target.value.slice(0, 60))} placeholder="Or in your own words" className={field} aria-label="Relation in your own words" />
        </div>

        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">How you met <span className="font-normal text-ink-soft">(optional)</span></span>
          <input value={howMet} onChange={(e) => setHowMet(e.target.value.slice(0, 300))} placeholder="e.g. Volunteering at Mahashivratri 2024" className={field} />
        </label>

        <div>
          <span className="font-ui text-[13px] font-semibold text-ink">Birthday <span className="font-normal text-ink-soft">(optional)</span></span>
          <div className="mt-2"><DateField label="Birthday" value={birthday} max={today()} clearable placeholder="Add their birthday" onChange={setBirthday} /></div>
        </div>
        </>
        )}

        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">Notes <span className="font-normal text-ink-soft">(optional)</span></span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} rows={4} placeholder={kind === "person" ? "Anything you want to remember about them" : "Anything you want to remember"} className="mt-2 w-full px-4 py-3 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] leading-[1.55] outline-none border border-transparent focus:border-accent resize-none placeholder:text-ink-soft/80" />
        </label>
      </div>
    </Sheet>
  );
}
