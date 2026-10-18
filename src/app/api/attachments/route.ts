import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MEDIA_RULES, allowedType, baseType, isMediaKind, removeStored, roomFor, storageMode, uploadedSize, userPrefix } from "@/lib/storage";

const Schema = z.object({
  /** Chosen on the device, so a moment saved offline can name its files before they're up. */
  id: z.string().regex(/^[a-z0-9]{20,40}$/).optional(),
  kind: z.string(),
  pathname: z.string().max(300),
  contentType: z.string().max(100),
  durationSec: z.number().min(0).max(60 * 60 * 3).optional(),
  /** Encrypted on the device (always, once the journal has a key). */
  sealed: z.boolean().optional(),
  /** Photos: the small copy for lists and grids, uploaded alongside. */
  thumbPathname: z.string().max(300).optional(),
});

/** Record a finished upload. The file must exist and sit in the caller's own folder. */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isMediaKind(parsed.data.kind)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { id, kind, pathname, contentType, durationSec, sealed, thumbPathname } = parsed.data;
  // Sent again (a connection that dropped after the first try): it's already recorded.
  if (id) {
    const done = await db.attachment.findFirst({ where: { id, userId: user.id }, select: { id: true, kind: true, contentType: true, size: true, durationSec: true } });
    if (done) return NextResponse.json(done, { status: 200 });
  }
  if (user.vaultAt && !sealed) return NextResponse.json({ error: "Files need to be encrypted on your device first." }, { status: 400 });

  const inFolder = (p: string) => p.startsWith(`${userPrefix(user.id)}${kind}/`) && !p.includes("..");
  if (!inFolder(pathname) || (thumbPathname && (kind !== "photo" || !inFolder(thumbPathname)))) {
    return NextResponse.json({ error: "Wrong folder" }, { status: 403 });
  }
  if (!allowedType(kind, contentType)) return NextResponse.json({ error: "Unsupported type" }, { status: 415 });

  const storage = storageMode();
  // Both files and the room left, checked at once (each is a round trip).
  const [size, thumbSize, room] = await Promise.all([
    uploadedSize(storage, pathname),
    thumbPathname ? uploadedSize(storage, thumbPathname) : null,
    roomFor(user.id),
  ]);
  if (size === null) return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  // A signed R2 link can't limit the size, so check it here.
  if (storage === "r2" && (size > MEDIA_RULES[kind].maxBytes || size > room)) {
    await removeStored(storage, pathname);
    return NextResponse.json({ error: "That file is too large for the space left." }, { status: 413 });
  }

  const attachment = await db.attachment.create({
    data: {
      ...(id ? { id } : {}),
      userId: user.id, kind, storage, pathname, contentType: baseType(contentType), size, durationSec, sealed: !!sealed,
      // A small copy that didn't arrive is simply left out; lists fall back to the full photo.
      ...(thumbPathname && thumbSize !== null ? { thumbPathname, thumbSize } : {}),
    },
    select: { id: true, kind: true, contentType: true, size: true, durationSec: true },
  });
  return NextResponse.json(attachment, { status: 201 });
}
