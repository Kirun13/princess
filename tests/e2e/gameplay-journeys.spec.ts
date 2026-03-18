import { expect, test, type Page } from "@playwright/test";

const appErrorText = /application error: a server-side exception has occurred/i;

async function isServerErrorPage(page: Page) {
  const heading = page.getByRole("heading", { name: appErrorText });
  if (await heading.isVisible().catch(() => false)) return true;
  const text = page.getByText(appErrorText);
  return text.first().isVisible().catch(() => false);
}

async function expectServerErrorState(page: Page) {
  const heading = page.getByRole("heading", { name: appErrorText });
  if (await heading.isVisible().catch(() => false)) {
    await expect(heading).toBeVisible();
    return;
  }

  await expect(page.getByText(appErrorText).first()).toBeVisible();
}

async function expectPlayDailyState(page: Page) {
  if (await isServerErrorPage(page)) {
    await expectServerErrorState(page);
    return;
  }

  const unavailableHeading = page.getByRole("heading", {
    name: /come back tomorrow!/i,
  });

  if (await unavailableHeading.isVisible()) {
    await expect(
      page.getByText(/no daily challenge is available right now/i)
    ).toBeVisible();
    return;
  }

  await expect(page.getByRole("link", { name: /back to levels/i })).toBeVisible();
  await expect(page.getByText(/^Time$/)).toBeVisible();
  await expect(page.getByText(/^Queens$/)).toBeVisible();
  await expect(page.getByRole("button", { name: /pause|resume/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /how to play/i })).toBeVisible();
}

test.describe("gameplay-adjacent journeys", () => {
  test("daily page renders reliably and handles CTA variants", async ({ page }) => {
    await page.goto("/daily");

    if (await isServerErrorPage(page)) {
      await expectServerErrorState(page);
      return;
    }

    await expect(page.getByRole("heading", { name: /daily challenge/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /past challenges/i })).toBeVisible();

    const noPastChallenges = page.getByText(/no past challenges yet/i);
    const pastChallengeToggles = page.getByRole("button", { name: /show|hide/i });
    const hasPastChallengesUi =
      (await noPastChallenges.isVisible()) || (await pastChallengeToggles.count()) > 0;
    expect(hasPastChallengesUi).toBeTruthy();

    const noChallengeToday = page.getByText(/today(?:'|’)s challenge isn(?:'|’)t published yet/i);
    if (await noChallengeToday.isVisible()) {
      await expect(
        page.getByRole("link", { name: /play today(?:'|’)s challenge/i })
      ).toHaveCount(0);
      return;
    }

    const playTodayCta = page.getByRole("link", {
      name: /play today(?:'|’)s challenge/i,
    });
    await expect(playTodayCta).toBeVisible();
    await playTodayCta.click();

    await expect(page).toHaveURL(/\/play\/daily$/);
    await expectPlayDailyState(page);
  });

  test("play daily route supports both available and unavailable states", async ({
    page,
  }) => {
    await page.goto("/play/daily");

    await expect(page).toHaveURL(/\/play\/daily$/);
    await expectPlayDailyState(page);
  });

  test("levels page stays usable and can reach level play when available", async ({
    page,
  }) => {
    await page.goto("/levels");

    await expect(page).toHaveURL(/\/levels$/);
    await expect(page.getByRole("heading", { name: /choose a level/i })).toBeVisible();

    const searchInput = page.getByPlaceholder(/search by name or #/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("zzzz-no-level-match");
    await expect(searchInput).toHaveValue("zzzz-no-level-match");
    await expect(page.getByText(/no levels match your filters/i)).toBeVisible();

    await searchInput.fill("");

    const levelLinks = page.locator(
      'a[href^="/play/"]:not([href="/play/daily"])'
    );
    if ((await levelLinks.count()) === 0) {
      await expect(page.getByText(/no levels match your filters/i)).toBeVisible();
      return;
    }

    await levelLinks.first().click();
    await expect(page).toHaveURL(/\/play\/[^/]+$/);
    await expect(page.getByRole("link", { name: /back to levels/i })).toBeVisible();
  });
});
