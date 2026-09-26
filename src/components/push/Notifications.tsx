"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { usePush, type PushState } from "@/lib/push-client";
import { cn } from "@/lib/utils";
import { BellDrawing as FeatureGlyphDrawing } from "@/components/art/FeatureBadge";

/** A bell in the feature-badge style (pastel tile, one ink stroke). */
export function BellBadge({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0 feature-badge", className)}
      style={{ ["--fb-tile" as string]: "#FBE3CC", ["--fb-ink" as string]: "#B55A24" }}
    >
      <rect width="48" height="48" rx="13" fill="var(--fb-tile-now)" />
      <g stroke="var(--fb-ink-now)" strokeWidth={2.4}>
        <FeatureGlyphDrawing />
      </g>
    </svg>
  );
}

const EXPLAIN: Record<Exclude<PushState, "loading" | "on" | "off">, string> = {
  unsupported: "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari.",
  "needs-install": "On iPhone and iPad, add ana to your Home Screen first (Share → Add to Home Screen), then turn this on from there.",
  unconfigured: "Notifications aren't set up on the server yet.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then come back here.",
};

/** Profile section: notifications on this device, with a test button. */
export function NotificationSettings() {
  const { toast } = useToast();
  const push = usePush();
  const [testing, setTesting] = useState(false);
  const on = push.state === "on";
  const available = push.state === "on" || push.state === "off";

  async function toggle(next: boolean) {
    try {
      if (next) {
        const ok = await push.enable();
        if (ok) toast("Notifications are on for this device", "success", 2000);
      } else {
        await push.disable();
        toast("Notifications are off for this device", "success", 2000);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't change notifications", "error");
    }
  }

  async function test() {
    setTesting(true);
    const n = await push.test().catch(() => 0);
    setTesting(false);
    if (!n) toast("Couldn't reach this device. Try turning notifications off and on.", "error");
  }

  return (
    <section>
      <h2 className="font-display text-[19px] font-semibold text-ink mb-3">Notifications</h2>
      <div className="rounded-[18px] bg-surface">
        <label className={cn("flex items-center gap-3.5 px-4 py-3.5", available ? "cursor-pointer" : "opacity-80")}>
          <BellBadge />
          <span className="flex-1 min-w-0">
            <span className="block font-ui text-[14.5px] font-semibold text-ink">On this device</span>
            <span className="block font-ui text-[13px] leading-[1.45] text-ink-soft mt-0.5">
              {push.state in EXPLAIN
                ? EXPLAIN[push.state as keyof typeof EXPLAIN]
                : "Gentle reminders when something comes back to you."}
            </span>
          </span>
          {available && <Switch checked={on} busy={push.busy} disabled={push.busy} onChange={toggle} label="Notifications on this device" />}
        </label>
        {on && (
          <div className="border-t border-line px-4 py-2.5 flex justify-end">
            <button type="button" onClick={test} disabled={testing} className="press h-9 px-3 rounded-[11px] font-ui text-[13px] font-semibold text-accent hover:bg-accent-soft disabled:opacity-60">
              {testing ? "Sending…" : "Send a test"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * A quiet line under "Bring it back to me": offers to turn notifications on when a reminder
 * has been chosen, or says that it will arrive.
 */
export function NotifyNudge({ show, what = "it comes back" }: { show: boolean; what?: string }) {
  const { toast } = useToast();
  const push = usePush();
  if (!show || push.state === "loading" || push.state === "unsupported" || push.state === "unconfigured") return null;

  if (push.state === "on") {
    return <p className="mt-2 font-ui text-[12.5px] text-ink-soft">You&rsquo;ll get a notification on this device when {what}.</p>;
  }
  if (push.state === "denied" || push.state === "needs-install") {
    return (
      <p className="mt-2 font-ui text-[12.5px] text-ink-soft">
        It will be waiting on Today.{" "}
        {push.state === "denied" ? "Notifications are blocked for this site in your browser." : "On iPhone, add ana to your Home Screen to get a notification too."}
      </p>
    );
  }
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[14px] bg-surface px-3.5 py-2.5">
      <BellBadge size={28} />
      <span className="flex-1 min-w-[180px] font-ui text-[13px] text-ink-soft">Get a notification when {what}?</span>
      <button
        type="button"
        disabled={push.busy}
        onClick={() =>
          push.enable().then(
            (ok) => ok && toast("Notifications are on for this device", "success", 2000),
            (e) => toast(e instanceof Error ? e.message : "Couldn't turn on notifications", "error")
          )
        }
        className="press h-8 px-3 rounded-full bg-accent text-bg font-ui text-[12.5px] font-semibold disabled:opacity-60"
      >
        {push.busy ? "Turning on…" : "Turn on"}
      </button>
    </div>
  );
}
