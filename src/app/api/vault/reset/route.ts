import { allow } from "@/lib/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { removeAttachmentFiles } from "@/lib/storage";
import { RESET_WORDS } from "@/lib/vault/start-over";

export const dynamic = "force-dynamic";

/**
 * Start over: for someone who has lost every way to unlock their journal. Without the key nothing
 * in it can be read again, so everything sealed with it is deleted (practices and their logs,
 * reflections, sankalpa, moments, people, files), with every key and passkey; the account stays,
 * and a new key is set up next.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await allow(`vault-reset:${user.id}`, 3))) return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  const parsed = z.object({ confirm: z.string().max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirm.trim().toLowerCase() !== RESET_WORDS) return NextResponse.json({ error: `Type “${RESET_WORDS}” to confirm.` }, { status: 400 });

  const userId = user.id;
  const files = await db.attachment.findMany({ where: { userId }, select: { storage: true, pathname: true, thumbPathname: true } });
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { vaultAt: null, vaultCheck: null, vaultSealedAt: null, birthdaySealed: null, questions: null, photoId: null } }),
    db.dayLog.deleteMany({ where: { userId } }),
    db.dailyReflection.deleteMany({ where: { userId } }),
    db.weeklyReflection.deleteMany({ where: { userId } }),
    db.sevaEntry.deleteMany({ where: { userId } }),
    db.expression.deleteMany({ where: { userId } }),
    db.person.deleteMany({ where: { userId } }),
    db.attachment.deleteMany({ where: { userId } }),
    db.commitment.deleteMany({ where: { userId } }),
    db.portrait.deleteMany({ where: { userId } }),
    db.practice.deleteMany({ where: { userId } }),
    db.deletion.deleteMany({ where: { userId } }),
    db.vaultLink.deleteMany({ where: { userId } }),
    db.vaultKey.deleteMany({ where: { userId } }),
    db.passkey.deleteMany({ where: { userId } }),
  ]);
  // The stored files (encrypted, unreadable now) go after; a failure here leaves only orphans.
  for (let i = 0; i < files.length; i += 8) await Promise.all(files.slice(i, i + 8).map(removeAttachmentFiles));
  return NextResponse.json({ ok: true });
}
