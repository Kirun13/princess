const REGION_COLORS = [
  "#7c3aed",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#c026d3",
  "#65a30d",
  "#db2777",
  "#ea580c",
];

interface ReadOnlyGridProps {
  grid: number[][];
  cellSize?: number;
}

export function ReadOnlyGrid({ grid, cellSize = 28 }: ReadOnlyGridProps) {
  const size = grid.length;
  return (
    <div
      className="inline-grid gap-0.5 p-1.5 bg-zinc-900 rounded-xl shrink-0"
      style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}
    >
      {grid.map((row, r) =>
        row.map((regionId, c) => (
          <div
            key={`${r},${c}`}
            className="rounded-sm"
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: REGION_COLORS[regionId % REGION_COLORS.length],
            }}
          />
        ))
      )}
    </div>
  );
}
