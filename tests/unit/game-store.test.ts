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
      board: null,
      validation: null,
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

  it("keeps canonical board matrices while exposing queen positions for solve payloads", () => {
    useGameStore.getState().loadPuzzle([[0]], "single-cell", "start-token");

    useGameStore.getState().placeQueen(0, 0);

    expect(useGameStore.getState().board?.queens[0][0]).toBe(true);
    expect(useGameStore.getState().queens).toEqual([[0, 0]]);
    expect(useGameStore.getState().isSolved).toBe(true);
  });

  it("derives conflicts from the engine validation layer", () => {
    useGameStore.getState().loadPuzzle(
      [
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [2, 2, 3, 3],
        [2, 2, 3, 3],
      ],
      "conflict-puzzle",
      "start-token",
    );

    useGameStore.getState().placeQueen(0, 0);
    useGameStore.getState().placeQueen(0, 2);

    expect(useGameStore.getState().conflicts.has("0,0")).toBe(true);
    expect(useGameStore.getState().conflicts.has("0,2")).toBe(true);
    expect(useGameStore.getState().validation?.rowConflicts).toEqual([0]);
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

  it("clears the board without restarting the timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    loadDefaultPuzzle();

    useGameStore.getState().placeQueen(0, 0);
    vi.advanceTimersByTime(5_000);

    useGameStore.getState().reset();

    expect(useGameStore.getState().queens).toHaveLength(0);
    expect(useGameStore.getState().marks.size).toBe(0);
    expect(useGameStore.getState().getActiveMs()).toBe(5_000);

    vi.advanceTimersByTime(2_000);
    expect(useGameStore.getState().getActiveMs()).toBe(7_000);
  });

  it("restarts the board with a fresh timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    loadDefaultPuzzle();

    useGameStore.getState().placeQueen(0, 0);
    vi.advanceTimersByTime(5_000);

    useGameStore.getState().restart();

    expect(useGameStore.getState().queens).toHaveLength(0);
    expect(useGameStore.getState().marks.size).toBe(0);
    expect(useGameStore.getState().getActiveMs()).toBe(0);

    vi.advanceTimersByTime(2_000);
    expect(useGameStore.getState().getActiveMs()).toBe(2_000);
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

