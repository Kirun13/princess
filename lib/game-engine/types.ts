export interface CellCoord {
  row: number;
  col: number;
}

export type CellKey = `${number},${number}`;
export type ConflictType = "row" | "column" | "region" | "touch";
export type RegionGrid = number[][];

export interface PuzzleDefinition {
  size: number;
  regionCount: number;
  regions: RegionGrid;
}

export interface BoardState {
  size: number;
  queens: boolean[][];
  marks: boolean[][];
}

export type ConflictMap = Partial<Record<CellKey, ConflictType[]>>;

export interface ValidationResult {
  queenCount: number;
  rowCounts: number[];
  columnCounts: number[];
  regionCounts: number[];
  rowConflicts: number[];
  columnConflicts: number[];
  regionConflicts: number[];
  touchPairs: Array<[CellCoord, CellCoord]>;
  conflictsByCell: ConflictMap;
  isSolved: boolean;
}
