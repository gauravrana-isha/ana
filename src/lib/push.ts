import "server-only";
import webpush from "web-push";
import { db } from "./db";

/*
 * Web Push. Keys come from the environment (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, generated
 * once with `npx web-push generate-vapid-keys`). Without them, push is simply off: nothing
 * is sent and the app carries on as before.
 */

export interface PushMessage {
  title: string;
  body: string;
  /** Where tapping the notification opens. */
  url: string;
  /** Notifications with the same tag replace each other instead of piling up. */
  tag?: string;
  /** The bell notification this push belongs to, so opening it marks that one read. */
  id?: string;
}

let configured: boolean | null = null;

export function pushConfigured() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@anasadh.vercel.app", pub, priv);
  return (configured = true);
}

/** Send to every device a person has subscribed. Dead subscriptions are removed. Returns how many got it. */
export async function sendToUser(userId: string, msg: PushMessage) {
  if (!pushConfigured()) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  let delivered = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(msg),
          { TTL: 60 * 60 * 24, urgency: "normal" }
        );
        delivered++;
        await db.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: new Date() } }).catch(() => {});
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped this subscription. Anything else: try again next time.
        if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("push failed", code ?? e);
      }
    })
  );
  return delivered;
}

/** Wall-clock parts of `date` in a time zone (falls back to UTC for unknown zones). */
export function zonedParts(date: Date, timeZone: string | null | undefined) {
  let tz = timeZone || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23" })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) };
}
