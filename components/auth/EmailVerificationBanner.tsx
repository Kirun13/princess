"use client";

import { useState, useTransition } from "react";
import { requestEmailVerification } from "@/app/auth/verify-email/actions";

type BannerState = "idle" | "sending" | "sent" | "rate-limited";

interface Props {
  email: string;
}

export default function EmailVerificationBanner({ email }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [bannerState, setBannerState] = useState<BannerState>("idle");
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  function handleResend() {
    startTransition(async () => {
      setBannerState("sending");
      const result = await requestEmailVerification();
      if (result.rateLimited) {
        setBannerState("rate-limited");
      } else if (result.success) {
        setBannerState("sent");
      } else {
        setBannerState("idle");
      }
    });
  }

  return (
    <div
      className="w-full px-4 py-3 flex items-center gap-3 flex-wrap"
      style={{
        background: "#F59E0B10",
        borderBottom: "1px solid #F59E0B30",
      }}
    >
      {/* Icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      {/* Message */}
      {bannerState === "sent" ? (
        <p
          className="text-xs flex-1 min-w-0"
          style={{ fontFamily: "var(--font-mono), monospace", color: "#22C55E" }}
        >
          Verification email sent to{" "}
          <span className="font-bold">{email}</span>. Check your inbox.
        </p>
      ) : bannerState === "rate-limited" ? (
        <p
          className="text-xs flex-1 min-w-0"
          style={{ fontFamily: "var(--font-mono), monospace", color: "#F59E0B" }}
        >
          Too many requests. Please wait an hour before requesting another link.
        </p>
      ) : (
        <p
          className="text-xs flex-1 min-w-0"
          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
        >
          Please verify your email address:{" "}
          <span style={{ color: "var(--text-primary)" }}>{email}</span>
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {bannerState !== "sent" && bannerState !== "rate-limited" && (
          <button
            onClick={handleResend}
            disabled={isPending}
            className="text-xs font-bold transition-colors duration-150 disabled:opacity-50"
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "var(--brand-light)",
            }}
          >
            {bannerState === "sending" ? "Sending…" : "Resend email"}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-xs transition-colors duration-150"
          style={{ color: "var(--text-muted)" }}
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
