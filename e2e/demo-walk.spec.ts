import { test, expect, type Page } from "@playwright/test";

/** The Kiroween demo. Each test starts in a fresh browser, so local data starts empty. */

async function feed(page: Page, sampleId: string) {
  await page.getByTestId(`sample-${sampleId}`).click();
  await expect(page.getByTestId("feed-result")).toBeVisible();
}

test("60-second happy path: pick a companion, log meals, level up, evolve", async ({ page }) => {
  const started = Date.now();

  // 1. Pick a companion and watch it hatch (no skipping, the real animation runs).
  await page.goto("/");
  await expect(page.getByTestId("egg-picker")).toBeVisible();
  await page.getByTestId("pick-hangori").click();
  await expect(page.getByTestId("hatch-scene")).toBeVisible();
  await expect(page.getByTestId("companion-home")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("companion-name")).toHaveText("Hangori the Goblin");
  await expect(page.getByTestId("companion-stage")).toContainText("Stage 1");
  await expect(page.getByTestId("companion-level")).toHaveText("Level 1");

  // 2. First meal: counts, +10 XP, level up.
  await page.getByTestId("go-feed").click();
  await feed(page, "burger");
  await expect(page.getByTestId("feed-result")).toHaveAttribute("data-code", "counted");
  await expect(page.getByTestId("feed-xp")).toContainText("+10 XP");
  await expect(page.getByTestId("feed-levelup")).toContainText("1 → 2");
  await expect(page.getByTestId("xp-bar")).toHaveAttribute("data-xp", "10");
  await expect(page.getByTestId("evolution-overlay")).toHaveCount(0);

  // 3. Second meal: counts and the companion evolves.
  await feed(page, "tacos");
  await expect(page.getByTestId("evolution-overlay")).toBeVisible();
  await expect(page.getByTestId("evolution-overlay")).toContainText("Hangori became a Scamp");
  await page.getByTestId("evolution-continue").click();
  await expect(page.getByTestId("evolution-overlay")).toHaveCount(0);

  // 4. Back home: stage 2, level 3.
  await page.getByTestId("nav-companion").click();
  await expect(page.getByTestId("companion-stage")).toContainText("Stage 2");
  await expect(page.getByTestId("companion-level")).toHaveText("Level 3");
  await expect(page.getByTestId("xp-bar")).toHaveAttribute("data-xp", "20");

  const seconds = (Date.now() - started) / 1000;
  console.log(`Happy path took ${seconds.toFixed(1)}s`);
  expect(seconds).toBeLessThan(60);
});

test("tries to game it: duplicate, family order, too soon, and the rest", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("pick-hangori").click();
  await expect(page.getByTestId("companion-home")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("nav-feed").click();

  await feed(page, "burger");
  await expect(page.getByTestId("feed-xp")).toContainText("+10 XP");
  await feed(page, "tacos");
  await page.getByTestId("evolution-continue").click();

  // The same receipt photographed again is already eaten, and adds no XP.
  await feed(page, "again");
  await expect(page.getByTestId("feed-result")).toHaveAttribute("data-code", "duplicate");
  await expect(page.getByTestId("feed-result")).toContainText("0 XP");

  // Another meal right away is too soon, and the message says when to come back.
  await feed(page, "noodles");
  await expect(page.getByTestId("feed-result")).toHaveAttribute("data-code", "too_soon");
  await expect(page.getByTestId("feed-result")).toContainText("Hangori is full.");
  await expect(page.getByTestId("feed-result")).toContainText(/Next meal in 2h (9|10)m\./);

  // A $108.50 family order counts as one meal with the same XP as the $14.97 burger.
  await feed(page, "family");
  await expect(page.getByTestId("feed-result")).toHaveAttribute("data-code", "counted");
  await expect(page.getByTestId("feed-xp")).toContainText("+10 XP");

  const rejected: Array<[string, string, string]> = [
    ["hardware", "not_food", "rejected"],
    ["old", "too_old", "rejected"],
    ["future", "future_date", "rejected"],
    ["notime", "missing_time", "needs_review"],
    ["blurry", "missing_time", "needs_review"],
  ];
  for (const [id, code, outcome] of rejected) {
    await feed(page, id);
    await expect(page.getByTestId("feed-result"), id).toHaveAttribute("data-code", code);
    await expect(page.getByTestId("feed-result"), id).toHaveAttribute("data-outcome", outcome);
    await expect(page.getByTestId("feed-result"), id).toContainText("0 XP");
  }

  // Only the three real meals gave XP. Every rejected or reviewed receipt gave none.
  await page.getByTestId("nav-companion").click();
  await expect(page.getByTestId("xp-bar")).toHaveAttribute("data-xp", "30");
});

test("keeps progress after a reload and still refuses the same receipt", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("pick-mochi").click();
  await expect(page.getByTestId("companion-home")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("nav-feed").click();
  await feed(page, "burger");
  await expect(page.getByTestId("feed-result")).toHaveAttribute("data-code", "counted");

  await page.reload();
  await expect(page.getByTestId("feed-companion-name")).toContainText("Mochi · Level 2");
  await feed(page, "burger");
  await expect(page.getByTestId("feed-result")).toHaveAttribute("data-code", "duplicate");
  await page.getByTestId("nav-savings").click();
  await expect(page.getByTestId("savings-total")).toHaveText("$2.99");
});

test("the demo den has a companion at every stage and an egg waiting", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("load-demo").click();
  await expect(page.getByTestId("companion-home")).toBeVisible();
  await expect(page.getByTestId("companion-name")).toHaveText("Brisket the Dwarf");
  await expect(page.getByTestId("companion-stage")).toContainText("Stage 4");

  const stages: Record<string, string> = { sprig: "1", mochi: "2", grubble: "3", brisket: "4", hangori: "0" };
  for (const [id, stage] of Object.entries(stages)) {
    await expect(page.getByTestId(`den-${id}`)).toHaveAttribute("data-stage", stage);
  }

  // Switch to another companion.
  await page.getByTestId("den-grubble").click();
  await expect(page.getByTestId("companion-name")).toHaveText("Grubble the Troll");

  // The seeded meals feed the savings total.
  await page.getByTestId("nav-savings").click();
  await expect(page.getByTestId("savings-total")).not.toHaveText("$0.00");
});

test("reset returns to the egg picker", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("load-demo").click();
  await expect(page.getByTestId("companion-home")).toBeVisible();
  await page.getByTestId("nav-settings").click();
  await page.getByTestId("settings-reset").click();
  await page.getByTestId("settings-reset-confirm").click();
  await page.getByTestId("nav-companion").click();
  await expect(page.getByTestId("egg-picker")).toBeVisible();
});

test("shows deals with generic link-outs and no brand names", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByTestId("deal-deal-sb-01")).toBeVisible();
  const links = page.getByRole("link", { name: "Open in your food app" });
  expect(await links.count()).toBe(16);
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const brand of ["doordash", "uber eats", "grubhub", "postmates", "instacart"]) {
    expect(text).not.toContain(brand);
  }
});
