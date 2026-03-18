import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveDailyChallengeState } from "@/lib/daily-challenge";
import { signStartToken } from "@/lib/token";

export async function GET() {
  const session = await auth();
  const { activeChallengeForToday } = await resolveDailyChallengeState();

  const challenge = activeChallengeForToday
    ? await db.dailyChallenge.findUnique({
        where: { id: activeChallengeForToday.id },
        include: {
          puzzle: { select: { id: true, size: true, grid: true } },
        },
      })
    : null;

  if (!challenge) {
    return NextResponse.json({ error: "No daily challenge today" }, { status: 404 });
  }

  let startToken: string | null = null;
  let userSolve = null;

  if (session?.user?.id) {
    startToken = await signStartToken(session.user.id, challenge.puzzle.id);
    userSolve = await db.solve.findUnique({
      where: {
        userId_dailyChallengeId: {
          userId: session.user.id,
          dailyChallengeId: challenge.id,
        },
      },
      select: { timeMs: true, completedAt: true, isPersonalBest: true },
    });
  }

  return NextResponse.json({
    id: challenge.id,
    number: challenge.number,
    date: challenge.date,
    puzzle: {
      id: challenge.puzzle.id,
      size: challenge.puzzle.size,
      grid: challenge.puzzle.grid,
    },
    startToken,
    userSolve,
  });
}
