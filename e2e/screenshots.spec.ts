import { test, expect, type Page } from "@playwright/test";

/**
 * Writes the README screenshots to docs/screenshots/.
 * Skipped unless SCREENSHOTS=1, so a normal `npm run e2e` never rewrites tracked files:
 *   SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
 */
test.skip(!process.env.SCREENSHOTS, "Set SCREENSHOTS=1 to regenerate the README screenshots");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });

const dir = "docs/screenshots";
const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: `${dir}/${name}.png`, fullPage });

async function feed(page: Page, sampleId: string) {
  await page.getByTestId(`sample-${sampleId}`).click();
  await expect(page.getByTestId("feed-result")).toBeVisible();
  await page.waitForTimeout(900); // let the XP bar finish filling
}

test("README screenshots", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/");
  await expect(page.getByTestId("egg-picker")).toBeVisible();
  await shot(page, "01-pick-companion");

  await page.getByTestId("pick-hangori").click();
  await expect(page.getByTestId("hatch-scene")).toHaveAttribute("data-phase", "born", { timeout: 5000 });
  await shot(page, "02-hatched");
  await expect(page.getByTestId("companion-home")).toBeVisible({ timeout: 10_000 });
  await shot(page, "03-companion-stage-1");

  await page.getByTestId("nav-feed").click();
  await feed(page, "burger");
  await shot(page, "04-meal-counted");

  await page.getByTestId("sample-tacos").click();
  await expect(page.getByTestId("evolution-overlay")).toBeVisible();
  await page.waitForTimeout(2400); // after the flash has settled
  await shot(page, "05-evolution");
  await page.getByTestId("evolution-continue").click();

  await feed(page, "again");
  await shot(page, "06-duplicate-rejected");
  await feed(page, "noodles");
  await shot(page, "07-too-soon");

  await page.getByTestId("nav-companion").click();
  await expect(page.getByTestId("companion-stage")).toContainText("Stage 2");
  await page.waitForTimeout(900);
  await shot(page, "08-companion-evolved");

  await page.getByTestId("nav-deals").click();
  await expect(page.getByTestId("deal-deal-sb-01")).toBeVisible();
  await shot(page, "09-deals");

  await page.getByTestId("nav-savings").click();
  await expect(page.getByTestId("savings-total")).toHaveText("$7.98");
  await shot(page, "10-savings");

  await page.getByTestId("nav-settings").click();
  await shot(page, "11-settings");

  // The demo den: a companion at every stage. A taller window shows the whole den.
  await page.setViewportSize({ width: 390, height: 1180 });
  await page.getByTestId("settings-load-demo").click();
  await page.getByTestId("nav-companion").click();
  await expect(page.getByTestId("companion-name")).toHaveText("Brisket the Dwarf");
  await page.waitForTimeout(900);
  await shot(page, "12-demo-den");
});
