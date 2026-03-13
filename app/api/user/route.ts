import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  buildRequestContext,
  logRequestComplete,
  logRequestStart,
  logRequestWarn,
} from "@/lib/logger";

const DeleteSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

export async function DELETE(req: NextRequest) {
  const startedAt = Date.now();
  const requestContext = buildRequestContext(req, "/api/user");
  logRequestStart(requestContext);

  const session = await auth();
  if (!session?.user?.id) {
    logRequestWarn(requestContext, 401, startedAt, "user.delete.unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    logRequestWarn(requestContext, 400, startedAt, "user.delete.invalid_confirmation");
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

  logRequestComplete(requestContext, 200, startedAt);
  return NextResponse.json({ ok: true });
}
