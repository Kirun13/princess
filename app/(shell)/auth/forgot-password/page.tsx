"use client";

import { useState, useTransition } from "react";
import { forgotPassword } from "@/app/auth/forgot-password/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await forgotPassword(email);
      if (result.rateLimited) {
        setRateLimited(true);
      } else {
        setSubmitted(true);
      }
    });
  }

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
            {rateLimited ? "Too many requests" : submitted ? "Check your inbox" : "Forgot password?"}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {rateLimited
              ? "Please wait an hour before requesting another reset link."
              : submitted
              ? `If an account exists for ${email}, you'll receive a reset link shortly.`
              : "Enter your email and we'll send you a reset link."}
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
            {rateLimited ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "#F59E0B18", border: "1px solid #F59E0B40" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <a
                  href="/auth/sign-in"
                  className="text-sm font-medium transition-colors duration-150"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--brand-light)" }}
                >
                  ← Back to sign in
                </a>
              </div>
            ) : submitted ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "#22C55E18", border: "1px solid #22C55E40" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <a
                  href="/auth/sign-in"
                  className="text-sm font-medium transition-colors duration-150"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--brand-light)" }}
                >
                  ← Back to sign in
                </a>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      className="block text-xs uppercase tracking-[2px] mb-2"
                      style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-[8px] text-sm transition-all duration-150 outline-none"
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
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 rounded-[8px] text-sm font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      background: "var(--gradient-brand)",
                      boxShadow: "var(--glow-lg)",
                    }}
                  >
                    {isPending ? "Sending…" : "Send Reset Link"}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <a
                    href="/auth/sign-in"
                    className="text-sm transition-colors duration-150"
                    style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                  >
                    ← Back to sign in
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
