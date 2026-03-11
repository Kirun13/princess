import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { levelId, dailyChallengeId, rating } = body as {
    levelId?: string;
    dailyChallengeId?: string;
    rating: unknown;
  };

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer between 1 and 5" }, { status: 400 });
  }

  const hasLevel = typeof levelId === "string" && levelId.length > 0;
  const hasDaily = typeof dailyChallengeId === "string" && dailyChallengeId.length > 0;

  if (!hasLevel && !hasDaily) {
    return NextResponse.json({ error: "Either levelId or dailyChallengeId is required" }, { status: 400 });
  }
  if (hasLevel && hasDaily) {
    return NextResponse.json({ error: "Provide only one of levelId or dailyChallengeId" }, { status: 400 });
  }

  const userId = session.user.id;

  if (hasLevel) {
    const result = await db.levelRating.upsert({
      where: { userId_levelId: { userId, levelId: levelId! } },
      create: { userId, levelId: levelId!, rating },
      update: { rating },
      select: { rating: true },
    });
    return NextResponse.json({ rating: result.rating });
  }

  const result = await db.levelRating.upsert({
    where: { userId_dailyChallengeId: { userId, dailyChallengeId: dailyChallengeId! } },
    create: { userId, dailyChallengeId: dailyChallengeId!, rating },
    update: { rating },
    select: { rating: true },
  });
  return NextResponse.json({ rating: result.rating });
}
