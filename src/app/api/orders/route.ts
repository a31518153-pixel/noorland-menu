import { NextRequest, NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orderItems, orders } from "@/db/schema";

export const dynamic = "force-dynamic";

// GET /api/orders — latest orders with their items
export async function GET() {
  const latest = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);

  if (latest.length === 0) return NextResponse.json({ orders: [] });

  const ids = latest.map((o) => o.id);
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));

  const byOrder = new Map<number, typeof items>();
  for (const it of items) {
    const arr = byOrder.get(it.orderId) ?? [];
    arr.push(it);
    byOrder.set(it.orderId, arr);
  }

  return NextResponse.json({
    orders: latest.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })),
  });
}

// POST /api/orders — create a new order from a table
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const { tableNumber, customerName, notes, items } = body as {
    tableNumber?: string;
    customerName?: string;
    notes?: string;
    items?: { id: number; qty: number }[];
  };

  if (!tableNumber || typeof tableNumber !== "string" || tableNumber.trim().length === 0) {
    return NextResponse.json({ error: "رقم الطاولة مطلوب" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
  }

  const clean = items
    .filter((i) => Number.isInteger(i?.id) && Number.isInteger(i?.qty) && i.qty > 0 && i.qty <= 50)
    .slice(0, 80);
  if (clean.length === 0) {
    return NextResponse.json({ error: "الأصناف غير صالحة" }, { status: 400 });
  }

  const dbItems = await db
    .select()
    .from(menuItems)
    .where(inArray(menuItems.id, clean.map((i) => i.id)));

  const byId = new Map(dbItems.map((m) => [m.id, m]));
  let total = 0;
  const lines = [];
  for (const c of clean) {
    const m = byId.get(c.id);
    if (!m || !m.available) {
      return NextResponse.json({ error: `الصنف غير متوفر حالياً` }, { status: 409 });
    }
    total += m.price * c.qty;
    lines.push({
      itemId: m.id,
      nameAr: m.nameAr,
      nameEn: m.nameEn,
      price: m.price,
      quantity: c.qty,
    });
  }

  const [order] = await db
    .insert(orders)
    .values({
      tableNumber: tableNumber.trim().slice(0, 12),
      customerName: customerName?.trim().slice(0, 60) || null,
      notes: notes?.trim().slice(0, 400) || null,
      total,
      status: "pending",
    })
    .returning();

  await db.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));

  const inserted = await db.select().from(orderItems).where(inArray(orderItems.orderId, [order.id]));

  return NextResponse.json({ order: { ...order, items: inserted } }, { status: 201 });
}
