import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin";
import { regenerateTomorrowDailyChallenge } from "@/lib/daily-challenge";

export async function POST() {
  const admin = await requireAdminApiUser();
  if (!admin.ok) {
    return admin.response;
  }

  try {
    const challenge = await regenerateTomorrowDailyChallenge();
    return NextResponse.json({
      challenge: {
        id: challenge.id,
        number: challenge.number,
        puzzleId: challenge.puzzle.id,
        hash: challenge.puzzle.hash,
        size: challenge.puzzle.size,
        difficulty: challenge.puzzle.difficulty,
        grid: challenge.puzzle.grid,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to regenerate tomorrow's daily challenge";
    const status = message.includes("No tomorrow daily challenge") ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
