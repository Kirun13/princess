import { NextRequest, NextResponse } from "next/server";
import {
  buildRequestContext,
  logRequestComplete,
  logRequestError,
  logRequestStart,
} from "@/lib/logger";
import { createTomorrowDailyChallengeIfMissing } from "@/lib/daily-challenge";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestContext = buildRequestContext(req, "/api/cron/generate-daily");
  logRequestStart(requestContext);

  // Verify the shared cron secret before allowing a scheduled generate run.
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    logRequestComplete(requestContext, 401, startedAt);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await createTomorrowDailyChallengeIfMissing();

    if (!result.created) {
      logRequestComplete(requestContext, 200, startedAt, {
        skipped: true,
        challengeDate: result.challenge.date.toISOString(),
        challengeNumber: result.challenge.number,
        puzzleId: result.challenge.puzzle.id,
      });
      return NextResponse.json({
        ok: true,
        skipped: true,
        date: result.challenge.date.toISOString(),
        number: result.challenge.number,
      });
    }

    logRequestComplete(requestContext, 200, startedAt, {
      skipped: false,
      challengeDate: result.challenge.date.toISOString(),
      challengeNumber: result.challenge.number,
      puzzleId: result.challenge.puzzle.id,
    });

    return NextResponse.json({
      ok: true,
      date: result.challenge.date.toISOString(),
      number: result.challenge.number,
      puzzleId: result.challenge.puzzle.id,
      difficulty: result.challenge.puzzle.difficulty,
    });
  } catch (err) {
    logRequestError(
      requestContext,
      500,
      startedAt,
      "puzzle-generator.request.failed",
      err,
      {
        generatorUrl: process.env.PUZZLE_GENERATOR_URL,
      }
    );
    return NextResponse.json({ error: "Puzzle generation failed" }, { status: 500 });
  }
}
