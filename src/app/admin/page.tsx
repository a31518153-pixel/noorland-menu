import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "لوحة التحكم | نور لاند" };

export default async function AdminPage() {
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const items = await db.select().from(menuItems).orderBy(asc(menuItems.sortOrder));

  const data = cats.map((c) => ({
    category: c,
    items: items.filter((i) => i.categoryId === c.id),
  }));

  return <AdminDashboard menuData={data} />;
}
