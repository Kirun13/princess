import { expect, test } from "@playwright/test";

test.describe("guest smoke flows", () => {
  test("guest can navigate home -> levels -> sign-in", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Play Now" })).toBeVisible();
    await page.goto("/levels");
    await expect(page).toHaveURL(/\/levels$/);

    await page.getByRole("link", { name: "Sign In" }).first().click();
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("forgot password page is reachable from sign-in", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByRole("link", { name: "Forgot?" }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(
      page.getByRole("button", { name: "Send Reset Link" })
    ).toBeVisible();
  });
});

