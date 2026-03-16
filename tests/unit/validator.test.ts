import { describe, expect, it } from "vitest";
import { getConflicts, getThreatenedCells, isSolved } from "@/lib/puzzle/validator";

describe("puzzle validator", () => {
  it("detects row/column/region/adjacent conflicts", () => {
    const grid = [
      [1, 1, 2],
      [3, 2, 2],
      [3, 3, 1],
    ];

    const conflicts = getConflicts(grid, [
      [0, 0],
      [0, 2],
      [1, 1],
    ]);

    expect(conflicts.has("0,0")).toBe(true);
    expect(conflicts.has("0,2")).toBe(true);
    expect(conflicts.has("1,1")).toBe(true);
  });

  it("reports solved and unsolved boards correctly", () => {
    expect(isSolved([[1]], [[0, 0]])).toBe(true);
    expect(
      isSolved(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [0, 0],
          [0, 1],
        ]
      )
    ).toBe(false);
  });

  it("returns threatened queen cells for a selected cell", () => {
    const grid = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const queens: [number, number][] = [
      [0, 2],
      [2, 0],
      [1, 1],
    ];

    const threatened = getThreatenedCells(grid, queens, 0, 0);

    expect(threatened.has("0,2")).toBe(true);
    expect(threatened.has("2,0")).toBe(true);
    expect(threatened.has("1,1")).toBe(true);
    expect(threatened.has("2,2")).toBe(false);
  });
});

