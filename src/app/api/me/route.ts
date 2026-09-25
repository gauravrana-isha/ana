import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { FEATURE_KEYS, isFeatureKey } from "@/lib/features";
import { storageMode } from "@/lib/storage";

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
  intention: z.string().trim().max(500).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

/** Update your own profile and switch features on or off within what the admin allows. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, intention, features } = parsed.data;

  const ops = [];
  if (name !== undefined || intention !== undefined) {
    ops.push(db.user.update({ where: { id: user.id }, data: { name, intention } }));
  }
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
  return NextResponse.json({ ok: true });
}
