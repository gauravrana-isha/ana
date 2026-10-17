import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { sealed } from "./sealed";

/** What the client gets for a moment: its people (with photo ids) and its media. */
export const momentInclude = {
  people: { include: { person: { select: { id: true, name: true, photoId: true } } } },
  attachments: {
    select: { id: true, kind: true, contentType: true, size: true, durationSec: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ExpressionInclude;

type Row = Prisma.ExpressionGetPayload<{ include: typeof momentInclude }>;

export function serializeMoment(m: Row) {
  return {
    id: m.id,
    title: m.title,
    kind: m.kind,
    body: m.body,
    place: m.place,
    // Sealed on the device (a string the client opens into the list).
    stamps: (m.stamps as string | string[] | null) ?? [],
    lookBackOn: m.lookBackOn?.toISOString().slice(0, 10) ?? null,
    lookBackAt: m.lookBackAt?.toISOString() ?? null,
    // Older entries only had a date; show them at noon so they sort sensibly.
    occurredAt: (m.occurredAt ?? new Date(m.date.toISOString().slice(0, 10) + "T12:00:00")).toISOString(),
    hasTime: !!m.occurredAt,
    people: m.people.map((p) => p.person),
    attachments: m.attachments,
    createdAt: m.createdAt.toISOString(),
  };
}

export type MomentDTO = ReturnType<typeof serializeMoment>;

/** A moment as the device sends it: words, place and stamps sealed; times and links plain. */
export const MomentSchema = z.object({
  /** Made on the device, so a save retried after a dropped connection isn't doubled. */
  id: z.string().regex(/^[a-z0-9]{20,40}$/).optional(),
  title: sealed(4_000),
  kind: z.enum(["writing", "moment", "audio", "video", "photo"]),
  body: sealed(200_000),
  occurredAt: z.string().datetime({ offset: true }),
  place: sealed(2_000).optional().nullable(),
  stamps: sealed(2_000),
  lookBackOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  /** The exact time to bring it back; `lookBackOn` is its date where the person is. */
  lookBackAt: z.string().datetime({ offset: true }).optional().nullable(),
  personIds: z.array(z.string()).max(30).default([]),
  attachmentIds: z.array(z.string()).max(12).default([]),
});

/** Keep only ids that belong to this user. */
export async function ownedIds(userId: string, personIds: string[], attachmentIds: string[]) {
  const [people, attachments] = await Promise.all([
    personIds.length ? db.person.findMany({ where: { userId, id: { in: personIds } }, select: { id: true } }) : [],
    attachmentIds.length ? db.attachment.findMany({ where: { userId, id: { in: attachmentIds } }, select: { id: true } }) : [],
  ]);
  return { people: people.map((p) => p.id), attachments: attachments.map((a) => a.id) };
}


/** Look-back fields to store. A new time clears "sent", so a moved reminder goes out again. */
export function lookBackData(d: { lookBackOn?: string | null; lookBackAt?: string | null }, previous?: { lookBackAt: Date | null } | null) {
  const at = d.lookBackAt ? new Date(d.lookBackAt) : null;
  const on = d.lookBackOn ? new Date(d.lookBackOn) : at ? new Date(at.toISOString().slice(0, 10)) : null;
  const moved = (previous?.lookBackAt?.getTime() ?? null) !== (at?.getTime() ?? null);
  return { lookBackOn: on, lookBackAt: at, ...(moved || !previous ? { lookBackSentAt: null } : {}) };
}
