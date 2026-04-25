import { expect, test } from "@playwright/test";

// Verifica las invariantes UX del modo Consultor (CLAUDE.md):
// - El panel derecho aloja el chat del Octoboss y no es resizable.
// - Click izquierdo sobre nodos consultor-* no abre paneles.
// - El divider del panel derecho está bloqueado.
// - Las 4 tools tienen 3 estados visuales: idle, done, current.
test.describe("Modo Consultor — invariantes UX", () => {
  test("el chat del Octoboss bootstrappea visible en el panel derecho", async ({ page }) => {
    await page.goto("/");
    const xterm = page.locator(".xterm-viewport").first();
    await expect(xterm).toBeVisible({ timeout: 30_000 });
  });

  test("divider del panel derecho está bloqueado en modo consultor", async ({ page }) => {
    await page.goto("/");
    const lockedDivider = page.locator(".canvas-panel-divider--locked");
    await expect(lockedDivider.first()).toBeVisible({ timeout: 30_000 });
  });

  test("los 4 tentáculos consultor-* exponen una clase de estado (idle/done/current)", async ({
    page,
  }) => {
    await page.goto("/");
    // El polling de useConsultorActiveTools corre cada 4s. Esperamos un
    // par de ciclos para que se asiente.
    await page.waitForTimeout(8_000);
    const ids = [
      "t:consultor-entrevistador",
      "t:consultor-analista",
      "t:consultor-arquitecto",
      "t:consultor-comercial",
    ];
    for (const id of ids) {
      const node = page.locator(`[data-node-id="${id}"]`);
      await expect(node).toHaveClass(/octopus-node--consultor-(idle|done|current)/, {
        timeout: 10_000,
      });
    }
  });

  test("solo una tool puede estar 'current' al mismo tiempo", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(8_000);
    const currents = page.locator(".octopus-node--consultor-current");
    const count = await currents.count();
    // 0 (todos done o idle) o 1 (uno current). Nunca 2+.
    expect(count).toBeLessThanOrEqual(1);
  });
});
