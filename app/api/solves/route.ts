import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verifyStartToken } from "@/lib/token";
import { checkRateLimit } from "@/lib/ratelimit";
import { isSolved } from "@/lib/puzzle/validator";
import type { Grid, Queens } from "@/lib/puzzle/validator";

const SolveSchema = z.object({
  puzzleId: z.string().cuid(),
  levelId: z.string().cuid().optional(),
  dailyChallengeId: z.string().cuid().optional(),
  queenPositions: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])),
  activeTimeMs: z.number().int().positive(),
  startToken: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = await checkRateLimit(`solves:${session.user.id}`);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { puzzleId, levelId, dailyChallengeId, queenPositions, activeTimeMs, startToken } =
    parsed.data;

  // 1. Verify start token
  const tokenPayload = await verifyStartToken(startToken);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Invalid or expired start token" }, { status: 400 });
  }
  if (tokenPayload.userId !== session.user.id) {
    return NextResponse.json({ error: "Token user mismatch" }, { status: 400 });
  }
  if (tokenPayload.puzzleId !== puzzleId) {
    return NextResponse.json({ error: "Token puzzle mismatch" }, { status: 400 });
  }

  // 2. Timing sanity check
  const startedAt = new Date(tokenPayload.startedAt).getTime();
  const elapsed = Date.now() - startedAt;
  const MIN_MS = 3000;
  if (activeTimeMs < MIN_MS || activeTimeMs > elapsed) {
    return NextResponse.json({ error: "Invalid activeTimeMs" }, { status: 400 });
  }

  // 3. Fetch puzzle and validate solution
  const puzzle = await db.puzzle.findUnique({ where: { id: puzzleId } });
  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }
  if (queenPositions.length !== puzzle.size) {
    return NextResponse.json({ error: "Wrong number of queens" }, { status: 400 });
  }

  const grid = puzzle.grid as Grid;
  const queens = queenPositions as Queens;
  if (!isSolved(grid, queens)) {
    return NextResponse.json({ error: "Invalid solution" }, { status: 400 });
  }

  // 4. Upsert solve
  const existing = levelId
    ? await db.solve.findUnique({ where: { userId_levelId: { userId: session.user.id, levelId } } })
    : dailyChallengeId
    ? await db.solve.findUnique({ where: { userId_dailyChallengeId: { userId: session.user.id, dailyChallengeId } } })
    : null;

  if (existing) {
    // Already solved — return existing result idempotently
    return NextResponse.json({ timeMs: existing.timeMs, isPersonalBest: existing.isPersonalBest });
  }

  const isPersonalBest = !!dailyChallengeId; // Only meaningful for daily challenges
  const solve = await db.solve.create({
    data: {
      userId: session.user.id,
      levelId: levelId ?? null,
      dailyChallengeId: dailyChallengeId ?? null,
      timeMs: activeTimeMs,
      isPersonalBest,
    },
  });

  return NextResponse.json({ timeMs: solve.timeMs, isPersonalBest }, { status: 201 });
}
