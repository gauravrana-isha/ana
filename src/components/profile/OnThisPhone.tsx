"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { lastReadyAt, makeReadyOffline } from "@/lib/offline-ready";
import { PAGES_CACHE, PHOTOS_CACHE } from "@/lib/offline-screens";
import { formatBytes, openWaiting, summarise, useWaiting } from "@/lib/waiting";
import { useOnline } from "@/lib/online";
import { timeAgo } from "@/lib/dates";
import { Glyph } from "@/components/art/Glyphs";
import { ButtonLoader } from "@/components/ui/Loader";
import type { MomentsCopy } from "@/lib/journal";

interface Copy {
  screens: number;
  moments: number;
  people: number;
  photos: number;
  bytes: number | null;
  kept: boolean | null;
  readyAt: number | null;
}

/** What's kept on this device: counted from the journal's copy and the saved screens and photos. */
async function countCopy(qc: ReturnType<typeof useQueryClient>): Promise<Copy> {
  const count = async (name: string) => ("caches" in window ? (await (await caches.open(name)).keys()).length : 0);
  const [screens, photos, estimate, kept] = await Promise.all([
    count(PAGES_CACHE).catch(() => 0),
    count(PHOTOS_CACHE).catch(() => 0),
    navigator.storage?.estimate?.().catch(() => null) ?? null,
    navigator.storage?.persisted?.().catch(() => null) ?? null,
  ]);
  const people = qc.getQueryData<unknown[]>(["people"]);
  return {
    screens,
    moments: qc.getQueryData<MomentsCopy>(["moments", "all"])?.items.length ?? 0,
    people: Array.isArray(people) ? people.length : 0,
    photos,
    bytes: estimate?.usage ?? null,
    kept,
    readyAt: lastReadyAt(),
  };
}

/**
 * Settings → Device → On this phone: what's kept here for offline use (moments, people, photos,
 * screens, space used), when it was last all saved, what's waiting to send, and a button to
 * save everything again now.
 */
export function OnThisPhone() {
  const qc = useQueryClient();
  const online = useOnline();
  const { items } = useWaiting();
  const [copy, setCopy] = useState<Copy | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => void countCopy(qc).then(setCopy), [qc]);
  useEffect(refresh, [refresh]);

  async function saveNow() {
    setSaving(true);
    setNote(null);
    const ok = await makeReadyOffline(qc, { force: true });
    setSaving(false);
    setNote(ok ? "Everything is saved on this phone." : "Couldn't save everything just now. Try again in a moment.");
    refresh();
  }

  const stats: [string, string][] = copy
    ? [
        ["Moments", String(copy.moments)],
        ["Presence", String(copy.people)],
        ["Photos", String(copy.photos)],
        ["Screens", String(copy.screens)],
        ["Space used", copy.bytes === null ? "—" : formatBytes(copy.bytes)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-4" aria-busy={!copy}>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[14px] bg-surface px-3 py-2.5">
            <dt className="font-ui text-[11.5px] text-ink-soft">{label}</dt>
            <dd className="font-display text-[19px] font-semibold text-ink tabular leading-tight mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="font-ui text-[13px] text-ink-soft">
        {copy?.readyAt ? `Everything was last saved ${timeAgo(new Date(copy.readyAt))}.` : "Not all saved for offline use yet."}
        {copy?.kept === true && " Kept for good: the phone won't clear it to make space."}
      </p>

      {items.length > 0 && (
        <button type="button" onClick={() => openWaiting()} className="press flex items-center gap-3 px-3.5 py-3 rounded-[14px] bg-surface border border-line text-left">
          <Glyph k="sync" size={19} className="text-ink-soft shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-ui text-[14px] font-semibold text-ink">Waiting to send</span>
            <span className="block font-ui text-[12.5px] text-ink-soft truncate">{summarise(items)}</span>
          </span>
        </button>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={saveNow}
          disabled={saving || !online}
          className="press inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface font-ui text-[13.5px] font-semibold text-accent hover:bg-surface-2 disabled:opacity-60"
        >
          {saving ? <ButtonLoader /> : <Glyph k="download" size={17} />}
          {saving ? "Saving everything…" : "Save everything now"}
        </button>
        {!online && <span className="font-ui text-[12.5px] text-ink-soft">Needs a connection</span>}
      </div>
      {note && (
        <p role="status" className="font-ui text-[13px] text-ink-soft -mt-1">
          {note}
        </p>
      )}
    </div>
  );
}
