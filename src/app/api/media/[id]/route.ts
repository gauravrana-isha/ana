import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { presignR2Get, streamStored } from "@/lib/storage";

/**
 * Serves a stored file to its owner only. Supports Range so audio and video can seek.
 * `?v=thumb` serves a photo's small copy when it has one (else the photo itself).
 * `?link=1` answers instead with a short-lived link to fetch the file straight from storage
 * (`{ url }`, or `{ url: null }` when it isn't in R2), so its bytes skip the app's server.
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
  const chosen = thumb ? { ...file, pathname: file.thumbPathname!, size: file.thumbSize! } : file;
  if (req.nextUrl.searchParams.has("link")) {
    const url = chosen.storage === "r2" ? await presignR2Get(chosen.pathname, chosen.contentType) : null;
    return NextResponse.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return streamStored(chosen, req.headers.get("range"));
}
