import { cellKey } from "@/lib/game-engine/boardState";
import type {
  BoardState,
  CellCoord,
  ConflictType,
  PuzzleDefinition,
  RegionGrid,
  ValidationResult,
} from "@/lib/game-engine/types";

export function createPuzzleDefinition(grid: RegionGrid): PuzzleDefinition {
  const regionIds = Array.from(new Set(grid.flat())).sort((left, right) => left - right);
  const regionIndex = new Map(regionIds.map((regionId, index) => [regionId, index]));
  const normalizedGrid = grid.map((row) => row.map((regionId) => regionIndex.get(regionId) ?? 0));

  return {
    size: grid.length,
    regionCount: regionIds.length,
    regions: normalizedGrid,
  };
}

export function validateBoard(puzzle: PuzzleDefinition, board: BoardState): ValidationResult {
  const rowCounts = Array.from({ length: puzzle.size }, () => 0);
  const columnCounts = Array.from({ length: puzzle.size }, () => 0);
  const regionCounts = Array.from({ length: puzzle.regionCount }, () => 0);
  const rowQueens = Array.from({ length: puzzle.size }, () => [] as CellCoord[]);
  const columnQueens = Array.from({ length: puzzle.size }, () => [] as CellCoord[]);
  const regionQueens = Array.from({ length: puzzle.regionCount }, () => [] as CellCoord[]);
  const queenCells: CellCoord[] = [];
  const conflictsByCell: ValidationResult["conflictsByCell"] = {};

  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      if (!board.queens[row][col]) {
        continue;
      }

      const cell = { row, col };
      const regionId = puzzle.regions[row][col];
      queenCells.push(cell);
      rowCounts[row] += 1;
      columnCounts[col] += 1;
      regionCounts[regionId] += 1;
      rowQueens[row].push(cell);
      columnQueens[col].push(cell);
      regionQueens[regionId].push(cell);
    }
  }

  const rowConflicts = collectGroupConflicts(rowQueens, conflictsByCell, "row");
  const columnConflicts = collectGroupConflicts(columnQueens, conflictsByCell, "column");
  const regionConflicts = collectGroupConflicts(regionQueens, conflictsByCell, "region");

  const touchPairs: Array<[CellCoord, CellCoord]> = [];
  for (let index = 0; index < queenCells.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < queenCells.length; compareIndex += 1) {
      const first = queenCells[index];
      const second = queenCells[compareIndex];

      if (!touches(first, second)) {
        continue;
      }

      touchPairs.push([first, second]);
      addConflict(conflictsByCell, first, "touch");
      addConflict(conflictsByCell, second, "touch");
    }
  }

  const isSolved =
    queenCells.length === puzzle.size &&
    rowCounts.every((count) => count === 1) &&
    columnCounts.every((count) => count === 1) &&
    regionCounts.every((count) => count === 1) &&
    touchPairs.length === 0;

  return {
    queenCount: queenCells.length,
    rowCounts,
    columnCounts,
    regionCounts,
    rowConflicts,
    columnConflicts,
    regionConflicts,
    touchPairs,
    conflictsByCell,
    isSolved,
  };
}

export function conflictMapToSet(conflictsByCell: ValidationResult["conflictsByCell"]): Set<string> {
  return new Set(Object.keys(conflictsByCell));
}

function collectGroupConflicts(
  groups: CellCoord[][],
  conflictsByCell: ValidationResult["conflictsByCell"],
  type: ConflictType,
): number[] {
  const offenders: number[] = [];

  groups.forEach((cells, groupIndex) => {
    if (cells.length <= 1) {
      return;
    }

    offenders.push(groupIndex);
    cells.forEach((cell) => addConflict(conflictsByCell, cell, type));
  });

  return offenders;
}

function touches(left: CellCoord, right: CellCoord): boolean {
  return (
    Math.abs(left.row - right.row) <= 1 &&
    Math.abs(left.col - right.col) <= 1 &&
    !(left.row === right.row && left.col === right.col)
  );
}

function addConflict(
  conflictsByCell: ValidationResult["conflictsByCell"],
  cell: CellCoord,
  type: ConflictType,
): void {
  const key = cellKey(cell);
  const existing = conflictsByCell[key] ?? [];

  if (!existing.includes(type)) {
    conflictsByCell[key] = [...existing, type];
  }
}
