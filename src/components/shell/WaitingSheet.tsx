"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { SnakeLoader } from "@/components/ui/Loader";
import { Glyph } from "@/components/art/Glyphs";
import { DoneMark } from "@/components/art/PenMarks";
import { flush, useSendProgress } from "@/lib/outbox";
import { useOnline } from "@/lib/online";
import { formatBytes, giveUp, openWaiting, summarise, tryAgain, useWaiting, useWaitingOpen, type WaitingItem } from "@/lib/waiting";
import { cn } from "@/lib/utils";
import { RING_PATH } from "./SyncMark";

/**
 * Everything kept on this phone that hasn't reached the journal yet: what it is, how far the
 * send has got (by size, so a video counts for more than a tick), and anything the journal
 * turned down, to try again or remove. Opens from the saving pill, the quiet dot and Settings.
 */
export function WaitingSheet() {
  const open = useWaitingOpen();
  return (
    <Sheet open={open} onClose={() => openWaiting(false)} title="Waiting to send">
      {open && <WaitingList />}
    </Sheet>
  );
}

function WaitingList() {
  const { items, going, refused } = useWaiting();
  const progress = useSendProgress();
  const online = useOnline();
  const [sending, setSending] = useState(false);

  if (!items.length) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-8">
        <DoneMark size={34} className="text-accent ana-draw-in" />
        <p className="font-serif text-[17px] text-ink">Everything&rsquo;s in your journal.</p>
        <p className="font-ui text-[13px] text-ink-soft">Nothing is waiting on this phone.</p>
      </div>
    );
  }

  const pct = progress && progress.total ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;
  const current = progress?.current ? items.find((i) => i.key === progress.current) : undefined;

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="flex items-center gap-3.5">
        {progress ? (
          <SnakeLoader size={34} />
        ) : (
          <span className="grid place-items-center w-[34px] h-[43px] text-ink-soft">
            <Glyph k={online ? "sync" : "offline"} size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[15px] font-semibold text-ink">{going.length ? summarise(going) : "Nothing else waiting"}</p>
          <p className="font-ui text-[13px] text-ink-soft mt-0.5">
            {progress
              ? `Sending · ${pct}%`
              : !online
                ? "Kept on your phone. It goes as soon as you're back online."
                : going.length
                  ? "Ready to send."
                  : `${refused.length} turned down by the journal`}
          </p>
        </div>
      </div>

      {progress && (
        <div aria-hidden="true">
          <div className="h-[3px] rounded-full bg-line overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 font-ui text-[12px] text-ink-soft tabular">
            {formatBytes(Math.round(progress.done))} of {formatBytes(progress.total)}
            {current && ` · ${current.label}`}
          </p>
        </div>
      )}

      <ul className="flex flex-col -mx-1" aria-label="Waiting">
        {items.map((item) => (
          <Row key={item.key} item={item} pct={progress?.current === item.key ? progress.currentPct : null} />
        ))}
      </ul>

      {online && !progress && going.length > 0 && (
        <button
          type="button"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            await flush().catch(() => {});
            setSending(false);
          }}
          className="press self-start h-10 px-4 rounded-[12px] bg-accent text-bg font-ui text-[14px] font-semibold disabled:opacity-60"
        >
          Send now
        </button>
      )}
    </div>
  );
}

function Row({ item, pct }: { item: WaitingItem; pct: number | null }) {
  const [busy, setBusy] = useState(false);
  const act = (fn: (i: WaitingItem) => Promise<void>) => async () => {
    setBusy(true);
    await fn(item).catch(() => {});
    setBusy(false);
  };
  return (
    <li className="flex items-start gap-3 px-1 py-2.5 border-b border-line last:border-0">
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" aria-hidden="true" className={cn("mt-[3px] shrink-0", item.refused ? "text-danger" : "text-ink-soft")}>
        <path d={RING_PATH} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-ui text-[14px] text-ink truncate">{item.label}</span>
          {item.count > 1 && <span className="font-ui text-[12px] text-ink-soft tabular">×{item.count}</span>}
          <span className="ml-auto font-ui text-[12px] text-ink-soft tabular whitespace-nowrap">
            {pct !== null ? (item.file ? `Uploading · ${pct}%` : "Sending…") : item.file ? formatBytes(item.bytes) : ""}
          </span>
        </div>
        {item.refused && (
          <>
            <p className="font-ui text-[12.5px] text-danger mt-0.5">{item.refused}</p>
            <div className="flex gap-2 mt-2">
              <button type="button" disabled={busy} onClick={act(tryAgain)} className="press h-8 px-3 rounded-[10px] bg-accent-soft text-accent font-ui text-[13px] font-semibold disabled:opacity-60">
                Try again
              </button>
              <button type="button" disabled={busy} onClick={act(giveUp)} className="press h-8 px-3 rounded-[10px] text-ink-soft hover:bg-surface font-ui text-[13px] font-semibold disabled:opacity-60">
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
