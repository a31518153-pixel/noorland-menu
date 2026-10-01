import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;

export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
}

// POST /api/categories — create a category (admin)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const slug = String(body.slug ?? "").trim().toLowerCase();
  const nameAr = String(body.nameAr ?? "").trim();
  const nameEn = String(body.nameEn ?? "").trim();
  const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 99;

  if (!SLUG_RE.test(slug))
    return NextResponse.json({ error: "المعرّف يجب أن يكون أحرفاً إنجليزية صغيرة وأرقاماً وشرطات" }, { status: 400 });
  if (!nameAr || !nameEn) return NextResponse.json({ error: "الاسم العربي والإنجليزي مطلوبان" }, { status: 400 });

  try {
    const [category] = await db
      .insert(categories)
      .values({ slug, nameAr: nameAr.slice(0, 120), nameEn: nameEn.slice(0, 160), sortOrder })
      .returning();
    return NextResponse.json({ category }, { status: 201 });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: "هذا المعرّف مستخدم مسبقاً — اختر معرّفاً آخر" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "تعذر إنشاء الفئة" }, { status: 500 });
  }
}
