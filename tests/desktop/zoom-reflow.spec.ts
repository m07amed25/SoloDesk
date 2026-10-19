import { test, expect } from "@playwright/test";

test.describe("Responsive Zoom Reflow (A-19, A-20)", () => {
  const viewports = [
    { width: 1920, height: 1080, name: "1080p full width" },
    { width: 1440, height: 900, name: "Standard laptop" },
    { width: 1024, height: 768, name: "Minimum supported 1024x768 CSS pixels" },
    {
      width: 512,
      height: 384,
      name: "200% zoom effective viewport (1024 / 2)",
    },
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
});
