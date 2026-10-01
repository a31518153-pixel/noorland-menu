import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";

export const dynamic = "force-dynamic";

// GET /api/menu-items — full menu tree (admin sync)
export async function GET() {
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const items = await db.select().from(menuItems).orderBy(asc(menuItems.sortOrder));
  return NextResponse.json({
    data: cats.map((c) => ({ category: c, items: items.filter((i) => i.categoryId === c.id) })),
  });
}

// POST /api/menu-items — create a new menu item (admin)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const categoryId = Number(body.categoryId);
  const nameAr = String(body.nameAr ?? "").trim();
  const nameEn = String(body.nameEn ?? "").trim();
  const price = Number(body.price);

  if (!Number.isInteger(categoryId)) return NextResponse.json({ error: "الفئة مطلوبة" }, { status: 400 });
  if (!nameAr || !nameEn) return NextResponse.json({ error: "الاسم العربي والإنجليزي مطلوبان" }, { status: 400 });
  if (!Number.isInteger(price) || price < 0 || price > 100_000_000)
    return NextResponse.json({ error: "السعر غير صالح" }, { status: 400 });

  try {
    const [item] = await db
      .insert(menuItems)
      .values({
        categoryId,
        nameAr: nameAr.slice(0, 120),
        nameEn: nameEn.slice(0, 160),
        price,
        descriptionAr: body.descriptionAr ? String(body.descriptionAr).slice(0, 500) : null,
        descriptionEn: body.descriptionEn ? String(body.descriptionEn).slice(0, 500) : null,
        image: body.image ? String(body.image).slice(0, 600) : null,
        featured: Boolean(body.featured),
        available: body.available === undefined ? true : Boolean(body.available),
        sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      })
      .returning();
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "تعذر إنشاء الصنف (تحقق من الفئة)" }, { status: 500 });
  }
}
