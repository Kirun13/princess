"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/levels", label: "Levels" },
  { href: "/admin/daily", label: "Next Daily" },
];

export function AdminSectionNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-[10px] text-xs font-bold uppercase tracking-[2px] transition-all duration-150"
            style={{
              fontFamily: "var(--font-mono), monospace",
              background: active ? "var(--gradient-brand)" : "transparent",
              border: active ? "none" : "1px solid var(--border-default)",
              color: active ? "white" : "var(--text-muted)",
              boxShadow: active ? "var(--glow-sm)" : undefined,
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
