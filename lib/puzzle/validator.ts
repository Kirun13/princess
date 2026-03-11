export type Grid = number[][];
export type Queens = [number, number][];
export type ConflictSet = Set<string>;

function key(r: number, c: number): string {
  return `${r},${c}`;
}

export function getConflicts(grid: Grid, queens: Queens): ConflictSet {
  const conflicts: ConflictSet = new Set();

  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const [r1, c1] = queens[i];
      const [r2, c2] = queens[j];

      const rowConflict = r1 === r2;
      const colConflict = c1 === c2;
      const regionConflict = grid[r1][c1] === grid[r2][c2];
      const adjacentConflict =
        Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;

      if (rowConflict || colConflict || regionConflict || adjacentConflict) {
        conflicts.add(key(r1, c1));
        conflicts.add(key(r2, c2));
      }
    }
  }

  return conflicts;
}

export function isSolved(grid: Grid, queens: Queens): boolean {
  const n = grid.length;
  if (queens.length !== n) return false;
  return getConflicts(grid, queens).size === 0;
}

export function getThreatenedCells(
  grid: Grid,
  queens: Queens,
  row: number,
  col: number
): ConflictSet {
  const threatened: ConflictSet = new Set();
  const region = grid[row][col];
  const n = grid.length;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r === row && c === col) continue;
      const sameRow = r === row;
      const sameCol = c === col;
      const sameRegion = grid[r][c] === region;
      const adjacent = Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1;

      if (sameRow || sameCol || sameRegion || adjacent) {
        // Only mark cells that have a queen placed there
        if (queens.some(([qr, qc]) => qr === r && qc === c)) {
          threatened.add(key(r, c));
        }
      }
    }
  }

  return threatened;
}
