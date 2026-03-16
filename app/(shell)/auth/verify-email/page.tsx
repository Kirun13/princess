"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmailToken, requestEmailVerification } from "@/app/auth/verify-email/actions";

type State = "loading" | "success" | "error" | "resent" | "resend-rate-limited";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const missingToken = token.length === 0;
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      return;
    }

    verifyEmailToken(token).then((result) => {
      if (result.success) {
        setState("success");
        setTimeout(() => router.push("/settings"), 3000);
      } else {
        setState("error");
        setErrorMsg(result.error ?? "Verification failed.");
      }
    });
  }, [token, router]);

  function handleResend() {
    startTransition(async () => {
      const result = await requestEmailVerification();
      if (result.rateLimited) {
        setState("resend-rate-limited");
      } else if (result.success) {
        setState("resent");
      } else {
        setState("error");
        setErrorMsg(result.error ?? "Could not send verification email.");
      }
    });
  }

  const showMissingTokenError = missingToken && state === "loading";
  const currentState: State = showMissingTokenError ? "error" : state;
  const currentErrorMsg = showMissingTokenError ? "Missing verification token." : errorMsg;

  return (
    <div
      className="flex-1 flex items-center justify-center p-6 py-16"
      style={{ background: "var(--bg-void)" }}
    >
      <div className="w-full max-w-md">
        <div
          className="overflow-hidden rounded-[20px]"
          style={{
            background: "var(--surface-01)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--glow-xl)",
          }}
        >
          <div className="w-full h-1" style={{ background: "var(--gradient-brand)" }} />

          <div className="p-8 text-center">
            {currentState === "loading" && (
              <>
                <div
                  className="w-12 h-12 rounded-[8px] flex items-center justify-center text-white text-xl font-bold mx-auto mb-5"
                  style={{ background: "var(--gradient-brand)", boxShadow: "var(--glow-md)" }}
                >
                  ♛
                </div>
                <p
                  className="text-sm"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                >
                  Verifying your email…
                </p>
              </>
            )}

            {currentState === "success" && (
              <>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "#22C55E18", border: "1px solid #22C55E40" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h1
                  className="text-xl font-black mb-2"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                >
                  Email verified!
                </h1>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Your email address has been confirmed.
                  <br />Redirecting you to settings…
                </p>
              </>
            )}

            {currentState === "error" && (
              <>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "#EF444415", border: "1px solid #EF444440" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h1
                  className="text-xl font-black mb-2"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                >
                  Verification failed
                </h1>
                  <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{currentErrorMsg}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleResend}
                    disabled={isPending}
                    className="w-full py-3 rounded-[8px] text-sm font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      background: "var(--gradient-brand)",
                      boxShadow: "var(--glow-lg)",
                    }}
                  >
                    {isPending ? "Sending…" : "Resend Verification Email"}
                  </button>
                  <a
                    href="/settings"
                    className="text-sm transition-colors duration-150"
                    style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                  >
                    Back to settings
                  </a>
                </div>
              </>
            )}

            {currentState === "resent" && (
              <>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "#22C55E18", border: "1px solid #22C55E40" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </div>
                <h1
                  className="text-xl font-black mb-2"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                >
                  Check your inbox
                </h1>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  A new verification link has been sent to your email.
                  <br />Links expire after 24 hours.
                </p>
                <a
                  href="/settings"
                  className="text-sm transition-colors duration-150"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                >
                  Back to settings
                </a>
              </>
            )}

            {currentState === "resend-rate-limited" && (
              <>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "#F59E0B18", border: "1px solid #F59E0B40" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h1
                  className="text-xl font-black mb-2"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                >
                  Too many requests
                </h1>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Please wait an hour before requesting another verification email.
                </p>
                <a
                  href="/settings"
                  className="text-sm transition-colors duration-150"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                >
                  Back to settings
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg-void)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
            Loading…
          </p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
