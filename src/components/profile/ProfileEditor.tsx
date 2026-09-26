"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, Camera } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/pickers";
import { Avatar } from "@/components/shell/Sidebar";
import { mediaUrl, uploadMedia } from "@/lib/media-client";
import type { Me } from "@/lib/me";
import { today } from "@/lib/dates";

const field =
  "mt-2 w-full h-12 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/70";

/** Everything about you that is yours to change. Only you see it; admins don't. */
export function ProfileEditor({ me, open, onClose }: { me: Me; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [intention, setIntention] = useState("");
  const [birthday, setBirthday] = useState("");
  const [place, setPlace] = useState("");
  // undefined: unchanged · null: back to the Google picture · File: a new photo
  const [photo, setPhoto] = useState<File | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form each time it opens.
  const [openedFor, setOpenedFor] = useState(false);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) {
      setName(me.name ?? "");
      setPreferredName(me.preferredName ?? "");
      setIntention(me.intention ?? "");
      setBirthday(me.birthday ?? "");
      setPlace(me.place ?? "");
      setPhoto(undefined);
      setPreview(null);
      setSaving(false);
    }
  }

  const shownImage = photo === null ? me.image : preview ?? (me.photoId ? mediaUrl(me.photoId) : me.image);

  async function save() {
    if (!name.trim()) return toast("Your name can't be empty.", "error");
    setSaving(true);
    try {
      let photoId: string | null | undefined = undefined;
      if (photo instanceof File) photoId = (await uploadMedia(photo, "photo", { userId: me.id, storage: me.storage })).id;
      else if (photo === null) photoId = null;
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          preferredName: preferredName.trim() || null,
          intention: intention.trim(),
          birthday: birthday || null,
          place: place.trim() || null,
          ...(photoId !== undefined ? { photoId } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't save");
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.refresh(); // the sidebar picture comes from the server
      toast("Profile saved", "success", 1600);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save. Please try again.", "error");
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      busy={saving}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>Save</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="press relative rounded-full" aria-label="Choose a photo">
            <Avatar name={name || me.email || "You"} image={shownImage ?? null} size={76} />
            <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-7 h-7 rounded-full bg-accent text-bg ring-2 ring-bg"><Camera size={14} weight="fill" /></span>
          </button>
          <div className="flex flex-col items-start gap-1">
            <button type="button" onClick={() => fileRef.current?.click()} className="press h-9 px-3 rounded-[11px] font-ui text-[13.5px] font-semibold text-accent hover:bg-accent-soft">
              {me.photoId || preview ? "Change photo" : "Add a photo"}
            </button>
            {(me.photoId || preview) && photo !== null && (
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="press inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] font-ui text-[12.5px] font-semibold text-ink-soft hover:text-ink">
                <ArrowCounterClockwise size={13} /> {me.image ? "Use my Google photo" : "Remove photo"}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 15 * 1024 * 1024) return toast("That photo is too large (up to 15 MB).", "error");
              setPhoto(f);
              setPreview(URL.createObjectURL(f));
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="font-ui text-[13px] font-semibold text-ink">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} className={field} autoComplete="name" />
          </label>
          <label className="block">
            <span className="font-ui text-[13px] font-semibold text-ink">What should ana call you?</span>
            <input value={preferredName} onChange={(e) => setPreferredName(e.target.value.slice(0, 40))} placeholder={name.split(" ")[0] || "A first name"} className={field} />
          </label>
        </div>

        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">Your intention</span>
          <span className="block font-ui text-[12.5px] text-ink-soft mt-0.5">Why you keep this journal, in a line. It sits under your name.</span>
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="To sit every day, whatever the day brings."
            className="mt-2 w-full px-4 py-3 rounded-[14px] bg-surface-2 text-ink font-serif italic text-[17px] leading-[1.55] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/60 resize-none"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="font-ui text-[13px] font-semibold text-ink">Birthday <span className="font-normal text-ink-soft">(optional)</span></span>
            <DateField label="Birthday" value={birthday} max={today()} onChange={setBirthday} clearable placeholder="Add your birthday" className="mt-2" />
          </div>
          <label className="block">
            <span className="font-ui text-[13px] font-semibold text-ink">City or centre <span className="font-normal text-ink-soft">(optional)</span></span>
            <input value={place} onChange={(e) => setPlace(e.target.value.slice(0, 80))} placeholder="e.g. Isha Yoga Center" className={field} />
          </label>
        </div>

        <p className="font-ui text-[12.5px] text-ink-soft">Only you see this. Admins see your name and email, nothing else.</p>
      </div>
    </Sheet>
  );
}
