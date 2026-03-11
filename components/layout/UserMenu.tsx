"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface UserMenuProps {
  name: string;
  image?: string | null;
  username: string;
}

export function UserMenu({ name, image, username }: UserMenuProps) {
  const initials = (name || username || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
          aria-label="User menu"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
            {image ? (
              <Image src={image} alt={name} width={32} height={32} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-white leading-none">{initials}</span>
            )}
          </div>
          <span className="hidden sm:block text-sm text-[var(--text-muted)] max-w-[120px] truncate">
            {username || name}
          </span>
          <ChevronDown />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          <div className="px-3 py-2 mb-1 border-b border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--text)] truncate">{name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">@{username}</p>
          </div>

          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--border)] cursor-pointer outline-none transition-colors"
            >
              <UserIcon />
              Profile
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--border)] cursor-pointer outline-none transition-colors"
            >
              <SettingsIcon />
              Settings
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

          <DropdownMenu.Item asChild>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--error)] hover:bg-[var(--border)] cursor-pointer outline-none transition-colors"
            >
              <SignOutIcon />
              Sign Out
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
