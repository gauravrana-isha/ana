import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { allowedType, baseType, isMediaKind, storageMode, uploadedSize, userPrefix } from "@/lib/storage";

const Schema = z.object({
  kind: z.string(),
  pathname: z.string().max(300),
  contentType: z.string().max(100),
  durationSec: z.number().min(0).max(60 * 60 * 3).optional(),
  /** Encrypted on the device (always, once the journal has a key). */
  sealed: z.boolean().optional(),
});

/** Record a finished upload. The file must exist and sit in the caller's own folder. */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isMediaKind(parsed.data.kind)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { kind, pathname, contentType, durationSec, sealed } = parsed.data;
  if (user.vaultAt && !sealed) return NextResponse.json({ error: "Files need to be encrypted on your device first." }, { status: 400 });

  if (!pathname.startsWith(`${userPrefix(user.id)}${kind}/`) || pathname.includes("..")) {
    return NextResponse.json({ error: "Wrong folder" }, { status: 403 });
  }
  if (!allowedType(kind, contentType)) return NextResponse.json({ error: "Unsupported type" }, { status: 415 });

  const storage = storageMode();
  const size = await uploadedSize(storage, pathname);
  if (size === null) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  const attachment = await db.attachment.create({
    data: { userId: user.id, kind, storage, pathname, contentType: baseType(contentType), size, durationSec, sealed: !!sealed },
    select: { id: true, kind: true, contentType: true, size: true, durationSec: true },
  });
  return NextResponse.json(attachment, { status: 201 });
}
