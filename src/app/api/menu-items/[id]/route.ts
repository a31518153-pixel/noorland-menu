import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";

export const dynamic = "force-dynamic";

const EDITABLE = [
  "categoryId",
  "nameAr",
  "nameEn",
  "descriptionAr",
  "descriptionEn",
  "price",
  "image",
  "featured",
  "available",
  "sortOrder",
] as const;

// PATCH /api/menu-items/[id] — full edit (admin). Accepts any subset of fields.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const updates: Partial<typeof menuItems.$inferInsert> = {};

  for (const key of EDITABLE) {
    if (!(key in body)) continue;
    const v = body[key];
    switch (key) {
      case "categoryId":
      case "sortOrder": {
        const n = Number(v);
        if (!Number.isInteger(n)) return NextResponse.json({ error: `قيمة غير صالحة: ${key}` }, { status: 400 });
        updates[key] = n;
        break;
      }
      case "price": {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 100_000_000)
          return NextResponse.json({ error: "السعر غير صالح" }, { status: 400 });
        updates.price = n;
        break;
      }
      case "nameAr":
      case "nameEn": {
        const s = String(v ?? "").trim();
        if (!s) return NextResponse.json({ error: "الاسم لا يمكن أن يكون فارغاً" }, { status: 400 });
        updates[key] = s.slice(0, 160);
        break;
      }
      case "descriptionAr":
      case "descriptionEn":
        updates[key] = v ? String(v).slice(0, 500) : null;
        break;
      case "image":
        updates.image = v ? String(v).slice(0, 600) : null;
        break;
      case "featured":
      case "available":
        updates[key] = Boolean(v);
        break;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  try {
    const [updated] = await db.update(menuItems).set(updates).where(eq(menuItems.id, itemId)).returning();
    if (!updated) return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });
    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "تعذر تحديث الصنف" }, { status: 500 });
  }
}

// DELETE /api/menu-items/[id] — permanently remove an item (admin)
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }
  const [deleted] = await db.delete(menuItems).where(eq(menuItems.id, itemId)).returning({ id: menuItems.id });
  if (!deleted) return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
