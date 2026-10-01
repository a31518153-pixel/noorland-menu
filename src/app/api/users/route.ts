import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const allUsers = await db.select().from(users).orderBy(asc(users.id));
  return NextResponse.json({ users: allUsers });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.fullName) {
    return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 });
  }

  try {
    const [newUser] = await db.insert(users).values({
      username: body.username.trim().toLowerCase(),
      fullName: body.fullName.trim(),
      role: body.role || "captain",
      active: body.active !== false,
    }).returning();
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "23505") return NextResponse.json({ error: "اسم المستخدم موجود مسبقاً" }, { status: 409 });
    return NextResponse.json({ error: "فشل إنشاء المستخدم" }, { status: 500 });
  }
}
