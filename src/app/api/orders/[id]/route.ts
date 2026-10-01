import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID = ["pending", "accepted", "served", "completed", "rejected"] as const;
type Status = (typeof VALID)[number];

// GET /api/orders/[id] — single order with items (for live tracking)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return NextResponse.json({ order: { ...order, items } });
}

// PATCH /api/orders/[id] — captain / admin updates the status
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status as Status | undefined;
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const [updated] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  if (!updated) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return NextResponse.json({ order: { ...updated, items } });
}

// DELETE /api/orders/[id] — permanently remove an order (admin)
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }
  const [deleted] = await db.delete(orders).where(eq(orders.id, orderId)).returning({ id: orders.id });
  if (!deleted) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
