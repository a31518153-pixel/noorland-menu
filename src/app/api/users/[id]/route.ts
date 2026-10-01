import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = Number(id);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const [updated] = await db
    .update(users)
    .set({
      fullName: body.fullName,
      role: body.role,
      active: body.active,
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  return NextResponse.json({ user: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = Number(id);
  await db.delete(users).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
