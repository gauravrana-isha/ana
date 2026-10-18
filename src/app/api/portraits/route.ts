import { NextRequest, NextResponse, after } from "next/server";
import { remindersChanged } from "@/lib/reminder-plan";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { resolveNotifications } from "@/lib/notify";
import { MAX_WORDS, type PortraitDTO } from "@/lib/portrait";
import { MUST_SEAL, sealed } from "@/lib/sealed";

type Row = { id: string; bodyWords: string[]; bodyNote: string | null; mindWords: string[]; mindNote: string | null; emotionWords: string[]; emotionNote: string | null; weights: unknown; createdAt: Date };

function dto(p: Row): PortraitDTO {
  return {
    id: p.id,
    body: { words: p.bodyWords, note: p.bodyNote },
    mind: { words: p.mindWords, note: p.mindNote },
    emotion: { words: p.emotionWords, note: p.emotionNote },
    // Sealed on the device; opened into the word weights there.
    weights: ((p.weights ?? {}) as PortraitDTO["weights"]),
    createdAt: p.createdAt.toISOString(),
  };
}

// Each word, each ring's line and the weights arrive sealed.
const Ring = z.object({ words: z.array(sealed(400)).max(MAX_WORDS), note: sealed(2_000).nullable().optional() });
const Create = z.object({ body: Ring, mind: Ring, emotion: Ring, weights: sealed(4_000).optional() });

/** Your portraits, newest first. */
export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.portrait.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });
  return NextResponse.json(rows.map(dto));
}

/** Keep a new portrait. Earlier ones stay. */
export async function POST(req: NextRequest) {
  // Reminders may have moved: the reminder job looks again on its next run.
  after(remindersChanged);
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });
  const { body, mind, emotion, weights } = parsed.data;
  if (![body, mind, emotion].some((r) => r.words.length || r.note)) {
    return NextResponse.json({ error: "Choose a word or write a line for at least one ring" }, { status: 400 });
  }
  const row = await db.portrait.create({
    data: {
      userId: user.id,
      bodyWords: body.words, bodyNote: body.note || null,
      mindWords: mind.words, mindNote: mind.note || null,
      emotionWords: emotion.words, emotionNote: emotion.note || null,
      ...(weights ? { weights } : {}),
    },
  });
  await resolveNotifications("portrait:", user.id);
  return NextResponse.json(dto(row), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  // Reminders may have moved: the reminder job looks again on its next run.
  after(remindersChanged);
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ id: z.string().max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await db.portrait.deleteMany({ where: { id: parsed.data.id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
