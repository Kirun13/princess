import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildRequestContext,
  logRequestComplete,
  logRequestError,
  logRequestStart,
} from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Sample board size from N(7.5, 1.0), accepting only 5–10. */
function sampleSize(): number {
  while (true) {
    // Box-Muller transform for normal distribution
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    const n = Math.round(7.5 + z * 1.0);
    if (n >= 5 && n <= 10) return n;
  }
}

type PuzzleRecord = {
  grid: number[][];
  solution: number[][];
  hash: string;
  size: number;
  difficulty: string;
};

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestContext = buildRequestContext(req, "/api/cron/generate-daily");
  logRequestStart(requestContext);

  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    logRequestComplete(requestContext, 401, startedAt);
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
    logRequestComplete(requestContext, 200, startedAt, {
      skipped: true,
      challengeNumber: existing.number,
    });
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
      body: JSON.stringify({ size: sampleSize() }),
    });
    if (!res.ok) throw new Error(`Generator service returned ${res.status}`);
    puzzleData = (await res.json()) as PuzzleRecord;
  } catch (err) {
    logRequestError(
      requestContext,
      500,
      startedAt,
      "puzzle-generator.request.failed",
      err
    );
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

  logRequestComplete(requestContext, 200, startedAt, {
    skipped: false,
    challengeNumber: daily.number,
  });

  return NextResponse.json({
    ok: true,
    date: daily.date.toISOString(),
    number: daily.number,
    puzzleId: puzzle.id,
    difficulty: puzzleData.difficulty,
  });
}
