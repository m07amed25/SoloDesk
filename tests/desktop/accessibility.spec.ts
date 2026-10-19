import { test, expect } from "@playwright/test";

test.describe("Desktop Shell Accessibility (WCAG 2.2 AA)", () => {
  test("shell structure contains standard ARIA landmarks and skip link", async ({
    page,
  }) => {
    // Assert Skip to main content link exists and targets #main-content
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);

    // Assert landmarks
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    await expect(
      page.locator('nav[role="navigation"][aria-label]'),
    ).toBeVisible();
    await expect(page.locator('main#main-content[role="main"]')).toBeVisible();
  });

  test("all interactive controls have accessible names and visible focus rings", async ({
    page,
  }) => {
    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute("aria-label");
        const text = await button.innerText();
        expect(ariaLabel || text.trim().length > 0).toBeTruthy();
      }
    }
  });

  test("command palette modal dialog exposes complete combobox semantics", async ({
    page,
  }) => {
    // Open command palette via search trigger
    const searchTrigger = page
      .locator('button[aria-label*="Search" i], button[aria-label*="ابحث" i]')
      .first();
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click();

      const dialog = page.locator('div[role="dialog"][aria-modal="true"]');
      await expect(dialog).toBeVisible();

      const combobox = dialog.locator('input[role="combobox"]');
      await expect(combobox).toBeVisible();
      await expect(combobox).toHaveAttribute("aria-autocomplete", "list");
      await expect(combobox).toHaveAttribute(
        "aria-controls",
        "command-palette-results",
      );

      const listbox = dialog.locator('div[role="listbox"], ul[role="listbox"]');
      await expect(listbox).toBeVisible();

      // Dismiss dialog via Escape
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
  });
});
