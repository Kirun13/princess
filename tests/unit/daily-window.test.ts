import { describe, expect, it, vi } from "vitest";
import {
  getMsUntilNextUtcMidnight,
  getNextUtcMidnight,
  getUtcDayWindow,
} from "@/lib/daily-window";

describe("daily UTC window helpers", () => {
  it("builds the correct UTC window before midnight", () => {
    const now = new Date("2026-03-17T23:59:58.500Z");
    const window = getUtcDayWindow(now);

    expect(window.todayStartUtc.toISOString()).toBe("2026-03-17T00:00:00.000Z");
    expect(window.todayEndUtc.toISOString()).toBe("2026-03-17T23:59:59.999Z");
    expect(window.tomorrowStartUtc.toISOString()).toBe("2026-03-18T00:00:00.000Z");
  });

  it("builds the correct UTC window after midnight", () => {
    const now = new Date("2026-03-18T00:00:01.000Z");
    const window = getUtcDayWindow(now);

    expect(window.todayStartUtc.toISOString()).toBe("2026-03-18T00:00:00.000Z");
    expect(window.todayEndUtc.toISOString()).toBe("2026-03-18T23:59:59.999Z");
    expect(window.tomorrowStartUtc.toISOString()).toBe("2026-03-19T00:00:00.000Z");
  });

  it("keeps UTC boundaries stable regardless of local timezone offset", () => {
    const now = new Date("2026-03-17T18:30:00.000-05:00");
    const window = getUtcDayWindow(now);

    expect(window.todayStartUtc.toISOString()).toBe("2026-03-17T00:00:00.000Z");
    expect(window.tomorrowStartUtc.toISOString()).toBe("2026-03-18T00:00:00.000Z");
  });

  it("computes the next UTC midnight countdown from the same source of truth", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T23:59:30.000Z"));

    expect(getNextUtcMidnight().toISOString()).toBe("2026-03-18T00:00:00.000Z");
    expect(getMsUntilNextUtcMidnight()).toBe(30_000);

    vi.useRealTimers();
  });
});
