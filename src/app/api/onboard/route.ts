import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDeviceUser } from "@/lib/session";
import { DEFAULT_PRACTICES } from "@/lib/defaults";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getOrCreateDeviceUser();

    // Check if already onboarded
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user?.onboardedAt) {
      return NextResponse.json({ ok: true, alreadyOnboarded: true });
    }

    // Parse selected indices from body (or default to all)
    let selectedIndices: number[];
    try {
      const body = await req.json();
      selectedIndices = Array.isArray(body?.selectedIndices)
        ? body.selectedIndices.filter((i: number) => i >= 0 && i < DEFAULT_PRACTICES.length)
        : DEFAULT_PRACTICES.map((_, i) => i);
    } catch {
      selectedIndices = DEFAULT_PRACTICES.map((_, i) => i);
    }

    // Only seed selected practices
    const selectedPractices = selectedIndices.map((i, order) => ({
      ...DEFAULT_PRACTICES[i],
      order, // re-order sequentially based on selection
    }));

    await db.practice.createMany({
      data: selectedPractices.map((p) => ({
        userId,
        name: p.name,
        iconName: p.iconName,
        tier: p.tier,
        hasDoneToggle: p.hasDoneToggle,
        order: p.order,
        fields: p.fields as unknown as Prisma.InputJsonValue,
      })),
    });

    // Mark onboarded
    await db.user.update({
      where: { id: userId },
      data: { onboardedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboard error:", error);
    return NextResponse.json({ error: "Failed to onboard" }, { status: 500 });
  }
}
