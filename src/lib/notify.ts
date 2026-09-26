import "server-only";
import { db } from "./db";
import { sendToUser } from "./push";

/*
 * One place to tell someone something: it lands in their bell and, if they turned
 * notifications on, as a push. Each notification has a key so the same thing is never
 * announced twice, and an end: `expiresAt`, a week after it's read, or when resolved.
 */

export type NotificationKind = "moment" | "commitment" | "birthday" | "approval" | "portrait";

const DAY = 24 * 60 * 60 * 1000;
/** Read notifications stay this long, then go. */
export const READ_KEEP_MS = 7 * DAY;
/** Unread ones end after this unless their kind says otherwise. */
export const DEFAULT_LIFE_MS = 30 * DAY;

export async function notify(n: {
  userId: string;
  kind: NotificationKind;
  key: string;
  title: string;
  body: string;
  url: string;
  expiresAt?: Date;
  push?: boolean;
}) {
  const created = await db.notification
    .create({
      data: {
        userId: n.userId,
        kind: n.kind,
        key: n.key,
        title: n.title,
        body: n.body,
        url: n.url,
        expiresAt: n.expiresAt ?? new Date(Date.now() + DEFAULT_LIFE_MS),
      },
    })
    .catch((e: { code?: string }) => {
      if (e.code === "P2002") return null; // already announced
      throw e;
    });
  if (!created) return null;
  if (n.push !== false) {
    await sendToUser(n.userId, { title: n.title, body: n.body, url: n.url, tag: n.key, id: created.id });
  }
  return created;
}

/** Something was dealt with (approved, letter read): its notifications go, for everyone who had them. */
export async function resolveNotifications(keyPrefix: string, userId?: string) {
  await db.notification.deleteMany({ where: { key: { startsWith: keyPrefix }, ...(userId ? { userId } : {}) } });
}

/** Tell every admin that someone finished onboarding and is waiting. */
export async function notifyAdminsOfPending(person: { id: string; name: string | null; email: string | null }) {
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "APPROVED" }, select: { id: true } });
  const who = person.name || person.email || "Someone";
  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.id,
        kind: "approval",
        key: `approval:${person.id}`,
        title: "Waiting for approval",
        body: `${who} has joined and is waiting for you to let them in.`,
        url: "/admin",
      })
    )
  );
}

/** Drop what has ended. Run from the scheduled job. */
export async function sweepNotifications(now = new Date()) {
  const r = await db.notification.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { readAt: { lt: new Date(now.getTime() - READ_KEEP_MS) } }] },
  });
  return r.count;
}
