import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin";
import { createTomorrowDailyChallengeIfMissing } from "@/lib/daily-challenge";

export async function POST() {
  const admin = await requireAdminApiUser();
  if (!admin.ok) {
    return admin.response;
  }

  try {
    const result = await createTomorrowDailyChallengeIfMissing();
    return NextResponse.json({
      created: result.created,
      challenge: {
        id: result.challenge.id,
        number: result.challenge.number,
        puzzleId: result.challenge.puzzle.id,
        hash: result.challenge.puzzle.hash,
        size: result.challenge.puzzle.size,
        difficulty: result.challenge.puzzle.difficulty,
        grid: result.challenge.puzzle.grid,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate tomorrow's daily challenge" },
      { status: 500 }
    );
  }
}
