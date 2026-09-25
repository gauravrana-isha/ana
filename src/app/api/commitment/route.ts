import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { commitmentDue } from "@/lib/commitment";

export const dynamic = "force-dynamic";

const Revisit = z.enum(["monthly", "quarterly", "never"]);

function dto(c: { id: string; body: string; revisit: string; revisitedAt: Date | null; createdAt: Date; supersededAt: Date | null }) {
  return { id: c.id, body: c.body, revisit: c.revisit, revisitedAt: c.revisitedAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString(), supersededAt: c.supersededAt?.toISOString() ?? null };
}

export async function GET() {
  const user = await resolveUser("commitment");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = await db.commitment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const current = all.find((c) => !c.supersededAt) ?? null;
  return NextResponse.json({
    current: current ? dto(current) : null,
    due: current ? commitmentDue(current) : false,
    history: all.filter((c) => c.supersededAt).map(dto),
  });
}

/** Write (or rewrite) the letter. The previous one is kept, marked as superseded. */
export async function POST(req: NextRequest) {
  const user = await resolveUser("commitment");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ body: z.string().trim().min(1).max(8000), revisit: Revisit.default("monthly") }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const now = new Date();
  const [, created] = await db.$transaction([
    db.commitment.updateMany({ where: { userId: user.id, supersededAt: null }, data: { supersededAt: now } }),
    db.commitment.create({ data: { userId: user.id, body: parsed.data.body, revisit: parsed.data.revisit, revisitedAt: now } }),
  ]);
  return NextResponse.json(dto(created), { status: 201 });
}

/** Change how often it comes back, or mark it as read again. */
export async function PATCH(req: NextRequest) {
  const user = await resolveUser("commitment");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ revisit: Revisit.optional(), revisited: z.literal(true).optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await db.commitment.updateMany({
    where: { userId: user.id, supersededAt: null },
    data: { ...(parsed.data.revisit ? { revisit: parsed.data.revisit } : {}), ...(parsed.data.revisited ? { revisitedAt: new Date() } : {}) },
  });
  return NextResponse.json({ ok: true });
}
