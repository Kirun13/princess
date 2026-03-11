import { create } from "zustand";
import {
  type Grid,
  type Queens,
  type ConflictSet,
  getConflicts,
  isSolved as checkSolved,
} from "@/lib/puzzle/validator";

type GameState = {
  // Puzzle data
  grid: Grid | null;
  size: number;
  puzzleId: string | null;

  // Queens & marks
  queens: Queens;
  conflicts: ConflictSet;
  marks: Set<string>;

  // Timer — tracks active (non-paused) milliseconds
  startedAt: number | null;
  activeMs: number;
  isPaused: boolean;
  pausedAt: number | null;

  // Status
  isSolved: boolean;
  startToken: string | null;

  // How-to-play overlay (separate from pause — keeps PauseModal from showing)
  isHowToPlayOpen: boolean;

  // Actions
  loadPuzzle: (grid: Grid, puzzleId: string, startToken: string | null) => void;
  placeQueen: (row: number, col: number) => void;
  removeQueen: (row: number, col: number) => void;
  toggleQueen: (row: number, col: number) => void;
  cycleCell: (row: number, col: number) => void;
  setCellState: (row: number, col: number, state: "empty" | "mark" | "queen") => void;
  removeCell: (row: number, col: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  getActiveMs: () => number;
  openHowToPlay: () => void;
  closeHowToPlay: () => void;
};

function recompute(
  grid: Grid,
  queens: Queens
): { conflicts: ConflictSet; isSolved: boolean } {
  const conflicts = getConflicts(grid, queens);
  return { conflicts, isSolved: checkSolved(grid, queens) };
}

// Tracks whether openHowToPlay() caused the pause (so closeHowToPlay can auto-resume)
let _htpCausedPause = false;

export const useGameStore = create<GameState>((set, get) => ({
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

  loadPuzzle(grid, puzzleId, startToken) {
    set({
      grid,
      size: grid.length,
      puzzleId,
      startToken,
      queens: [],
      conflicts: new Set(),
      marks: new Set<string>(),
      isSolved: false,
      isHowToPlayOpen: false,
      startedAt: Date.now(),
      activeMs: 0,
      isPaused: false,
      pausedAt: null,
    });
  },

  placeQueen(row, col) {
    const { grid, queens } = get();
    if (!grid) return;
    const already = queens.some(([r, c]) => r === row && c === col);
    if (already) return;
    const next: Queens = [...queens, [row, col]];
    set({ queens: next, ...recompute(grid, next) });
  },

  removeQueen(row, col) {
    const { grid, queens } = get();
    if (!grid) return;
    const next: Queens = queens.filter(([r, c]) => !(r === row && c === col));
    set({ queens: next, ...recompute(grid, next) });
  },

  toggleQueen(row, col) {
    const { queens } = get();
    const exists = queens.some(([r, c]) => r === row && c === col);
    if (exists) {
      get().removeQueen(row, col);
    } else {
      get().placeQueen(row, col);
    }
  },

  // empty → mark → queen → empty
  cycleCell(row, col) {
    const { grid, queens, marks, isSolved } = get();
    if (!grid || isSolved) return;
    const key = `${row},${col}`;
    const hasQueen = queens.some(([r, c]) => r === row && c === col);
    if (hasQueen) {
      // queen → empty
      const next: Queens = queens.filter(([r, c]) => !(r === row && c === col));
      set({ queens: next, ...recompute(grid, next) });
    } else if (marks.has(key)) {
      // mark → queen
      const nextMarks = new Set(marks);
      nextMarks.delete(key);
      const next: Queens = [...queens, [row, col]];
      set({ marks: nextMarks, queens: next, ...recompute(grid, next) });
    } else {
      // empty → mark
      const nextMarks = new Set(marks);
      nextMarks.add(key);
      set({ marks: nextMarks });
    }
  },

  // Directly set cell to a specific state (used for drag-painting)
  setCellState(row, col, state) {
    const { grid, queens, marks, isSolved } = get();
    if (!grid || isSolved) return;
    const key = `${row},${col}`;
    const hasQueen = queens.some(([r, c]) => r === row && c === col);
    if (state === "empty") {
      if (hasQueen) {
        const next: Queens = queens.filter(([r, c]) => !(r === row && c === col));
        const nextMarks = new Set(marks);
        nextMarks.delete(key);
        set({ queens: next, marks: nextMarks, ...recompute(grid, next) });
      } else if (marks.has(key)) {
        const nextMarks = new Set(marks);
        nextMarks.delete(key);
        set({ marks: nextMarks });
      }
    } else if (state === "mark") {
      const nextQueens = hasQueen
        ? queens.filter(([r, c]) => !(r === row && c === col))
        : queens;
      const nextMarks = new Set(marks);
      nextMarks.add(key);
      if (hasQueen) {
        set({ queens: nextQueens, marks: nextMarks, ...recompute(grid, nextQueens) });
      } else {
        set({ marks: nextMarks });
      }
    } else {
      // queen
      const nextMarks = new Set(marks);
      nextMarks.delete(key);
      if (!hasQueen) {
        const next: Queens = [...queens, [row, col]];
        set({ marks: nextMarks, queens: next, ...recompute(grid, next) });
      } else {
        set({ marks: nextMarks });
      }
    }
  },

  // right-click: remove queen or mark → empty
  removeCell(row, col) {
    const { grid, queens, marks } = get();
    if (!grid) return;
    const key = `${row},${col}`;
    const hasQueen = queens.some(([r, c]) => r === row && c === col);
    if (hasQueen) {
      const next: Queens = queens.filter(([r, c]) => !(r === row && c === col));
      set({ queens: next, ...recompute(grid, next) });
    } else if (marks.has(key)) {
      const nextMarks = new Set(marks);
      nextMarks.delete(key);
      set({ marks: nextMarks });
    }
  },

  pause() {
    const { isPaused, startedAt, activeMs } = get();
    if (isPaused || startedAt === null) return;
    const now = Date.now();
    set({
      isPaused: true,
      pausedAt: now,
      activeMs: activeMs + (now - startedAt),
      startedAt: null,
    });
  },

  resume() {
    const { isPaused } = get();
    if (!isPaused) return;
    set({
      isPaused: false,
      pausedAt: null,
      startedAt: Date.now(),
    });
  },

  reset() {
    const { grid } = get();
    if (!grid) return;
    set({
      queens: [],
      conflicts: new Set(),
      marks: new Set<string>(),
      isSolved: false,
      startedAt: Date.now(),
      activeMs: 0,
      isPaused: false,
      pausedAt: null,
    });
  },

  getActiveMs() {
    const { activeMs, isPaused, startedAt } = get();
    if (isPaused || startedAt === null) return activeMs;
    return activeMs + (Date.now() - startedAt);
  },

  // module-level flag to remember if HTP caused the pause
  openHowToPlay() {
    const { isSolved, isPaused } = get();
    if (!isSolved && !isPaused) {
      get().pause();
      set({ isHowToPlayOpen: true });
      // mark that we paused for HTP via a closure variable below
      _htpCausedPause = true;
    } else {
      _htpCausedPause = false;
      set({ isHowToPlayOpen: true });
    }
  },

  closeHowToPlay() {
    set({ isHowToPlayOpen: false });
    if (_htpCausedPause) {
      _htpCausedPause = false;
      get().resume();
    }
  },
}));
