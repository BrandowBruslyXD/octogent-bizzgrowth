import { expect, test } from "@playwright/test";

test.describe("Octogent web — smoke", () => {
  test("loads the shell and mounts the React root", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Octogent/i);
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 10_000 });
  });

  test("renders a canvas surface or setup wizard within a reasonable time", async ({ page }) => {
    await page.goto("/");
    const ready = page.locator(
      'svg[aria-label*="canvas" i], [data-testid="canvas-svg"], [data-testid="setup-wizard"], button:has-text("Workspace")',
    );
    await expect(ready.first()).toBeVisible({ timeout: 15_000 });
  });
});
