import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PuzzleRecord = {
  grid: number[][];
  solution: number[][];
  hash: string;
  size: number;
  difficulty: string;
};

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tomorrow's date at midnight UTC
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  // Idempotency: skip if already generated
  const existing = await db.dailyChallenge.findFirst({
    where: { date: tomorrow },
    select: { id: true, number: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      date: tomorrow.toISOString(),
      number: existing.number,
    });
  }

  // Generate a puzzle via Python generator
  let puzzleData: PuzzleRecord;

  // PUZZLE_GENERATOR_URL env var points to the FastAPI microservice
  try {
    const res = await fetch(`${process.env.PUZZLE_GENERATOR_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PUZZLE_GENERATOR_API_KEY
          ? { "X-API-Key": process.env.PUZZLE_GENERATOR_API_KEY }
          : {}),
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`Generator service returned ${res.status}`);
    puzzleData = (await res.json()) as PuzzleRecord;
  } catch (err) {
    console.error("[cron/generate-daily] Microservice failed:", err);
    return NextResponse.json({ error: "Puzzle generation failed" }, { status: 500 });
  }
  

  // Upsert puzzle (deduplicate by hash)
  let puzzle = await db.puzzle.findUnique({ where: { hash: puzzleData.hash } });
  if (!puzzle) {
    puzzle = await db.puzzle.create({
      data: {
        grid: puzzleData.grid,
        solution: puzzleData.solution,
        hash: puzzleData.hash,
        size: puzzleData.size,
        difficulty: puzzleData.difficulty,
      },
    });
  }

  // Assign next sequential challenge number
  const last = await db.dailyChallenge.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = (last?.number ?? 0) + 1;

  const daily = await db.dailyChallenge.create({
    data: {
      date: tomorrow,
      number: nextNumber,
      puzzleId: puzzle.id,
    },
  });

  return NextResponse.json({
    ok: true,
    date: daily.date.toISOString(),
    number: daily.number,
    puzzleId: puzzle.id,
    difficulty: puzzleData.difficulty,
  });
}
