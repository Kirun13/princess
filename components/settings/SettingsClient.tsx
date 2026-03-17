"use client";

import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  getUIFontCssVar,
  normalizeUIFont,
  type AppTheme,
  type ResolvedUserSettings,
} from "@/lib/user-settings";

type Settings = ResolvedUserSettings;

interface Props {
  initialSettings: Settings;
  username: string;
  email: string;
  isCredentialsUser: boolean;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordField({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 pr-11 rounded-[8px] text-sm transition-all duration-150 outline-none"
        style={{
          fontFamily: "var(--font-mono), monospace",
          background: "var(--surface-02)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "rgba(124,58,237,0.6)";
          e.target.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.12)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border-subtle)";
          e.target.style.boxShadow = "none";
        }}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
        style={{ color: "var(--text-muted)" }}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

async function putSettings(data: Partial<Settings>) {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <Switch.Root
        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
        checked={checked}
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb className="block h-5 w-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5" />
      </Switch.Root>
    </div>
  );
}

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function SelectField({
  label,
  description,
  value,
  onValueChange,
  options,
}: {
  label: string;
  description: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] hover:bg-[var(--border)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          <Select.Value />
          <Select.Icon>
            <ChevronIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-50 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl p-1 overflow-hidden"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport>
              {options.map(({ value: v, label: l }) => (
                <Select.Item
                  key={v}
                  value={v}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--border)] cursor-pointer focus:outline-none data-[highlighted]:bg-[var(--border)]"
                >
                  <Select.ItemText>{l}</Select.ItemText>
                  <Select.ItemIndicator className="ml-auto">
                    <CheckIcon />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

export default function SettingsClient({
  initialSettings,
  username,
  email,
  isCredentialsUser,
}: Props) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const router = useRouter();

  const { mutate: saveSettings } = useMutation({ mutationFn: putSettings });

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    saveSettings({ [key]: value });
    // Apply theme immediately without a page reload
    if (key === "theme") {
      const t = value as AppTheme;
      if (t === "auto") {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      } else {
        document.documentElement.setAttribute("data-theme", t);
      }
    }
    if (key === "uiFont") {
      const nextFont = getUIFontCssVar(normalizeUIFont(String(value)));
      document.documentElement.style.setProperty("--app-ui-font", nextFont);
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const { mutate: changePassword, isPending: pwPending } = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setPwError("");
    },
    onError: (err: Error) => setPwError(err.message),
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords do not match");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { mutate: deleteAccount, isPending: deletePending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: async () => {
      await signOut({ redirect: false });
      router.push("/");
    },
  });

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-12 w-full space-y-10">
      <h1
        className="text-3xl font-bold text-[var(--text)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        Settings
      </h1>

      {/* ── Game Settings ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Game Settings</SectionTitle>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
          <SwitchField
            label="Sound Effects"
            description="Play sounds on queen placement and solve"
            checked={settings.soundEffects}
            onCheckedChange={(v) => updateSetting("soundEffects", v)}
          />
          <SwitchField
            label="Confirm before Reset"
            description="Show a confirmation prompt before clearing the board"
            checked={settings.confirmReset}
            onCheckedChange={(v) => updateSetting("confirmReset", v)}
          />
          <SwitchField
            label="Highlight Conflicts"
            description="Flash conflicting queens red when they violate a rule"
            checked={settings.highlightConflicts}
            onCheckedChange={(v) => updateSetting("highlightConflicts", v)}
          />
          <SwitchField
            label="Show Timer"
            description="Display the elapsed time while solving"
            checked={settings.showTimer}
            onCheckedChange={(v) => updateSetting("showTimer", v)}
          />
        </div>
      </section>

      {/* ── Appearance ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Appearance</SectionTitle>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
          <SelectField
            label="Theme"
            description="Choose your preferred color scheme"
            value={settings.theme}
            onValueChange={(v) => updateSetting("theme", v as AppTheme)}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "auto", label: "Auto (System)" },
            ]}
          />
          <SelectField
            label="UI Font"
            description="Choose the interface font family"
            value={settings.uiFont}
            onValueChange={(v) => updateSetting("uiFont", normalizeUIFont(v))}
            options={[
              { value: "JetBrains Mono", label: "JetBrains Mono" },
              { value: "Inter", label: "Inter" },
            ]}
          />
        </div>
      </section>

      {/* ── Account ────────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Account</SectionTitle>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
          {/* Username */}
          <div className="px-5 py-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Display Name</p>
            <p className="text-sm font-medium text-[var(--text)]">{username}</p>
          </div>

          {/* Email */}
          <div className="px-5 py-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">
              Email
              {!isCredentialsUser && (
                <span className="ml-2 text-[var(--accent)]">(managed by OAuth provider)</span>
              )}
            </p>
            <p className="text-sm text-[var(--text-muted)]">{email}</p>
          </div>

          {/* Change password — credentials users only */}
          {isCredentialsUser && (
            <div className="px-5 py-4">
              <p
                className="text-sm font-semibold mb-3"
                style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
              >
                Change Password
              </p>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <PasswordField
                  placeholder="Current password"
                  value={pwForm.current}
                  onChange={(v) => setPwForm((p) => ({ ...p, current: v }))}
                />
                <PasswordField
                  placeholder="New password (min 8 chars)"
                  value={pwForm.next}
                  onChange={(v) => setPwForm((p) => ({ ...p, next: v }))}
                />
                <PasswordField
                  placeholder="Confirm new password"
                  value={pwForm.confirm}
                  onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
                />
                {pwError && (
                  <p
                    className="text-xs"
                    style={{ fontFamily: "var(--font-mono), monospace", color: "var(--color-error, #EF4444)" }}
                  >
                    {pwError}
                  </p>
                )}
                {pwSuccess && (
                  <p
                    className="text-xs"
                    style={{ fontFamily: "var(--font-mono), monospace", color: "#22C55E" }}
                  >
                    Password updated successfully.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pwPending}
                  className="px-5 py-2.5 rounded-[8px] text-sm font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    background: "var(--gradient-brand)",
                    boxShadow: "var(--glow-sm)",
                  }}
                >
                  {pwPending ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ── Danger Zone ────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle danger>Danger Zone</SectionTitle>
        <div className="bg-[var(--bg-card)] border border-red-500/30 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Delete Account</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Permanently delete your account and all data. This cannot be undone.
            </p>
          </div>

          <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Dialog.Trigger asChild>
              <button className="shrink-0 px-4 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors">
                Delete Account
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <Dialog.Title className="text-lg font-bold text-[var(--text)] mb-2">
                    Delete Account
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
                    This action is permanent and cannot be undone. All your solves, achievements,
                    and settings will be deleted. Type{" "}
                    <strong className="text-[var(--text)]">DELETE MY ACCOUNT</strong> to confirm.
                  </Dialog.Description>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className={`${inputClass} focus:ring-red-500 mb-4`}
                    autoComplete="off"
                  />
                  <div className="flex gap-3 justify-end">
                    <Dialog.Close asChild>
                      <button className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] text-sm hover:bg-[var(--border)] transition-colors">
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={() => deleteAccount()}
                      disabled={deleteConfirm !== "DELETE MY ACCOUNT" || deletePending}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletePending ? "Deleting…" : "Delete Account"}
                    </button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  children,
  danger,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <h2
      className={`text-xs font-semibold uppercase tracking-widest mb-3 ${
        danger ? "text-red-400" : "text-[var(--text-muted)]"
      }`}
    >
      {children}
    </h2>
  );
}
