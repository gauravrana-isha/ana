import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/session";
import { MEDIA_RULES, SEALED_TYPE, allowedType, baseType, isMediaKind, newPathname, roomFor, storageMode, writeLocal } from "@/lib/storage";

/** Development only: store uploads on disk when there is no Blob token. */
export async function POST(req: NextRequest) {
  if (storageMode() !== "local") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const kind = form.get("kind");
  const file = form.get("file");
  // Encrypted files come as opaque bytes, with their real type alongside.
  const type = String(form.get("type") ?? (file instanceof File ? file.type : ""));
  const replacing = form.get("replacing");
  if (!isMediaKind(kind) || !(file instanceof File)) return NextResponse.json({ error: "Bad upload" }, { status: 400 });
  if (!allowedType(kind, type) || (file.type !== SEALED_TYPE && baseType(file.type) !== baseType(type))) return NextResponse.json({ error: "That file type isn't supported" }, { status: 415 });
  if (file.size > MEDIA_RULES[kind].maxBytes) return NextResponse.json({ error: `Files up to ${MEDIA_RULES[kind].label}` }, { status: 413 });
  if (file.size > (await roomFor(user.id, typeof replacing === "string" ? replacing : null))) return NextResponse.json({ error: "Storage is full" }, { status: 413 });

  const pathname = newPathname(user.id, kind, type);
  await writeLocal(pathname, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ pathname, contentType: baseType(type) });
}
