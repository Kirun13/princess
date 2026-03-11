"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import GameCell from "./GameCell";
import type { Grid } from "@/lib/puzzle/validator";

/** Resolve cell [row, col] from a screen coordinate, walking up the DOM. */
function getCellFromPoint(x: number, y: number): [number, number] | null {
  const el = document.elementFromPoint(x, y);
  const cellEl = el?.closest('[id^="cell-"]') as HTMLElement | null;
  const match = cellEl?.id?.match(/^cell-(\d+)-(\d+)$/);
  return match ? [parseInt(match[1]), parseInt(match[2])] : null;
}

type GameBoardProps = {
  grid: Grid;
  puzzleId: string;
  startToken: string | null;
};

/** Determine toggle result for a cell: empty→mark, mark→empty, queen→empty */
function toggleResult(
  r: number,
  c: number,
  queens: [number, number][],
  marks: Set<string>
): "mark" | "empty" {
  const hasQueen = queens.some(([qr, qc]) => qr === r && qc === c);
  return hasQueen || marks.has(`${r},${c}`) ? "empty" : "mark";
}

export default function GameBoard({ grid, puzzleId, startToken }: GameBoardProps) {
  const loadPuzzle = useGameStore((s) => s.loadPuzzle);
  const queens = useGameStore((s) => s.queens);
  const marks = useGameStore((s) => s.marks);
  const conflicts = useGameStore((s) => s.conflicts);
  const isSolved = useGameStore((s) => s.isSolved);

  const size = grid.length;
  const [, setFocusedCell] = useState<[number, number]>([0, 0]);

  // ── Responsive cell size ─────────────────────────────────────────────────
  // Null on first render (SSR-safe); computed on client so board never overflows.
  const [cellPx, setCellPx] = useState<number | null>(null);
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      if (vw >= 768) { setCellPx(null); return; } // md+: handled by CSS classes
      const defaultPx = vw >= 640 ? 52 : 46;
      const available = vw - 32; // 16px padding × 2 from GameClient px-4
      const maxPx = Math.floor((available - (size - 1) * 3 - 6) / size);
      setCellPx(Math.min(defaultPx, Math.max(28, maxPx)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [size]);

  // ── Drag refs ────────────────────────────────────────────────────────────
  const isDragging = useRef(false);
  const dragAction = useRef<"mark" | "empty" | null>(null);
  const dragStartCell = useRef<[number, number] | null>(null);
  const dragVisited = useRef(new Set<string>());
  /** true once the pointer left the start cell (confirms it's a drag, not a click) */
  const hasDragged = useRef(false);

  // ── Double-click timer ───────────────────────────────────────────────────
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Keyboard Space-drag refs ─────────────────────────────────────────────
  const spaceHeld = useRef(false);
  const spaceAction = useRef<"mark" | "empty" | null>(null);

  useEffect(() => {
    loadPuzzle(grid, puzzleId, startToken ?? "");
  }, [grid, puzzleId, startToken, loadPuzzle]);

  // Clear timer on unmount
  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); }, []);

  // End drag on mouseup anywhere
  useEffect(() => {
    const endDrag = () => {
      isDragging.current = false;
      dragAction.current = null;
      dragStartCell.current = null;
      dragVisited.current.clear();
    };
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);
    return () => {
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchend", endDrag);
    };
  }, []);

  // Track Space held for keyboard-drag mode
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === " ") spaceHeld.current = true; };
    const onUp   = (e: KeyboardEvent) => {
      if (e.key === " ") { spaceHeld.current = false; spaceAction.current = null; }
    };
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup",   onUp);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup",   onUp);
    };
  }, []);

  const queenSet = new Set(queens.map(([r, c]) => `${r},${c}`));

  const moveFocus = useCallback(
    (row: number, col: number): [number, number] => {
      const r = Math.max(0, Math.min(size - 1, row));
      const c = Math.max(0, Math.min(size - 1, col));
      setFocusedCell([r, c]);
      document.getElementById(`cell-${r}-${c}`)?.focus();
      return [r, c];
    },
    [size]
  );

  // ── Mouse handlers ───────────────────────────────────────────────────────

  /** Record drag start — do NOT modify state yet (onClick handles the click case) */
  const handleCellMouseDown = useCallback((r: number, c: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const { isSolved, queens, marks } = useGameStore.getState();
    if (isSolved) return;
    // If starting on a queen, disable drag (queen is immovable via drag)
    const hasQueen = queens.some(([qr, qc]) => qr === r && qc === c);
    dragAction.current = hasQueen ? null : toggleResult(r, c, queens, marks);
    dragStartCell.current = [r, c];
    dragVisited.current.clear();
    isDragging.current = true;
    hasDragged.current = false;
  }, []);

  /**
   * On entering a new cell while dragging:
   * - Skip if re-entering the start cell (avoids accidental paint)
   * - Apply drag action to start cell first, then to this cell
   */
  const handleCellMouseEnter = useCallback((r: number, c: number) => {
    if (!isDragging.current || !dragAction.current || !dragStartCell.current) return;
    const [sr, sc] = dragStartCell.current;
    if (r === sr && c === sc) return; // re-entering start cell — ignore

    const { isSolved, queens, marks, setCellState } = useGameStore.getState();
    if (isSolved) return;

    const startKey = `${sr},${sc}`;
    if (!dragVisited.current.has(startKey)) {
      // Recalculate from original state in case it changed
      const startHasQueen = queens.some(([qr, qc]) => qr === sr && qc === sc);
      if (!startHasQueen) {
        const action = toggleResult(sr, sc, queens, marks);
        dragAction.current = action;
        setCellState(sr, sc, action);
      }
      dragVisited.current.add(startKey);
      hasDragged.current = true;
    }

    const key = `${r},${c}`;
    if (dragVisited.current.has(key)) return;
    dragVisited.current.add(key);
    // Never disturb a cell that already has a queen
    const hasQueen = queens.some(([qr, qc]) => qr === r && qc === c);
    if (!hasQueen) setCellState(r, c, dragAction.current!);
  }, []);

  /**
   * Single click  → toggle mark (after 250 ms, to distinguish from double-click)
   * Double click  → place queen (cancels the pending single-click timer)
   * After drag    → skip (drag already handled the state)
   */
  const handleClick = useCallback((r: number, c: number) => {
    if (hasDragged.current) { hasDragged.current = false; return; }

    if (clickTimer.current !== null) {
      // Second click within window — it's a double-click: place queen
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      const { isSolved, setCellState } = useGameStore.getState();
      if (!isSolved) setCellState(r, c, "queen");
      return;
    }

    // First click — wait to see if a second follows
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      const { isSolved, queens, marks, setCellState } = useGameStore.getState();
      if (isSolved) return;
      setCellState(r, c, toggleResult(r, c, queens, marks));
    }, 250);
  }, []);

  // ── Keyboard handler ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      if (isSolved) return;

      const applySpaceAction = (nr: number, nc: number) => {
        if (!spaceHeld.current || !spaceAction.current) return;
        const { isSolved, setCellState } = useGameStore.getState();
        if (!isSolved) setCellState(nr, nc, spaceAction.current);
      };

      switch (e.key) {
        case "ArrowUp": {
          e.preventDefault();
          const [nr, nc] = moveFocus(row - 1, col);
          applySpaceAction(nr, nc);
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const [nr, nc] = moveFocus(row + 1, col);
          applySpaceAction(nr, nc);
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const [nr, nc] = moveFocus(row, col - 1);
          applySpaceAction(nr, nc);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const [nr, nc] = moveFocus(row, col + 1);
          applySpaceAction(nr, nc);
          break;
        }
        case " ":
          e.preventDefault();
          if (!e.repeat) {
            // Toggle mark on current cell; record action for Space-drag
            const { isSolved, queens, marks, setCellState } = useGameStore.getState();
            if (isSolved) break;
            const action = toggleResult(row, col, queens, marks);
            setCellState(row, col, action);
            spaceAction.current = action;
          }
          break;
        case "Enter":
          e.preventDefault();
          if (!e.repeat) {
            const { isSolved, setCellState } = useGameStore.getState();
            if (!isSolved) setCellState(row, col, "queen");
          }
          break;
      }
    },
    [isSolved, moveFocus]
  );

  // ── Touch handlers (mobile drag support) ────────────────────────────────
  /** Mirror of handleCellMouseDown for touch: start drag from the touched cell. */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (!cell) return;
    const [r, c] = cell;
    const { isSolved, queens, marks } = useGameStore.getState();
    if (isSolved) return;
    const hasQueen = queens.some(([qr, qc]) => qr === r && qc === c);
    dragAction.current = hasQueen ? null : toggleResult(r, c, queens, marks);
    dragStartCell.current = [r, c];
    dragVisited.current.clear();
    isDragging.current = true;
    hasDragged.current = false;
  }, []);

  /**
   * Paint cells as the finger moves across the board.
   * Uses elementFromPoint because onMouseEnter/onPointerEnter don't fire during touch.
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !dragAction.current) return;
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (!cell) return;
    handleCellMouseEnter(cell[0], cell[1]);
  }, [handleCellMouseEnter]);

  /**
   * End drag on touchend.
   * hasDragged is left intact so the emulated click (for a tap) still works:
   *   drag → hasDragged=true  → emulated click is skipped in handleClick
   *   tap  → hasDragged=false → emulated click toggles mark normally
   */
  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    dragAction.current = null;
    dragStartCell.current = null;
    dragVisited.current.clear();
  }, []);

  return (
    <div
      role="grid"
      aria-label="Queens puzzle board"
      aria-readonly={isSolved}
      className="inline-grid rounded-[8px] overflow-hidden select-none"
      style={{
        gridTemplateColumns: cellPx
          ? `repeat(${size}, ${cellPx}px)`
          : `repeat(${size}, minmax(0, 1fr))`,
        gap: "3px",
        backgroundColor: "var(--border-default)",
        padding: "3px",
        touchAction: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {grid.map((row, r) =>
        row.map((regionId, c) => {
          const key = `${r},${c}`;
          return (
            <GameCell
              key={key}
              row={r}
              col={c}
              regionId={regionId}
              hasQueen={queenSet.has(key)}
              hasMark={marks.has(key)}
              isConflict={conflicts.has(key)}
              isSolved={isSolved}
              cellPx={cellPx}
              onClick={(e) => handleClick(r, c)}
              onMouseDown={(e) => handleCellMouseDown(r, c, e)}
              onMouseEnter={() => handleCellMouseEnter(r, c)}
              onRemove={() => {
                const { isSolved, removeCell } = useGameStore.getState();
                if (!isSolved) removeCell(r, c);
              }}
              onKeyDown={(e) => handleKeyDown(e, r, c)}
            />
          );
        })
      )}
    </div>
  );
}

