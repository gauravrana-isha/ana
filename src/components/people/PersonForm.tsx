"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/lib/me";
import { uploadMedia } from "@/lib/media-client";
import { PersonAvatar } from "./People";
import { DateField } from "@/components/ui/pickers";
import { today } from "@/lib/dates";

export interface PersonDetail {
  id: string;
  name: string;
  relation: string | null;
  howMet: string | null;
  birthday: string | null;
  notes: string | null;
  photoId: string | null;
  momentCount: number;
  lastMomentAt: string | null;
}

const RELATIONS = ["Family", "Friend", "Seva", "Teacher", "Colleague", "Neighbour"];

const field = "mt-2 w-full h-12 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80";

/** Add or edit a person. Returns the saved id through onSaved. */
export function PersonForm({ open, onClose, person, onSaved }: { open: boolean; onClose: () => void; person?: PersonDetail | null; onSaved?: (id: string) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [howMet, setHowMet] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const openKey = open ? person?.id ?? "new" : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey) {
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
      if (photo) photoId = (await uploadMedia(photo.blob, "photo", { userId: me.id, storage: me.storage })).id;
      const body = {
        name: name.trim(),
        relation: relation.trim() || null,
        howMet: howMet.trim() || null,
        birthday: birthday || null,
        notes: notes.trim() || null,
        ...(photoId ? { photoId } : {}),
      };
      const res = await fetch(person ? `/api/people/${person.id}` : "/api/people", {
        method: person ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const saved = person ? { id: person.id } : await res.json();
      await Promise.all([qc.invalidateQueries({ queryKey: ["people"] }), qc.invalidateQueries({ queryKey: ["person"] })]);
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
      title={person ? "Edit person" : "Add a person"}
      busy={saving}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>{person ? "Save" : "Add"}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="press relative rounded-full" aria-label="Choose a photo">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <PersonAvatar person={{ name: name || "?", photoId: person?.photoId ?? null }} size={80} />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-8 h-8 rounded-full bg-accent text-bg border-[3px] border-bg">
              <Camera size={14} weight="fill" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setPhoto({ blob: f, url: URL.createObjectURL(f) }); }} />
          <label className="flex-1">
            <span className="font-ui text-[13px] font-semibold text-ink">Name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} className={field} placeholder="Their name" />
          </label>
        </div>

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

        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">Notes <span className="font-normal text-ink-soft">(optional)</span></span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} rows={4} placeholder="Anything you want to remember about them" className="mt-2 w-full px-4 py-3 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] leading-[1.55] outline-none border border-transparent focus:border-accent resize-none placeholder:text-ink-soft/80" />
        </label>
      </div>
    </Sheet>
  );
}
