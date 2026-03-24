import { createBoardState, setQueen } from "@/lib/game-engine/boardState";
import { conflictMapToSet, createPuzzleDefinition, validateBoard } from "@/lib/game-engine/validation";
import type { RegionGrid } from "@/lib/game-engine/types";

export type Grid = RegionGrid;
export type Queens = [number, number][];
export type ConflictSet = Set<string>;

function key(r: number, c: number): string {
  return `${r},${c}`;
}

export function getConflicts(grid: Grid, queens: Queens): ConflictSet {
  const board = boardFromQueens(grid, queens);
  const validation = validateBoard(createPuzzleDefinition(grid), board);
  return conflictMapToSet(validation.conflictsByCell);
}

export function isSolved(grid: Grid, queens: Queens): boolean {
  const board = boardFromQueens(grid, queens);
  return validateBoard(createPuzzleDefinition(grid), board).isSolved;
}

export function getThreatenedCells(
  grid: Grid,
  queens: Queens,
  row: number,
  col: number,
): ConflictSet {
  const threatened: ConflictSet = new Set();
  const region = grid[row][col];
  const size = grid.length;

  for (let currentRow = 0; currentRow < size; currentRow += 1) {
    for (let currentCol = 0; currentCol < size; currentCol += 1) {
      if (currentRow === row && currentCol === col) {
        continue;
      }

      const sameRow = currentRow === row;
      const sameCol = currentCol === col;
      const sameRegion = grid[currentRow][currentCol] === region;
      const adjacent = Math.abs(currentRow - row) <= 1 && Math.abs(currentCol - col) <= 1;

      if (
        (sameRow || sameCol || sameRegion || adjacent) &&
        queens.some(([queenRow, queenCol]) => queenRow === currentRow && queenCol === currentCol)
      ) {
        threatened.add(key(currentRow, currentCol));
      }
    }
  }

  return threatened;
}

function boardFromQueens(grid: Grid, queens: Queens) {
  return queens.reduce((board, [row, col]) => setQueen(board, { row, col }, true), createBoardState(grid.length));
}
