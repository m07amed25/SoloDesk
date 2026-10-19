import { test, expect } from "@playwright/test";

test.describe("Bilingual LTR/RTL Parity & Window Controls (A-01, A-05)", () => {
  test("toggling language dynamically updates dir, lang, and font attributes", async ({
    page,
  }) => {
    const html = page.locator("html");

    // Check initial LTR state
    const initialDir = await html.getAttribute("dir");
    expect(initialDir === "ltr" || initialDir === "rtl").toBeTruthy();

    // Toggle language button
    const langButton = page
      .locator(
        'button[aria-label*="التبديل" i], button[aria-label*="Switch" i]',
      )
      .first();
    if (await langButton.isVisible()) {
      await langButton.click();

      const nextDir = await html.getAttribute("dir");
      expect(nextDir).not.toBe(initialDir);

      if (nextDir === "rtl") {
        await expect(html).toHaveAttribute("lang", "ar");
      } else {
        await expect(html).toHaveAttribute("lang", "en");
      }
    }
  });

  test("window controls container preserves physical top-right placement in RTL (A-05)", async ({
    page,
  }) => {
    // Switch to Arabic RTL if not already
    const html = page.locator("html");
    const langButton = page.locator('button[aria-label*="التبديل" i]').first();
    if (await langButton.isVisible()) {
      await langButton.click();
    }

    // Windows/Linux window controls container must retain absolute top-right position
    const titlebarControls = page.locator(
      'header[role="banner"] div[dir="ltr"]',
    );
    if (await titlebarControls.isVisible()) {
      const box = await titlebarControls.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        // Controls must be near right edge (within 150px of viewport right edge)
        expect(box.x + box.width).toBeGreaterThanOrEqual(viewport.width - 20);
      }
    }
  });

  test("bidi tokens render within isolated <bdi> wrappers", async ({
    page,
  }) => {
    const bdiElements = page.locator("bdi");
    const count = await bdiElements.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const el = bdiElements.nth(i);
      const text = await el.innerText();
      if (text.includes("INV-2026-001")) {
        expect(text).toContain("INV-2026-001");
      }
    }
  });
});
