import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyAdminsOfPending } from "@/lib/notify";
import { getCurrentUser } from "@/lib/session";
import { catalogById } from "@/lib/practiceCatalog";
import { FEATURE_KEYS, isFeatureKey } from "@/lib/features";

const OnboardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  intention: z.string().trim().max(500).optional(),
  features: z.array(z.string()).min(1).max(FEATURE_KEYS.length),
  catalogIds: z.array(z.string().max(60)).max(80),
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

  const hasPractices = (await db.practice.count({ where: { userId: user.id } })) > 0;
  const entries = [...new Set(parsed.data.catalogIds)].map(catalogById).filter((e) => !!e);
  const seedPractices = chosen.has("tracker") && !hasPractices && entries.length > 0;

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
            data: entries.map((p, order) => ({
              userId: user.id,
              name: p.name,
              iconName: p.icon,
              catalogId: p.id,
              tier: "FIXED" as const,
              hasDoneToggle: p.hasDoneToggle,
              order,
              fields: p.fields as unknown as Prisma.InputJsonValue,
            })),
          }),
        ]
      : []),
    db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, intention: parsed.data.intention || null, onboardedAt: new Date() },
    }),
  ]);

  // Waiting to be let in: every admin hears about it (in the bell, and as a push).
  if (user.status === "PENDING") {
    await notifyAdminsOfPending({ id: user.id, name: parsed.data.name, email: user.email ?? null }).catch((e) => console.error("notify admins", e));
  }
  return NextResponse.json({ ok: true, status: user.status });
}
