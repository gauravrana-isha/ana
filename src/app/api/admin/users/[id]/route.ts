import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveAdmin } from "@/lib/session";
import { isFeatureKey } from "@/lib/features";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
  role: z.enum(["MEMBER", "ADMIN"]).optional(),
  /** feature key → allowed */
  features: z.record(z.string(), z.boolean()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { status, role, features } = parsed.data;

  if (id === admin.id && ((status && status !== "APPROVED") || role === "MEMBER")) {
    return NextResponse.json({ error: "You can't remove your own access." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { id: true, status: true } });
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
  for (const [key, allowed] of Object.entries(features ?? {})) {
    if (!isFeatureKey(key)) continue;
    ops.push(
      db.userFeature.upsert({
        where: { userId_feature: { userId: id, feature: key } },
        create: { userId: id, feature: key, allowed, updatedById: admin.id },
        update: { allowed, updatedById: admin.id },
      })
    );
  }
  await db.$transaction(ops);
  return NextResponse.json({ ok: true });
}
