import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createTomorrowDailyChallengeIfMissingMock,
  logRequestCompleteMock,
  logRequestErrorMock,
  logRequestStartMock,
} = vi.hoisted(() => ({
  createTomorrowDailyChallengeIfMissingMock: vi.fn(),
  logRequestCompleteMock: vi.fn(),
  logRequestErrorMock: vi.fn(),
  logRequestStartMock: vi.fn(),
}));

vi.mock("@/lib/daily-challenge", () => ({
  createTomorrowDailyChallengeIfMissing: createTomorrowDailyChallengeIfMissingMock,
}));

vi.mock("@/lib/logger", () => ({
  buildRequestContext: vi.fn().mockReturnValue({
    route: "/api/cron/generate-daily",
    method: "GET",
    requestId: "req-1",
  }),
  logRequestStart: logRequestStartMock,
  logRequestComplete: logRequestCompleteMock,
  logRequestError: logRequestErrorMock,
}));

import { GET } from "@/app/api/cron/generate-daily/route";

describe("GET /api/cron/generate-daily", () => {
  beforeEach(() => {
    createTomorrowDailyChallengeIfMissingMock.mockReset();
    logRequestCompleteMock.mockReset();
    logRequestErrorMock.mockReset();
    logRequestStartMock.mockReset();
    process.env.CRON_SECRET = "secret-1";
    process.env.PUZZLE_GENERATOR_URL = "https://generator.internal";
  });

  it("returns 401 when the cron secret is missing or invalid", async () => {
    const request = new NextRequest("http://localhost/api/cron/generate-daily");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the create payload when a challenge is generated", async () => {
    createTomorrowDailyChallengeIfMissingMock.mockResolvedValue({
      created: true,
      challenge: {
        date: new Date("2026-03-18T00:00:00.000Z"),
        number: 19,
        puzzle: {
          id: "puzzle-19",
          difficulty: "medium",
        },
      },
    });

    const request = new NextRequest("http://localhost/api/cron/generate-daily", {
      headers: { authorization: "Bearer secret-1" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      date: "2026-03-18T00:00:00.000Z",
      number: 19,
      puzzleId: "puzzle-19",
      difficulty: "medium",
    });
  });

  it("returns a safe skip payload when tomorrow already exists", async () => {
    createTomorrowDailyChallengeIfMissingMock.mockResolvedValue({
      created: false,
      challenge: {
        date: new Date("2026-03-18T00:00:00.000Z"),
        number: 19,
        puzzle: {
          id: "puzzle-19",
        },
      },
    });

    const request = new NextRequest("http://localhost/api/cron/generate-daily", {
      headers: { authorization: "Bearer secret-1" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      skipped: true,
      date: "2026-03-18T00:00:00.000Z",
      number: 19,
    });
  });

  it("returns 500 when the generator fails", async () => {
    createTomorrowDailyChallengeIfMissingMock.mockRejectedValue(new Error("boom"));

    const request = new NextRequest("http://localhost/api/cron/generate-daily", {
      headers: { authorization: "Bearer secret-1" },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Puzzle generation failed" });
    expect(logRequestErrorMock).toHaveBeenCalled();
  });
});
