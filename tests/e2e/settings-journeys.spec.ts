import { expect, test } from "@playwright/test";

test.describe("settings guest journeys", () => {
  test("guest visiting /settings is sent to sign-in", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForURL((url) => url.pathname === "/auth/sign-in");
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("protected-route redirect keeps callbackUrl for returning to /settings", async ({
    page,
  }) => {
    await page.goto("/settings");

    await page.waitForURL((url) => url.pathname === "/auth/sign-in");

    const signInUrl = new URL(page.url());
    const callbackUrl = signInUrl.searchParams.get("callbackUrl");

    expect(callbackUrl).toBeTruthy();
    expect(decodeURIComponent(callbackUrl!)).toContain("/settings");

    await page.getByRole("button", { name: "Sign Up" }).click();
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(callbackUrl);
  });

  // We intentionally avoid a full authenticated settings interaction in this suite:
  // there is no guaranteed seeded test account in default local/CI environments, and
  // creating credentials users in E2E would add external DB-state assumptions.
});
