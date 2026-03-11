import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";
import path from "path";
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

  // Option B: PUZZLE_GENERATOR_URL env var points to a Python microservice
  if (process.env.PUZZLE_GENERATOR_URL) {
    try {
      const res = await fetch(`${process.env.PUZZLE_GENERATOR_URL}?size=8&count=1`);
      if (!res.ok) throw new Error(`Generator service returned ${res.status}`);
      const arr = (await res.json()) as PuzzleRecord[];
      if (!arr.length) throw new Error("Generator service returned empty array");
      puzzleData = arr[0];
    } catch (err) {
      console.error("[cron/generate-daily] Microservice failed:", err);
      return NextResponse.json({ error: "Puzzle generation failed" }, { status: 500 });
    }
  } else {
    // Option A: spawn local Python process (works in dev / self-hosted)
    const tmpPath = path.join("/tmp", `princess_daily_${Date.now()}.json`);
    try {
      const generatorScript = path.join(
        process.cwd(),
        "..",
        "py_level_generator",
        "generate_puzzles.py"
      );
      execSync(
        `python "${generatorScript}" --count 1 --n 8 --out "${tmpPath}"`,
        { timeout: 120_000, encoding: "utf-8" }
      );
      const raw = readFileSync(tmpPath, "utf-8");
      const arr = JSON.parse(raw) as PuzzleRecord[];
      if (!arr.length) throw new Error("Generator returned empty array");
      puzzleData = arr[0];
    } catch (err) {
      console.error("[cron/generate-daily] Python generator failed:", err);
      return NextResponse.json({ error: "Puzzle generation failed" }, { status: 500 });
    } finally {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    }
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
