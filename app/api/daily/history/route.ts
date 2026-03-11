import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const challenges = await db.dailyChallenge.findMany({
    where: { date: { lt: todayStart } },
    orderBy: { date: "desc" },
    include: {
      puzzle: { select: { grid: true, size: true } },
      solves: {
        orderBy: { timeMs: "asc" },
        take: 3,
        include: {
          user: { select: { username: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json({
    challenges: challenges.map((c) => ({
      id: c.id,
      number: c.number,
      date: c.date,
      grid: c.puzzle.grid,
      size: c.puzzle.size,
      topSolves: c.solves.map((s, i) => ({
        rank: i + 1,
        username: s.user.username,
        image: s.user.image,
        timeMs: s.timeMs,
      })),
    })),
  });
}
