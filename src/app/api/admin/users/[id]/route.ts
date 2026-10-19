import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveNotifications } from "@/lib/notify";
import { resolveAdmin } from "@/lib/session";
import { effectiveBundles } from "@/lib/features";
import { BUNDLE_KEYS, isBundleKey } from "@/lib/bundles";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
  role: z.enum(["MEMBER", "ADMIN"]).optional(),
  /** bundle key → has it (Sadhana, Reflection, Presence…) */
  bundles: z.record(z.string(), z.boolean()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { status, role, bundles } = parsed.data;

  if (id === admin.id && ((status && status !== "APPROVED") || role === "MEMBER")) {
    return NextResponse.json({ error: "You can't remove your own access." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { id: true, status: true, features: { select: { feature: true, allowed: true, enabled: true } } } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ops = [];
  if (status || role) {
    const approving = status === "APPROVED" && target.status !== "APPROVED";
    ops.push(
      db.user.update({
        where: { id },
        data: {
          status,
          role,
          ...(approving ? { approvedAt: new Date(), approvedById: admin.id } : {}),
        },
      })
    );
    // Suspending signs the person out everywhere.
    if (status === "SUSPENDED") ops.push(db.session.deleteMany({ where: { userId: id } }));
  }
  if (bundles) {
    // Every bundle gets its own row (so what they have no longer depends on older settings),
    // and everyone keeps at least one.
    const now = new Set(effectiveBundles(target.features));
    for (const [key, on] of Object.entries(bundles)) if (isBundleKey(key)) (on ? now.add(key) : now.delete(key));
    if (now.size === 0) return NextResponse.json({ error: "Everyone needs at least one bundle." }, { status: 400 });
    for (const key of BUNDLE_KEYS) {
      const allowed = now.has(key);
      ops.push(
        db.userFeature.upsert({
          where: { userId_feature: { userId: id, feature: key } },
          create: { userId: id, feature: key, allowed, updatedById: admin.id },
          update: { allowed, enabled: true, updatedById: admin.id },
        })
      );
    }
  }
  await db.$transaction(ops);
  // Decided (let in or turned away): the "waiting for approval" note goes for every admin.
  if (status && status !== "PENDING" && target.status === "PENDING") await resolveNotifications(`approval:${id}`);
  return NextResponse.json({ ok: true });
}
