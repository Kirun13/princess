import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

function avgToDifficulty(avg: number): string {
  if (avg < 1.5) return "easy";
  if (avg < 2.5) return "medium";
  if (avg < 3.5) return "hard";
  return "expert";
}

async function updatePuzzleStats(puzzleId: string) {
  const [levelsWithPuzzle, dailiesWithPuzzle] = await Promise.all([
    db.level.findMany({ where: { puzzleId }, select: { id: true } }),
    db.dailyChallenge.findMany({ where: { puzzleId }, select: { id: true } }),
  ]);

  const levelIds = levelsWithPuzzle.map((l) => l.id);
  const dailyIds = dailiesWithPuzzle.map((d) => d.id);

  const [levelAgg, dailyAgg] = await Promise.all([
    levelIds.length > 0
      ? db.levelRating.aggregate({
          where: { levelId: { in: levelIds } },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : Promise.resolve({ _avg: { rating: null }, _count: { rating: 0 } }),
    dailyIds.length > 0
      ? db.levelRating.aggregate({
          where: { dailyChallengeId: { in: dailyIds } },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : Promise.resolve({ _avg: { rating: null }, _count: { rating: 0 } }),
  ]);

  const totalCount = levelAgg._count.rating + dailyAgg._count.rating;
  let avgRating = 0;
  if (totalCount > 0) {
    const levelSum = (levelAgg._avg.rating ?? 0) * levelAgg._count.rating;
    const dailySum = (dailyAgg._avg.rating ?? 0) * dailyAgg._count.rating;
    avgRating = (levelSum + dailySum) / totalCount;
  }

  await db.puzzle.update({
    where: { id: puzzleId },
    data: {
      avgRating,
      ratingCount: totalCount,
      difficulty: totalCount > 0 ? avgToDifficulty(avgRating) : undefined,
    },
  });
}

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
    const [result, level] = await Promise.all([
      db.levelRating.upsert({
        where: { userId_levelId: { userId, levelId: levelId! } },
        create: { userId, levelId: levelId!, rating },
        update: { rating },
        select: { rating: true },
      }),
      db.level.findUnique({ where: { id: levelId! }, select: { puzzleId: true } }),
    ]);
    if (level?.puzzleId) await updatePuzzleStats(level.puzzleId);
    return NextResponse.json({ rating: result.rating });
  }

  const [result, daily] = await Promise.all([
    db.levelRating.upsert({
      where: { userId_dailyChallengeId: { userId, dailyChallengeId: dailyChallengeId! } },
      create: { userId, dailyChallengeId: dailyChallengeId!, rating },
      update: { rating },
      select: { rating: true },
    }),
    db.dailyChallenge.findUnique({ where: { id: dailyChallengeId! }, select: { puzzleId: true } }),
  ]);
  if (daily?.puzzleId) await updatePuzzleStats(daily.puzzleId);
  return NextResponse.json({ rating: result.rating });
}
