import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveUser } from "@/lib/session";
import { allow } from "@/lib/ratelimit";
import { MEDIA_RULES, allowedType, isMediaKind, newPathname, presignR2Put, roomFor, storageMode } from "@/lib/storage";

const Schema = z.object({
  kind: z.string(),
  contentType: z.string().max(100),
  size: z.number().int().min(1),
  replacing: z.string().max(40).optional(),
});

/**
 * A short-lived link for the browser to upload one file straight to the private R2 bucket
 * (big videos never pass through our server). Only approved people, only their own folder,
 * only allowed types and sizes, and never past their quota; the size is checked again when
 * the upload is recorded.
 */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user || !(user.effective.includes("expressions") || user.effective.includes("people"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (storageMode() !== "r2") return NextResponse.json({ error: "Not available" }, { status: 409 });
  if (!(await allow(`upload:${user.id}`, 60))) return NextResponse.json({ error: "Too many uploads at once. Wait a minute and try again." }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isMediaKind(parsed.data.kind)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { kind, contentType, size, replacing } = parsed.data;
  if (!allowedType(kind, contentType)) return NextResponse.json({ error: "Unsupported type" }, { status: 415 });

  if (size > MEDIA_RULES[kind].maxBytes) return NextResponse.json({ error: `That file is too large (up to ${MEDIA_RULES[kind].label}).` }, { status: 413 });
  if (size > (await roomFor(user.id, replacing ?? null))) return NextResponse.json({ error: "Storage is full for this account" }, { status: 413 });

  const pathname = newPathname(user.id, kind, contentType);
  return NextResponse.json({ url: await presignR2Put(pathname), pathname });
}
