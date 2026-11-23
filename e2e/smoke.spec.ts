import { test, expect } from "@playwright/test";

const screens = [
  { route: "/",         heading: "Companion" },
  { route: "/deals",    heading: "Deals" },
  { route: "/feed",     heading: "Feed" },
  { route: "/savings",  heading: "Savings" },
  { route: "/settings", heading: "Settings" },
];

for (const { route, heading } of screens) {
  test(`${heading} screen loads`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  });
}
