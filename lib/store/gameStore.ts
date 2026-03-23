import { create } from "zustand";
import {
  boardToMarks,
  boardToQueens,
  clearCell,
  createBoardState,
  setCellFillState,
  setQueen,
} from "@/lib/game-engine/boardState";
import {
  conflictMapToSet,
  createPuzzleDefinition,
  validateBoard,
} from "@/lib/game-engine/validation";
import type { BoardState, ValidationResult } from "@/lib/game-engine/types";
import {
  type Grid,
  type Queens,
  type ConflictSet,
} from "@/lib/puzzle/validator";

type GameState = {
  // Puzzle data
  grid: Grid | null;
  size: number;
  puzzleId: string | null;
  board: BoardState | null;
  validation: ValidationResult | null;

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

function deriveBoardView(grid: Grid, board: BoardState) {
  const validation = validateBoard(createPuzzleDefinition(grid), board);

  return {
    size: grid.length,
    board,
    validation,
    queens: boardToQueens(board),
    marks: boardToMarks(board),
    conflicts: conflictMapToSet(validation.conflictsByCell),
    isSolved: validation.isSolved,
  };
}

// Tracks whether openHowToPlay() caused the pause (so closeHowToPlay can auto-resume)
let _htpCausedPause = false;

export const useGameStore = create<GameState>((set, get) => ({
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

  loadPuzzle(grid, puzzleId, startToken) {
    const board = createBoardState(grid.length);
    set({
      grid,
      puzzleId,
      startToken,
      isHowToPlayOpen: false,
      startedAt: Date.now(),
      activeMs: 0,
      isPaused: false,
      pausedAt: null,
      ...deriveBoardView(grid, board),
    });
  },

  placeQueen(row, col) {
    const { grid, board } = get();
    if (!grid || !board) return;
    set(deriveBoardView(grid, setQueen(board, { row, col }, true)));
  },

  removeQueen(row, col) {
    const { grid, board } = get();
    if (!grid || !board) return;
    set(deriveBoardView(grid, setQueen(board, { row, col }, false)));
  },

  toggleQueen(row, col) {
    const { queens } = get();
    const exists = queens.some(([queenRow, queenCol]) => queenRow === row && queenCol === col);
    if (exists) {
      get().removeQueen(row, col);
    } else {
      get().placeQueen(row, col);
    }
  },

  // empty → mark → queen → empty
  cycleCell(row, col) {
    const { grid, board, queens, marks, isSolved } = get();
    if (!grid || !board || isSolved) return;
    const key = `${row},${col}`;
    const hasQueen = queens.some(([r, c]) => r === row && c === col);
    if (hasQueen) {
      set(deriveBoardView(grid, clearCell(board, { row, col })));
    } else if (marks.has(key)) {
      set(deriveBoardView(grid, setCellFillState(board, { row, col }, "queen")));
    } else {
      set(deriveBoardView(grid, setCellFillState(board, { row, col }, "mark")));
    }
  },

  // Directly set cell to a specific state (used for drag-painting)
  setCellState(row, col, state) {
    const { grid, board, isSolved } = get();
    if (!grid || !board || isSolved) return;
    set(deriveBoardView(grid, setCellFillState(board, { row, col }, state)));
  },

  // right-click: remove queen or mark → empty
  removeCell(row, col) {
    const { grid, board } = get();
    if (!grid || !board) return;
    set(deriveBoardView(grid, clearCell(board, { row, col })));
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
    const board = createBoardState(grid.length);
    set({
      startedAt: Date.now(),
      activeMs: 0,
      isPaused: false,
      pausedAt: null,
      ...deriveBoardView(grid, board),
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
