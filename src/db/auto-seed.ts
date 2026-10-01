import { db } from "./index";
import { categories, menuItems } from "./schema";
import { MENU } from "./menu-data";
import { getDescEn } from "./descriptions-en";

export async function autoSeed() {
  try {
    const existing = await db.select({ id: categories.id }).from(categories).limit(1);
    if (existing.length > 0) return;

    console.log("Auto-seeding menu data...");
    for (const [ci, cat] of MENU.entries()) {
      const [c] = await db
        .insert(categories)
        .values({ slug: cat.slug, nameAr: cat.nameAr, nameEn: cat.nameEn, sortOrder: ci })
        .returning();

      await db.insert(menuItems).values(
        cat.items.map(([nameEn, nameAr, price, descAr, featured], i) => ({
          categoryId: c.id,
          nameEn,
          nameAr,
          price,
          descriptionAr: descAr ?? null,
          descriptionEn: getDescEn(nameEn),
          image: cat.images[i % cat.images.length],
          featured: (typeof featured === "boolean" ? featured : false),
          sortOrder: i,
        })),
      );
    }
    console.log("Auto-seed complete.");
  } catch (e) {
    console.error("Auto-seed failed:", e);
  }
}
