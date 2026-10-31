import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, resolveAdmin } from "@/lib/session";
import { allow } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/*
 * Errors from the app, for admins to see what went wrong where. Only technical details
 * (what failed, where, which browser); never anything written in a journal.
 */

const Report = z.object({
  source: z.string().max(60),
  message: z.string().max(2000),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300).optional(),
  digest: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const who = user?.id ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!(await allow(`errors:${who}`, 20))) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = Report.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const ua = req.headers.get("user-agent")?.slice(0, 200);
  await db.errorLog.create({ data: { ...parsed.data, message: ua ? `${parsed.data.message} · ${ua}` : parsed.data.message, userId: user?.id ?? null } });
  return NextResponse.json({ ok: true });
}

/** The latest errors, for admins. */
export async function GET() {
  if (!(await resolveAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.errorLog.findMany({ orderBy: { at: "desc" }, take: 100 });
  return NextResponse.json(rows);
}

/** Clear the list (admins), once what's in it has been looked at. */
export async function DELETE() {
  if (!(await resolveAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.errorLog.deleteMany({});
  return NextResponse.json({ ok: true });
}
