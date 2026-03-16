import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/lib/store/gameStore";

function loadDefaultPuzzle() {
  useGameStore
    .getState()
    .loadPuzzle(
      [
        [0, 1],
        [1, 0],
      ],
      "puzzle-1",
      "start-token"
    );
}

describe("game store", () => {
  beforeEach(() => {
    vi.useRealTimers();
    useGameStore.setState({
      grid: null,
      size: 0,
      puzzleId: null,
      queens: [],
      conflicts: new Set(),
      marks: new Set<string>(),
      startedAt: null,
      activeMs: 0,
      isPaused: false,
      pausedAt: null,
      isSolved: false,
      startToken: null,
      isHowToPlayOpen: false,
    });
  });

  it("cycles a cell through empty -> mark -> queen -> empty", () => {
    loadDefaultPuzzle();

    useGameStore.getState().cycleCell(0, 0);
    expect(useGameStore.getState().marks.has("0,0")).toBe(true);

    useGameStore.getState().cycleCell(0, 0);
    expect(useGameStore.getState().marks.has("0,0")).toBe(false);
    expect(useGameStore.getState().queens).toContainEqual([0, 0]);

    useGameStore.getState().cycleCell(0, 0);
    expect(useGameStore.getState().queens).toHaveLength(0);
  });

  it("tracks active time across pause and resume", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    loadDefaultPuzzle();

    vi.advanceTimersByTime(5_000);
    expect(useGameStore.getState().getActiveMs()).toBe(5_000);

    useGameStore.getState().pause();
    vi.advanceTimersByTime(5_000);
    expect(useGameStore.getState().getActiveMs()).toBe(5_000);

    useGameStore.getState().resume();
    vi.advanceTimersByTime(2_000);
    expect(useGameStore.getState().getActiveMs()).toBe(7_000);
  });

  it("auto-resumes when how-to-play modal caused pause", () => {
    loadDefaultPuzzle();

    useGameStore.getState().openHowToPlay();
    expect(useGameStore.getState().isPaused).toBe(true);
    expect(useGameStore.getState().isHowToPlayOpen).toBe(true);

    useGameStore.getState().closeHowToPlay();
    expect(useGameStore.getState().isHowToPlayOpen).toBe(false);
    expect(useGameStore.getState().isPaused).toBe(false);
  });
});

