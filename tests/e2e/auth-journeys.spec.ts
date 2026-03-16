import { expect, test } from "@playwright/test";

test.describe("auth-adjacent journeys", () => {
  test("sign-in supports tab switching and sign-up password validation", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot?" })).toBeVisible();

    await page.getByRole("button", { name: "Sign Up" }).first().click();
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();

    await page.getByPlaceholder("princess_solver").fill("playwright_user");
    await page.getByPlaceholder("you@example.com").fill("playwright@example.com");
    const shortPasswordInput = page.getByPlaceholder("••••••••");
    await shortPasswordInput.fill("short");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(shortPasswordInput).toHaveAttribute("minlength", "8");
    expect(
      await shortPasswordInput.evaluate(
        (el) => (el as HTMLInputElement).checkValidity()
      )
    ).toBe(false);
    await expect(page).toHaveURL(/\/auth\/sign-in$/);

    await page.getByRole("button", { name: "Sign In" }).first().click();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("forgot-password is reachable and can navigate back to sign-in", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");
    await page.getByRole("link", { name: "Forgot?" }).click();

    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();

    await page.getByRole("link", { name: /Back to sign in/ }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("reset-password without token shows deterministic missing-token state", async ({
    page,
  }) => {
    await page.goto("/auth/reset-password");

    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await expect(page.getByText("Invalid or missing reset token.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Update Password" })).toHaveCount(0);
  });

  test("verify-email without token shows deterministic missing-token error", async ({
    page,
  }) => {
    await page.goto("/auth/verify-email");

    await expect(page.getByRole("heading", { name: "Verification failed" })).toBeVisible();
    await expect(page.getByText("Missing verification token.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Resend Verification Email" })
    ).toBeVisible();
  });
});
