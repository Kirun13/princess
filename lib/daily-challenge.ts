import { db } from "@/lib/db";
import { getUtcDayWindow } from "@/lib/daily-window";

export type PuzzleRecord = {
  grid: number[][];
  solution: number[][];
  hash: string;
  size: number;
  difficulty: string;
};

export type DailyChallengeSummary = {
  id: string;
  number: number;
  date: Date;
  puzzleId: string;
};

function getPuzzleGeneratorBaseUrl() {
  const generatorUrl = process.env.PUZZLE_GENERATOR_URL;

  if (!generatorUrl) {
    throw new Error("PUZZLE_GENERATOR_URL is not configured");
  }

  return /^https?:\/\//i.test(generatorUrl) ? generatorUrl : `http://${generatorUrl}`;
}

export async function resolveDailyChallengeState(now = new Date()) {
  const { todayStartUtc, todayEndUtc, tomorrowStartUtc } = getUtcDayWindow(now);

  const [activeChallengeForToday, latestPublishedChallenge] = await Promise.all([
    db.dailyChallenge.findFirst({
      where: {
        date: {
          gte: todayStartUtc,
          lte: todayEndUtc,
        },
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        number: true,
        date: true,
        puzzleId: true,
      },
    }),
    db.dailyChallenge.findFirst({
      where: { date: { lte: now } },
      orderBy: { date: "desc" },
      select: {
        id: true,
        number: true,
        date: true,
        puzzleId: true,
      },
    }),
  ]);

  return {
    todayStartUtc,
    todayEndUtc,
    tomorrowStartUtc,
    activeChallengeForToday,
    latestPublishedChallenge,
  };
}

export function getTomorrowUtcDate() {
  return getUtcDayWindow().tomorrowStartUtc;
}

export function sampleDailySize(): number {
  while (true) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    const n = Math.round(7.5 + z * 1.0);
    if (n >= 5 && n <= 10) return n;
  }
}

export async function requestGeneratedPuzzle() {
  const res = await fetch(`${getPuzzleGeneratorBaseUrl()}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.PUZZLE_GENERATOR_API_KEY
        ? { "X-API-Key": process.env.PUZZLE_GENERATOR_API_KEY }
        : {}),
    },
    body: JSON.stringify({ size: sampleDailySize() }),
  });

  if (!res.ok) {
    throw new Error(`Generator service returned ${res.status}`);
  }

  return (await res.json()) as PuzzleRecord;
}

export async function getOrCreatePuzzleFromRecord(puzzleData: PuzzleRecord) {
  const existing = await db.puzzle.findUnique({
    where: { hash: puzzleData.hash },
  });

  if (existing) {
    return existing;
  }

  return db.puzzle.create({
    data: {
      grid: puzzleData.grid,
      solution: puzzleData.solution,
      hash: puzzleData.hash,
      size: puzzleData.size,
      difficulty: puzzleData.difficulty,
    },
  });
}

export async function getTomorrowDailyChallenge() {
  const tomorrow = getTomorrowUtcDate();
  return db.dailyChallenge.findUnique({
    where: { date: tomorrow },
    include: {
      puzzle: {
        select: {
          id: true,
          grid: true,
          size: true,
          difficulty: true,
          hash: true,
        },
      },
    },
  });
}

export async function serializeTomorrowDailyChallenge() {
  const tomorrow = getTomorrowUtcDate();
  const challenge = await getTomorrowDailyChallenge();

  return {
    date: tomorrow.toISOString(),
    challenge: challenge
      ? {
          id: challenge.id,
          number: challenge.number,
          puzzleId: challenge.puzzle.id,
          size: challenge.puzzle.size,
          difficulty: challenge.puzzle.difficulty,
          hash: challenge.puzzle.hash,
          grid: challenge.puzzle.grid,
        }
      : null,
  };
}

export async function createTomorrowDailyChallengeIfMissing() {
  const tomorrow = getTomorrowUtcDate();
  const existing = await db.dailyChallenge.findUnique({
    where: { date: tomorrow },
    include: {
      puzzle: {
        select: {
          id: true,
          grid: true,
          size: true,
          difficulty: true,
          hash: true,
        },
      },
    },
  });

  if (existing) {
    return {
      created: false,
      challenge: existing,
    };
  }

  const puzzleData = await requestGeneratedPuzzle();
  const puzzle = await getOrCreatePuzzleFromRecord(puzzleData);

  const alreadyScheduled = await db.dailyChallenge.findFirst({
    where: { puzzleId: puzzle.id },
    select: { id: true },
  });

  if (alreadyScheduled) {
    throw new Error("Generated puzzle is already scheduled for another daily challenge");
  }

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
    include: {
      puzzle: {
        select: {
          id: true,
          grid: true,
          size: true,
          difficulty: true,
          hash: true,
        },
      },
    },
  });

  return {
    created: true,
    challenge: daily,
  };
}

export async function regenerateTomorrowDailyChallenge() {
  const tomorrow = getTomorrowUtcDate();
  const existing = await db.dailyChallenge.findUnique({
    where: { date: tomorrow },
    include: {
      puzzle: {
        select: {
          id: true,
          grid: true,
          size: true,
          difficulty: true,
          hash: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("No tomorrow daily challenge exists to regenerate");
  }

  const puzzleData = await requestGeneratedPuzzle();
  const puzzle = await getOrCreatePuzzleFromRecord(puzzleData);

  const alreadyScheduled = await db.dailyChallenge.findFirst({
    where: {
      puzzleId: puzzle.id,
      id: { not: existing.id },
    },
    select: { id: true },
  });

  if (alreadyScheduled) {
    throw new Error("Generated puzzle is already scheduled for another daily challenge");
  }

  return db.dailyChallenge.update({
    where: { id: existing.id },
    data: { puzzleId: puzzle.id },
    include: {
      puzzle: {
        select: {
          id: true,
          grid: true,
          size: true,
          difficulty: true,
          hash: true,
        },
      },
    },
  });
}
