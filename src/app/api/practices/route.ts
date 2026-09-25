import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { catalogById } from "@/lib/practiceCatalog";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
  catalogId: z.string().max(60).optional(),
  iconName: z.string().min(1),
  hasDoneToggle: z.boolean(),
  fields: z.array(
    z.object({
      key: z.string(),
      kind: z.enum(["TIME", "COUNT", "MINUTES", "NUMBER", "ICONSCALE", "MOOD"]),
      label: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      default: z.union([z.string().max(20), z.number()]).optional(),
    })
  ),
});

const ReorderSchema = z.object({
  reorder: z.array(z.object({ id: z.string(), order: z.number() })),
});

const RenameSchema = z.object({ id: z.string(), name: z.string().trim().min(1).max(50) });
const DefaultsSchema = z.object({ id: z.string(), defaults: z.record(z.string(), z.union([z.string().max(20), z.number()])) });
/** Edit a practice: name, and per-field usual values (fill on tick) and defaults (rhythm). */
const EditSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(50).optional(),
  fields: z.record(
    z.string().max(30),
    z.object({
      kind: z.enum(["TIME", "COUNT", "MINUTES", "NUMBER", "ICONSCALE", "MOOD"]),
      default: z.union([z.string().max(20), z.number().min(0).max(99999)]).nullable().optional(),
      fill: z.number().int().min(0).max(99999).nullable().optional(),
    })
  ),
});

export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json([]);

  const practices = await db.practice.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(practices);
}

export async function POST(req: NextRequest) {
  const user = await resolveUser("tracker");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const catalogId = parsed.data.catalogId && catalogById(parsed.data.catalogId) ? parsed.data.catalogId : null;
  if (catalogId) {
    const existing = await db.practice.findFirst({ where: { userId: user.id, catalogId } });
    if (existing) return NextResponse.json(existing, { status: 200 });
  }

  // Get max order
  const maxOrder = await db.practice.aggregate({
    where: { userId: user.id },
    _max: { order: true },
  });

  const practice = await db.practice.create({
    data: {
      userId: user.id,
      name: parsed.data.name.trim(),
      iconName: parsed.data.iconName,
      catalogId,
      tier: catalogId ? "FIXED" : "CUSTOM",
      hasDoneToggle: parsed.data.hasDoneToggle,
      order: (maxOrder._max.order ?? -1) + 1,
      fields: parsed.data.fields,
    },
  });

  return NextResponse.json(practice, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await resolveUser("tracker");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const edit = EditSchema.safeParse(body);
  if (edit.success) {
    const p = await db.practice.findFirst({ where: { id: edit.data.id, userId: user.id } });
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    type F = { key: string; kind: string; default?: string | number; fill?: number };
    const fields = (Array.isArray(p.fields) ? [...p.fields] : []) as F[];
    for (const [key, change] of Object.entries(edit.data.fields)) {
      let f = fields.find((x) => x.key === key);
      if (!f) {
        // Library practices may not have stored this field yet; keep just the override.
        f = { key, kind: change.kind };
        fields.push(f);
      }
      if (change.default !== undefined) {
        if (change.default === null) delete f.default;
        else f.default = change.default;
      }
      if (change.fill !== undefined) {
        if (change.fill === null) delete f.fill;
        else f.fill = change.fill;
      }
    }
    await db.practice.update({ where: { id: p.id }, data: { fields, ...(edit.data.name ? { name: edit.data.name } : {}) } });
    return NextResponse.json({ ok: true });
  }

  const rename = RenameSchema.safeParse(body);
  if (rename.success) {
    await db.practice.updateMany({ where: { id: rename.data.id, userId: user.id }, data: { name: rename.data.name } });
    return NextResponse.json({ ok: true });
  }

  // Change the default of one or more fields (e.g. usual wake-up time).
  const defaults = DefaultsSchema.safeParse(body);
  if (defaults.success) {
    const p = await db.practice.findFirst({ where: { id: defaults.data.id, userId: user.id } });
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const fields = (Array.isArray(p.fields) ? p.fields : []) as { key: string; default?: string | number }[];
    const next = fields.map((f) => (f.key in defaults.data.defaults ? { ...f, default: defaults.data.defaults[f.key] } : f));
    await db.practice.update({ where: { id: p.id }, data: { fields: next } });
    return NextResponse.json({ ok: true });
  }

  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Update order for each practice
  await Promise.all(
    parsed.data.reorder.map((item) =>
      db.practice.updateMany({
        where: { id: item.id, userId: user.id },
        data: { order: item.order },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await resolveUser("tracker");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Removing a practice keeps past day logs intact; they simply stop showing it.
  const removed = await db.practice.deleteMany({ where: { id, userId: user.id } });
  if (removed.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
