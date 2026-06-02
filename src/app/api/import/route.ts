import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid JSON structure" }, { status: 400 });
    }

    // Get the user's actual practices to map names → IDs
    const userPractices = await db.practice.findMany({ where: { userId: user.id } });
    const practiceByName: Record<string, string> = {};
    for (const p of userPractices) {
      practiceByName[p.name.toLowerCase()] = p.id;
    }

    // Build a map from dummy IDs to real IDs using name matching
    const PRACTICE_NAMES = [
      "wake up", "shambhavi", "shakti chalana", "surya kriya", "yogasanas",
      "breath watching", "samyama", "shoonya", "dhyanalinga", "lingabhairavi",
      "bedtime", "eating consciously", "mood"
    ];
    const dummyIdToRealId: Record<string, string> = {};
    for (let i = 0; i < PRACTICE_NAMES.length; i++) {
      const dummyId = `p${i + 1}`;
      const realId = practiceByName[PRACTICE_NAMES[i]];
      if (realId) {
        dummyIdToRealId[dummyId] = realId;
      }
    }

    // Also try mapping by order (fallback if names don't match)
    if (Object.keys(dummyIdToRealId).length === 0 && userPractices.length > 0) {
      const sorted = [...userPractices].sort((a, b) => a.order - b.order);
      for (let i = 0; i < sorted.length && i < 13; i++) {
        dummyIdToRealId[`p${i + 1}`] = sorted[i].id;
      }
    }

    console.log("Import: found", userPractices.length, "practices, mapped", Object.keys(dummyIdToRealId).length, "IDs");
    console.log("Import: mapping =", JSON.stringify(dummyIdToRealId));

    let importedDays = 0;
    let importedReflections = 0;

    // Import day logs — re-map practice IDs
    if (Array.isArray(data.dayLogs)) {
      for (const log of data.dayLogs) {
        if (!log.date || !log.entries) continue;

        // Re-map entries keys from dummy IDs to real IDs
        const remappedEntries: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(log.entries)) {
          const realId = dummyIdToRealId[key];
          if (realId) {
            remappedEntries[realId] = value;
          } else {
            // If key looks like a real cuid, keep it
            if (key.length > 10) {
              remappedEntries[key] = value;
            }
          }
        }

        if (Object.keys(remappedEntries).length === 0) continue;

        await db.dayLog.upsert({
          where: { userId_date: { userId: user.id, date: new Date(log.date) } },
          create: {
            userId: user.id,
            date: new Date(log.date),
            entries: remappedEntries as Prisma.InputJsonValue,
          },
          update: {
            entries: remappedEntries as Prisma.InputJsonValue,
          },
        });
        importedDays++;
      }
    }

    // Import daily reflections
    if (Array.isArray(data.dailyReflections)) {
      for (const ref of data.dailyReflections) {
        if (!ref.date) continue;
        await db.dailyReflection.upsert({
          where: { userId_date: { userId: user.id, date: new Date(ref.date) } },
          create: {
            userId: user.id,
            date: new Date(ref.date),
            answers: (ref.answers ?? {}) as Prisma.InputJsonValue,
            stamps: (ref.stamps ?? {}) as Prisma.InputJsonValue,
            moodKey: ref.moodKey ?? null,
          },
          update: {
            answers: (ref.answers ?? {}) as Prisma.InputJsonValue,
            stamps: (ref.stamps ?? {}) as Prisma.InputJsonValue,
            moodKey: ref.moodKey ?? null,
          },
        });
        importedReflections++;
      }
    }

    // Import custom practices
    if (Array.isArray(data.practices)) {
      for (const p of data.practices) {
        if (p.tier === "CUSTOM" && p.name) {
          await db.practice.create({
            data: {
              userId: user.id,
              name: p.name,
              iconName: p.iconName || "Star",
              tier: "CUSTOM",
              hasDoneToggle: p.hasDoneToggle ?? true,
              order: p.order ?? 99,
              fields: (p.fields ?? []) as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    // Import seva entries
    if (Array.isArray(data.sevaEntries)) {
      for (const entry of data.sevaEntries) {
        if (entry.date) {
          await db.sevaEntry.create({
            data: {
              userId: user.id,
              date: new Date(entry.date),
              s1: entry.s1 ?? "",
              s2: entry.s2 ?? "",
              s3: entry.s3 ?? "",
            },
          });
        }
      }
    }

    // Import expressions
    if (Array.isArray(data.expressions)) {
      for (const expr of data.expressions) {
        if (expr.date && expr.body) {
          await db.expression.create({
            data: {
              userId: user.id,
              title: expr.title ?? "",
              date: new Date(expr.date),
              kind: expr.kind ?? "moment",
              body: expr.body,
              refDates: (expr.refDates ?? []) as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Imported ${importedDays} days, ${importedReflections} reflections. Mapped ${Object.keys(dummyIdToRealId).length} practices.`,
      importedDays,
      importedReflections,
      mappedPractices: Object.keys(dummyIdToRealId).length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed — check file format" }, { status: 500 });
  }
}
