import "dotenv/config";
import { db, pool } from "./index";
import { categories, menuItems } from "./schema";
import { MENU } from "./menu-data";
import { getDescEn } from "./descriptions-en";

async function seed() {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  console.log(`Seeding ${MENU.length} categories...`);

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
    console.log(`  ✓ ${cat.nameEn} (${cat.items.length} items)`);
  }

  console.log("Seed complete.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
