import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export const dynamic = "force-dynamic";

import { isUniqueViolation } from "../route";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;

// PATCH /api/categories/[id] — edit a category (admin)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const catId = Number(id);
  if (!Number.isInteger(catId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const updates: Partial<typeof categories.$inferInsert> = {};

  if ("slug" in body) {
    const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!SLUG_RE.test(slug))
      return NextResponse.json({ error: "المعرّف يجب أن يكون أحرفاً إنجليزية صغيرة وأرقاماً وشرطات" }, { status: 400 });
    updates.slug = slug;
  }
  if ("nameAr" in body) {
    const s = String(body.nameAr ?? "").trim();
    if (!s) return NextResponse.json({ error: "الاسم العربي مطلوب" }, { status: 400 });
    updates.nameAr = s.slice(0, 120);
  }
  if ("nameEn" in body) {
    const s = String(body.nameEn ?? "").trim();
    if (!s) return NextResponse.json({ error: "الاسم الإنجليزي مطلوب" }, { status: 400 });
    updates.nameEn = s.slice(0, 160);
  }
  if ("sortOrder" in body) {
    const n = Number(body.sortOrder);
    if (!Number.isInteger(n)) return NextResponse.json({ error: "الترتيب غير صالح" }, { status: 400 });
    updates.sortOrder = n;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  try {
    const [updated] = await db.update(categories).set(updates).where(eq(categories.id, catId)).returning();
    if (!updated) return NextResponse.json({ error: "الفئة غير موجودة" }, { status: 404 });
    return NextResponse.json({ category: updated });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: "هذا المعرّف مستخدم مسبقاً" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "تعذر تحديث الفئة" }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — delete a category and ALL its items (admin)
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const catId = Number(id);
  if (!Number.isInteger(catId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }
  try {
    const [deleted] = await db.delete(categories).where(eq(categories.id, catId)).returning({ id: categories.id });
    if (!deleted) return NextResponse.json({ error: "الفئة غير موجودة" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "تعذر حذف الفئة" }, { status: 500 });
  }
}
