import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)] px-4 text-center">
      <div
        className="text-8xl font-bold text-[var(--accent)] mb-4 select-none"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        404
      </div>
      <p className="text-xl text-[var(--text)] font-semibold mb-2">
        This queen wandered off the board.
      </p>
      <p className="text-[var(--text-muted)] mb-10">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/levels"
          className="px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] font-semibold transition-colors"
        >
          View Levels
        </Link>
      </div>
    </div>
  );
}
