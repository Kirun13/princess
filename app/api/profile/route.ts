import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      solves: {
        orderBy: { completedAt: "desc" },
        take: 5,
        include: {
          level: { select: { name: true, number: true } },
          dailyChallenge: { select: { number: true, date: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const totalSolves = await db.solve.count({ where: { userId: session.user.id } });

  return NextResponse.json({
    username: user.username,
    image: user.image,
    createdAt: user.createdAt,
    stats: {
      totalSolves,
    },
    recentSolves: user.solves.map((s) => ({
      timeMs: s.timeMs,
      completedAt: s.completedAt,
      level: s.level ? { name: s.level.name, number: s.level.number } : null,
      daily: s.dailyChallenge
        ? { number: s.dailyChallenge.number, date: s.dailyChallenge.date }
        : null,
    })),
  });
}
