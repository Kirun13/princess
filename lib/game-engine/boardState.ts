import type { BoardState, CellCoord, CellKey } from "@/lib/game-engine/types";

export type CellFillState = "empty" | "mark" | "queen";

export function createBoardState(size: number): BoardState {
  return {
    size,
    queens: createMatrix(size, false),
    marks: createMatrix(size, false),
  };
}

export function cellKey(cell: CellCoord): CellKey {
  return `${cell.row},${cell.col}`;
}

export function sameCell(left: CellCoord | null, right: CellCoord | null): boolean {
  return Boolean(left && right && left.row === right.row && left.col === right.col);
}

export function inBounds(size: number, cell: CellCoord): boolean {
  return cell.row >= 0 && cell.col >= 0 && cell.row < size && cell.col < size;
}

export function hasQueen(state: BoardState, cell: CellCoord): boolean {
  return state.queens[cell.row]?.[cell.col] ?? false;
}

export function hasMark(state: BoardState, cell: CellCoord): boolean {
  return state.marks[cell.row]?.[cell.col] ?? false;
}

export function setQueen(state: BoardState, cell: CellCoord, value: boolean): BoardState {
  if (!inBounds(state.size, cell)) {
    return state;
  }

  const nextQueens = updateMatrix(state.queens, cell, value);
  const nextMarks = value ? updateMatrix(state.marks, cell, false) : state.marks;

  if (nextQueens === state.queens && nextMarks === state.marks) {
    return state;
  }

  return {
    ...state,
    queens: nextQueens,
    marks: nextMarks,
  };
}

export function toggleQueen(state: BoardState, cell: CellCoord): BoardState {
  return setQueen(state, cell, !hasQueen(state, cell));
}

export function setMark(state: BoardState, cell: CellCoord, marked: boolean): BoardState {
  if (!inBounds(state.size, cell) || hasQueen(state, cell)) {
    return state;
  }

  const nextMarks = updateMatrix(state.marks, cell, marked);
  if (nextMarks === state.marks) {
    return state;
  }

  return {
    ...state,
    marks: nextMarks,
  };
}

export function toggleMark(state: BoardState, cell: CellCoord): BoardState {
  return setMark(state, cell, !hasMark(state, cell));
}

export function clearCell(state: BoardState, cell: CellCoord): BoardState {
  if (!inBounds(state.size, cell)) {
    return state;
  }

  const nextQueens = updateMatrix(state.queens, cell, false);
  const nextMarks = updateMatrix(state.marks, cell, false);

  if (nextQueens === state.queens && nextMarks === state.marks) {
    return state;
  }

  return {
    ...state,
    queens: nextQueens,
    marks: nextMarks,
  };
}

export function setCellFillState(
  state: BoardState,
  cell: CellCoord,
  nextState: CellFillState,
): BoardState {
  if (!inBounds(state.size, cell)) {
    return state;
  }

  if (nextState === "empty") {
    return clearCell(state, cell);
  }

  if (nextState === "mark") {
    return setMark(setQueen(state, cell, false), cell, true);
  }

  return setQueen(setMark(state, cell, false), cell, true);
}

export function boardToQueens(state: BoardState): [number, number][] {
  const queens: [number, number][] = [];

  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      if (state.queens[row][col]) {
        queens.push([row, col]);
      }
    }
  }

  return queens;
}

export function boardToMarks(state: BoardState): Set<string> {
  const marks = new Set<string>();

  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      if (state.marks[row][col]) {
        marks.add(`${row},${col}`);
      }
    }
  }

  return marks;
}

function createMatrix(size: number, value: boolean): boolean[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value));
}

function updateMatrix(matrix: boolean[][], cell: CellCoord, value: boolean): boolean[][] {
  if (matrix[cell.row]?.[cell.col] === value) {
    return matrix;
  }

  const next = matrix.map((currentRow, rowIndex) =>
    rowIndex === cell.row ? [...currentRow] : currentRow,
  );
  next[cell.row][cell.col] = value;
  return next;
}
