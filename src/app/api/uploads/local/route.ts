import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/session";
import { MEDIA_RULES, USER_QUOTA_BYTES, allowedType, baseType, bytesUsed, isMediaKind, newPathname, storageMode, writeLocal } from "@/lib/storage";

/** Development only: store uploads on disk when there is no Blob token. */
export async function POST(req: NextRequest) {
  if (storageMode() !== "local") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const kind = form.get("kind");
  const file = form.get("file");
  if (!isMediaKind(kind) || !(file instanceof File)) return NextResponse.json({ error: "Bad upload" }, { status: 400 });
  if (!allowedType(kind, file.type)) return NextResponse.json({ error: "That file type isn't supported" }, { status: 415 });
  if (file.size > MEDIA_RULES[kind].maxBytes) return NextResponse.json({ error: `Files up to ${MEDIA_RULES[kind].label}` }, { status: 413 });
  if ((await bytesUsed(user.id)) + file.size > USER_QUOTA_BYTES) return NextResponse.json({ error: "Storage is full" }, { status: 413 });

  const pathname = newPathname(user.id, kind, file.type);
  await writeLocal(pathname, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ pathname, contentType: baseType(file.type) });
}
