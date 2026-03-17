import Link from "next/link";
import { formatTime } from "@/lib/format";
import { getLevelDescriptor } from "@/lib/level-meta";

export type LevelWithSolve = {
  id: string;
  number: number;
  name: string;
  difficulty: string;
  size: number;
  avgRating: number;
  ratingCount: number;
  solve?: {
    timeMs: number;
    completedAt: Date;
  } | null;
};

// Design system badge formula: bg = color + 20 hex opacity, border = color + 50 hex opacity
const DIFFICULTY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  easy:   { color: "#22C55E", bg: "#22C55E20", border: "#22C55E50" },
  medium: { color: "#F59E0B", bg: "#F59E0B15", border: "#F59E0B40" },
  hard:   { color: "#EF4444", bg: "#EF444415", border: "#EF444440" },
  expert: { color: "#EF4444", bg: "#EF444420", border: "#EF444460" },
};

type Props = { level: LevelWithSolve };

export default function LevelCard({ level }: Props) {
  const badge = DIFFICULTY_STYLES[level.difficulty] ?? {
    color: "#8B5CF6",
    bg: "#7C3AED20",
    border: "#7C3AED50",
  };
  const descriptor = getLevelDescriptor(level);

  return (
    <Link
      href={`/play/${level.id}`}
      className="group block rounded-[12px] p-5 flex flex-col gap-3 transition-all duration-150"
      style={{
        background: "var(--surface-01)",
        border: level.solve
          ? "1px solid var(--border-subtle)"
          : "1px solid var(--border-subtle)",
        borderLeft: level.solve ? "3px solid #22C55E" : "1px solid var(--border-subtle)",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className="text-xs block mb-0.5"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            #{level.number}
          </span>
          <h3
            className="font-bold leading-tight transition-colors duration-150"
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "var(--text-primary)",
            }}
          >
            {level.name}
          </h3>
        </div>
        {level.solve && (
          <div className="text-xl flex-shrink-0" style={{ color: "#22C55E" }} title="Completed">
            ✓
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full border capitalize"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: badge.color,
            background: badge.bg,
            borderColor: badge.border,
          }}
        >
          {level.difficulty}
        </span>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--text-muted)",
            background: "var(--surface-02)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {level.size}×{level.size}
        </span>
        {level.ratingCount > 0 && (
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "#F59E0B",
              background: "#F59E0B15",
              border: "1px solid #F59E0B40",
            }}
          >
            ★ {level.avgRating.toFixed(1)} ({level.ratingCount})
          </span>
        )}
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            fontFamily: "var(--app-ui-font), Inter, system-ui, sans-serif",
            color: "var(--text-muted)",
            background: "var(--surface-02)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {descriptor.label}
        </span>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {descriptor.description}
      </p>

      {/* Best time or prompt */}
      {level.solve ? (
        <div
          className="mt-auto pt-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <span
            className="text-xs uppercase tracking-[2px]"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            Best
          </span>
          <span
            className="text-sm font-bold"
            style={{ fontFamily: "var(--font-mono), monospace", color: "#22C55E" }}
          >
            {formatTime(level.solve.timeMs)}
          </span>
        </div>
      ) : (
        <div className="mt-auto pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span
            className="text-xs uppercase tracking-[2px]"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            Not started
          </span>
        </div>
      )}
    </Link>
  );
}
