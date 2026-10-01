import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { HERO_IMAGE } from "@/db/menu-data";
import { MenuExperience } from "@/components/menu/menu-experience";
import { autoSeed } from "@/db/auto-seed";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  // Try to seed if DB is empty (Automatic upon upload)
  await autoSeed();

  const { table } = await searchParams;

  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const items = await db.select().from(menuItems).orderBy(asc(menuItems.sortOrder));

  const data = cats.map((c) => ({
    category: c,
    items: items.filter((i) => i.categoryId === c.id),
  }));

  return (
    <MenuExperience data={data} initialTable={table?.trim() || null} heroImage={HERO_IMAGE} />
  );
}
