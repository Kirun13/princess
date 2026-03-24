import { describe, expect, it } from "vitest";
import {
  createBoardState,
  setQueen,
  toggleMark,
  toggleQueen,
} from "@/lib/game-engine/boardState";
import { createPuzzleDefinition, validateBoard } from "@/lib/game-engine/validation";

const TEST_GRID = [
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [2, 2, 3, 3],
  [2, 2, 3, 3],
];

describe("game engine board state", () => {
  it("places and removes queens while clearing marks on the same cell", () => {
    let board = createBoardState(4);
    board = toggleMark(board, { row: 1, col: 1 });
    expect(board.marks[1][1]).toBe(true);

    board = toggleQueen(board, { row: 1, col: 1 });
    expect(board.queens[1][1]).toBe(true);
    expect(board.marks[1][1]).toBe(false);

    board = toggleQueen(board, { row: 1, col: 1 });
    expect(board.queens[1][1]).toBe(false);
  });
});

describe("game engine validation", () => {
  it("detects row, column, region, and touch conflicts", () => {
    let board = createBoardState(4);
    board = setQueen(board, { row: 0, col: 0 }, true);
    board = setQueen(board, { row: 0, col: 2 }, true);
    board = setQueen(board, { row: 2, col: 0 }, true);
    board = setQueen(board, { row: 1, col: 1 }, true);

    const validation = validateBoard(createPuzzleDefinition(TEST_GRID), board);

    expect(validation.rowConflicts).toEqual([0]);
    expect(validation.columnConflicts).toEqual([0]);
    expect(validation.regionConflicts).toEqual([0]);
    expect(validation.touchPairs.length).toBeGreaterThan(0);
    expect(validation.conflictsByCell["0,0"]).toEqual(
      expect.arrayContaining(["row", "column", "region", "touch"]),
    );
  });

  it("recognizes a solved board for a valid queens placement", () => {
    let board = createBoardState(4);
    board = setQueen(board, { row: 0, col: 2 }, true);
    board = setQueen(board, { row: 1, col: 0 }, true);
    board = setQueen(board, { row: 2, col: 3 }, true);
    board = setQueen(board, { row: 3, col: 1 }, true);

    const validation = validateBoard(createPuzzleDefinition(TEST_GRID), board);

    expect(validation.isSolved).toBe(true);
    expect(validation.touchPairs).toHaveLength(0);
    expect(validation.rowConflicts).toHaveLength(0);
    expect(validation.columnConflicts).toHaveLength(0);
    expect(validation.regionConflicts).toHaveLength(0);
  });
});
