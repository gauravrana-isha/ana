import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyAdminsOfPending } from "@/lib/notify";
import { getCurrentUser } from "@/lib/session";
import { FEATURE_KEYS, isFeatureKey } from "@/lib/features";
import { sealed } from "@/lib/sealed";

/** Starter practices, sealed on the device. */
const SealedPractice = z.object({
  id: z.string().regex(/^[a-z0-9]{20,40}$/),
  name: sealed(2_000),
  iconName: sealed(2_000),
  catalogId: sealed(2_000),
  hasDoneToggle: z.boolean(),
  fields: sealed(40_000),
});

const OnboardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** Sealed on the device (the journal gets its key before this step). */
  intention: sealed(8_000).optional(),
  features: z.array(z.string()).min(1).max(FEATURE_KEYS.length),
  practices: z.array(SealedPractice).max(80).default([]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.onboardedAt) return NextResponse.json({ ok: true, alreadyOnboarded: true });

  const parsed = OnboardSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const chosen = new Set(parsed.data.features.filter(isFeatureKey));
  if (chosen.size === 0) return NextResponse.json({ error: "Choose at least one feature" }, { status: 400 });

  if (!user.vaultAt) return NextResponse.json({ error: "Set up your key first." }, { status: 400 });
  const hasPractices = (await db.practice.count({ where: { userId: user.id } })) > 0;
  const seedPractices = chosen.has("tracker") && !hasPractices && parsed.data.practices.length > 0;

  await db.$transaction([
    ...FEATURE_KEYS.map((key) =>
      db.userFeature.upsert({
        where: { userId_feature: { userId: user.id, feature: key } },
        create: { userId: user.id, feature: key, enabled: chosen.has(key), updatedById: user.id },
        update: { enabled: chosen.has(key), updatedById: user.id },
      })
    ),
    ...(seedPractices
      ? [
          db.practice.createMany({
            data: parsed.data.practices.map((p, order) => ({
              id: p.id,
              userId: user.id,
              name: p.name,
              iconName: p.iconName,
              catalogId: p.catalogId,
              tier: "FIXED" as const,
              hasDoneToggle: p.hasDoneToggle,
              order,
              fields: p.fields as Prisma.InputJsonValue,
            })),
          }),
        ]
      : []),
    db.user.update({
      where: { id: user.id },
      // A new journal starts sealed: nothing here was ever stored plain.
      data: { name: parsed.data.name, intention: parsed.data.intention ?? null, onboardedAt: new Date(), vaultSealedAt: new Date() },
    }),
  ]);

  // Waiting to be let in: every admin hears about it (in the bell, and as a push).
  if (user.status === "PENDING") {
    await notifyAdminsOfPending({ id: user.id, name: parsed.data.name, email: user.email ?? null }).catch((e) => console.error("notify admins", e));
  }
  return NextResponse.json({ ok: true, status: user.status });
}
