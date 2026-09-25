import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { streamStored } from "@/lib/storage";

/** Serves a stored file to its owner only. Supports Range so audio and video can seek. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "APPROVED") return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  const file = await db.attachment.findFirst({
    where: { id, userId: user.id },
    select: { storage: true, pathname: true, contentType: true, size: true },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });
  return streamStored(file, req.headers.get("range"));
}
