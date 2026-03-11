import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const DeleteSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Type "DELETE MY ACCOUNT" to confirm' },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Delete in dependency order (no cascade on these models)
  await db.$transaction([
    db.solve.deleteMany({ where: { userId } }),
    db.achievement.deleteMany({ where: { userId } }),
    db.levelRating.deleteMany({ where: { userId } }),
    db.userSettings.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
