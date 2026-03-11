import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { HistoryClient } from "@/components/social/HistoryClient";

export const metadata = {
  title: "Solve History — Princess Puzzle",
};

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-10">
      <header className="mb-8">
        <Link
          href="/profile"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4 inline-block"
        >
          ← Back to Profile
        </Link>
        <h1
          className="text-3xl font-bold text-[var(--text)] mb-1"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          Solve History
        </h1>
        <p className="text-[var(--text-muted)]">All your puzzle completions.</p>
      </header>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6">
        <HistoryClient />
      </div>
    </div>
  );
}
