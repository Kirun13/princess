// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner";

const { requestEmailVerificationMock } = vi.hoisted(() => ({
  requestEmailVerificationMock: vi.fn(),
}));

vi.mock("@/app/auth/verify-email/actions", () => ({
  requestEmailVerification: requestEmailVerificationMock,
}));

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    requestEmailVerificationMock.mockReset();
  });

  it("shows success message after resend", async () => {
    requestEmailVerificationMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<EmailVerificationBanner email="player@example.com" />);
    await user.click(screen.getByRole("button", { name: /resend email/i }));

    await waitFor(() => {
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });
  });

  it("shows rate-limited message when resend is blocked", async () => {
    requestEmailVerificationMock.mockResolvedValue({
      success: false,
      rateLimited: true,
    });
    const user = userEvent.setup();

    render(<EmailVerificationBanner email="player@example.com" />);
    await user.click(screen.getByRole("button", { name: /resend email/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });
});

