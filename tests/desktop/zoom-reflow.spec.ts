import { test, expect } from "@playwright/test";

test.describe("Responsive Zoom Reflow (A-19, A-20)", () => {
  const viewports = [
    { width: 1920, height: 1080, name: "1080p full width" },
    { width: 1440, height: 900, name: "Standard laptop" },
    { width: 1024, height: 768, name: "Minimum supported 1024x768 CSS pixels" },
    { width: 768, height: 1024, name: "Tablet vertical (768x1024)" },
    {
      width: 512,
      height: 384,
      name: "200% zoom effective viewport (1024 / 2)",
    },
    { width: 360, height: 640, name: "Mobile viewport (360x640)" },
  ];

  for (const vp of viewports) {
    test(`zero horizontal scrollbar at ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      const hasHorizontalOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth;
      });

      expect(hasHorizontalOverflow).toBe(false);
    });
  }

  test("mobile navigation drawer opens and closes cleanly on narrow viewports", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });

    // Mobile menu toggle button should be visible on narrow screens
    const menuButton = page.locator(
      'button[aria-label*="Open menu" i], button[aria-label*="فتح القائمة" i]',
    );
    await expect(menuButton).toBeVisible();

    // Open mobile drawer
    await menuButton.click();

    // Drawer should become visible
    const drawer = page.locator('aside[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible();

    // Close button should close drawer
    const closeButton = page.locator(
      'button[aria-label*="Close menu" i], button[aria-label*="إغلاق القائمة" i]',
    );
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    await expect(drawer).not.toBeVisible();
  });
});
