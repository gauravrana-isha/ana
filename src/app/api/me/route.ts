import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveNotifications } from "@/lib/notify";
import { getCurrentUser } from "@/lib/session";
import { FEATURE_KEYS, isFeatureKey } from "@/lib/features";
import { removeAttachmentFiles, storageMode } from "@/lib/storage";
import { MUST_SEAL, sealed } from "@/lib/sealed";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ signedIn: false }, { status: 401 });
  return NextResponse.json({
    signedIn: true,
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    status: user.status,
    onboarded: !!user.onboardedAt,
    theme: user.theme,
    intention: user.intention,
    preferredName: user.preferredName,
    photoId: user.photoId,
    birthday: user.birthdaySealed ?? user.birthday?.toISOString().slice(0, 10) ?? null,
    vault: !!user.vaultAt,
    place: user.place,
    questions: user.questions,
    portraitEveryMonths: user.portraitEveryMonths,
    features: user.effective,
    storage: storageMode(),
    // Features the admin allows, so settings can offer only those.
    allowedFeatures: FEATURE_KEYS.filter(
      (k) => user.features.find((f) => f.feature === k)?.allowed !== false
    ),
  });
}

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  // Personal lines arrive sealed (only the person's devices can read them).
  intention: sealed(8_000).nullable().optional(),
  preferredName: z.string().trim().max(40).nullable().optional(),
  birthday: sealed(500).nullable().optional(),
  place: sealed(2_000).nullable().optional(),
  /** Your reflection questions, sealed together (null: back to the built-in ones). */
  questions: sealed(60_000).nullable().optional(),
  /** An uploaded photo attachment to use as your picture, or null to go back to the Google one. */
  photoId: z.string().max(40).nullable().optional(),
  portraitEveryMonths: z.union([z.literal(0), z.literal(3), z.literal(6), z.literal(12)]).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

/** Update your own profile and switch features on or off within what the admin allows. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });
  const { name, intention, features, preferredName, birthday, place, questions, photoId, portraitEveryMonths } = parsed.data;

  // A new photo must be yours and a photo; the old one is removed for good.
  let oldPhoto: { id: string; storage: string; pathname: string; thumbPathname: string | null } | null = null;
  if (photoId !== undefined && photoId !== user.photoId) {
    if (photoId) {
      const ok = await db.attachment.findFirst({ where: { id: photoId, userId: user.id, kind: "photo" }, select: { id: true } });
      if (!ok) return NextResponse.json({ error: "Photo not found" }, { status: 400 });
    }
    if (user.photoId) oldPhoto = await db.attachment.findUnique({ where: { id: user.photoId }, select: { id: true, storage: true, pathname: true, thumbPathname: true } });
  }

  const ops = [];
  const data = {
    ...(name !== undefined ? { name } : {}),
    ...(intention !== undefined ? { intention } : {}),
    ...(preferredName !== undefined ? { preferredName: preferredName || null } : {}),
    ...(birthday !== undefined ? { birthdaySealed: birthday, birthday: null } : {}),
    ...(place !== undefined ? { place } : {}),
    ...(questions !== undefined ? { questions } : {}),
    ...(photoId !== undefined ? { photoId } : {}),
    ...(portraitEveryMonths !== undefined ? { portraitEveryMonths } : {}),
  };
  if (Object.keys(data).length) ops.push(db.user.update({ where: { id: user.id }, data }));
  for (const [key, enabled] of Object.entries(features ?? {})) {
    if (!isFeatureKey(key)) continue;
    ops.push(
      db.userFeature.upsert({
        where: { userId_feature: { userId: user.id, feature: key } },
        create: { userId: user.id, feature: key, enabled, updatedById: user.id },
        update: { enabled, updatedById: user.id },
      })
    );
  }
  await db.$transaction(ops);
  if (oldPhoto) {
    await db.attachment.delete({ where: { id: oldPhoto.id } }).catch(() => {});
    await removeAttachmentFiles(oldPhoto);
  }
  // A new "reflect again" setting: any pending reminder about it is done with.
  if (portraitEveryMonths === 0) await resolveNotifications("portrait:", user.id);
  return NextResponse.json({ ok: true });
}
