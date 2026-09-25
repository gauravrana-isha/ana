import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { removeStored } from "@/lib/storage";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const a = await db.attachment.findFirst({ where: { id, userId: user.id } });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.attachment.delete({ where: { id } });
  await removeStored(a.storage, a.pathname);
  return NextResponse.json({ ok: true });
}
