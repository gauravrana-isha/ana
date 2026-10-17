import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAdmin } from "@/lib/session";
import { copyBlobToR2, removeAttachmentFiles, storageMode, uploadedSize } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 10;

/** Where new files go, and how many older files are still in the Blob store. */
export async function GET() {
  if (!(await resolveAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ mode: storageMode(), onBlob: await db.attachment.count({ where: { storage: "blob" } }) });
}

/**
 * Move the next batch of files from Blob to R2. Each file is copied as is (still encrypted),
 * the copy's size is confirmed, the record is switched, and only then is the Blob copy
 * deleted. Call again until nothing is left.
 */
export async function POST() {
  if (!(await resolveAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (storageMode() !== "r2") return NextResponse.json({ error: "R2 isn't set up yet." }, { status: 409 });

  const files = await db.attachment.findMany({
    where: { storage: "blob" },
    select: { id: true, pathname: true, contentType: true, sealed: true, thumbPathname: true },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let failed = 0;
  for (const file of files) {
    try {
      const type = file.sealed ? "application/octet-stream" : file.contentType;
      for (const pathname of [file.pathname, file.thumbPathname]) {
        if (!pathname) continue;
        const bytes = await copyBlobToR2(pathname, type);
        if ((await uploadedSize("r2", pathname)) !== bytes) throw new Error("Copy incomplete");
      }
      await db.attachment.update({ where: { id: file.id }, data: { storage: "r2" } });
      await removeAttachmentFiles({ storage: "blob", pathname: file.pathname, thumbPathname: file.thumbPathname });
    } catch {
      failed++;
    }
  }

  const onBlob = await db.attachment.count({ where: { storage: "blob" } });
  return NextResponse.json({ moved: files.length - failed, failed, onBlob });
}
