"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/auth/reset-password/actions";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        minLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "#EF444415", border: "1px solid #EF444440" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p
          className="text-sm"
          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--color-error, #EF4444)" }}
        >
          Invalid or missing reset token.
        </p>
        <a
          href="/auth/forgot-password"
          className="text-sm font-medium transition-colors duration-150"
          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--brand-light)" }}
        >
          Request a new link
        </a>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(token, password);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/auth/sign-in"), 2500);
      }
    });
  }

  if (success) {
    return (
      <div className="text-center space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "#22C55E18", border: "1px solid #22C55E40" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p
          className="font-bold"
          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
        >
          Password updated!
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="px-4 py-3 rounded-[8px] text-sm"
          style={{
            background: "#EF444415",
            border: "1px solid #EF444440",
            color: "var(--color-error, #EF4444)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label
          className="block text-xs uppercase tracking-[2px] mb-2"
          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
        >
          New Password{" "}
          <span style={{ textTransform: "none", letterSpacing: 0 }}>(min 8 chars)</span>
        </label>
        <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
      </div>

      <div>
        <label
          className="block text-xs uppercase tracking-[2px] mb-2"
          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
        >
          Confirm Password
        </label>
        <PasswordInput value={confirm} onChange={setConfirm} placeholder="••••••••" />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-[8px] text-sm font-bold text-white mt-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          fontFamily: "var(--font-mono), monospace",
          background: "var(--gradient-brand)",
          boxShadow: "var(--glow-lg)",
        }}
      >
        {isPending ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="flex-1 flex items-center justify-center p-6 py-16"
      style={{ background: "var(--bg-void)" }}
    >
      <div className="w-full max-w-md">
        {/* Icon + title */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-[8px] flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--glow-md)" }}
          >
            ♛
          </div>
          <h1
            className="text-2xl font-black mb-1"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
          >
            Reset password
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Choose a new password for your account.
          </p>
        </div>

        {/* Card */}
        <div
          className="overflow-hidden rounded-[20px]"
          style={{
            background: "var(--surface-01)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--glow-xl)",
          }}
        >
          <div className="w-full h-1" style={{ background: "var(--gradient-brand)" }} />
          <div className="p-8">
            <Suspense
              fallback={
                <p
                  className="text-sm text-center"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}
                >
                  Loading…
                </p>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
