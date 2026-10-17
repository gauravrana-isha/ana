import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { streamStored } from "@/lib/storage";

/**
 * Serves a stored file to its owner only. Supports Range so audio and video can seek.
 * `?v=thumb` serves a photo's small copy when it has one (else the photo itself).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "APPROVED") return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  if (!/^[a-z0-9]{8,40}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const file = await db.attachment.findFirst({
    where: { id, userId: user.id },
    select: { storage: true, pathname: true, contentType: true, size: true, thumbPathname: true, thumbSize: true },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });
  const thumb = req.nextUrl.searchParams.get("v") === "thumb" && file.thumbPathname && file.thumbSize !== null;
  return streamStored(thumb ? { ...file, pathname: file.thumbPathname!, size: file.thumbSize! } : file, req.headers.get("range"));
}
