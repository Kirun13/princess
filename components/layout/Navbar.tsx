import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV_LINKS = [
  { href: "/levels", label: "Levels" },
  { href: "/daily", label: "Daily" },
  { href: "/how-to-play", label: "How to Play" },
];

export async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header
      className="sticky top-0 z-40"
      style={{ borderBottom: "1px solid var(--border-nav)", background: "var(--surface-01)" }}
    >
      <nav className="w-full px-4 sm:px-16 h-[72px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          {/* Gradient icon box */}
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: "var(--gradient-brand)" }}
          >
            ♛
          </div>
          <span
            className="hidden sm:inline text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-light)] transition-colors"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            Princess
          </span>
        </Link>

        {/* Center nav */}
        <ul className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="nav-link px-3 py-2 rounded-lg text-sm"
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {user ? (
            <UserMenu
              name={user.name ?? user.username ?? ""}
              image={user.image}
              username={user.username ?? ""}
            />
          ) : (
            <Link
              href="/auth/sign-in"
              className="sign-in-btn px-4 py-2 rounded-[8px] text-sm font-bold text-white"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              Sign In
            </Link>
          )}

          {/* Mobile hamburger */}
          <MobileMenu user={user ?? null} />
        </div>
      </nav>
    </header>
  );
}

function MobileMenu({ user }: { user: { name?: string | null; username?: string } | null }) {
  return (
    <details className="md:hidden relative group">
      <summary
        className="list-none cursor-pointer p-2 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <HamburgerIcon />
      </summary>
      <div
        className="absolute right-0 top-full mt-2 w-52 rounded-xl p-2 shadow-2xl"
        style={{
          background: "var(--surface-01)",
          border: "1px solid var(--border-default)",
        }}
      >
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "var(--text-primary)",
            }}
          >
            {label}
          </Link>
        ))}
        {!user && (
          <>
            <div className="my-2 h-px" style={{ background: "var(--border-subtle)" }} />
            <Link
              href="/auth/sign-in"
              className="block px-3 py-2 rounded-lg text-sm font-bold text-center"
              style={{
                fontFamily: "var(--font-mono), monospace",
                background: "var(--gradient-brand)",
                color: "white",
              }}
            >
              Sign In
            </Link>
          </>
        )}
      </div>
    </details>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
