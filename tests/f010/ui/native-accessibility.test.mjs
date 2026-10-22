import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("T055: Renderer Native Accessibility for F010", () => {
  const userMenuPath = path.resolve("app/renderer/components/shell/UserMenu.tsx");
  const authDialogPath = path.resolve("app/renderer/components/identity/AuthDialog.tsx");
  const settingsViewPath = path.resolve("app/renderer/components/shell/SettingsView.tsx");
  const viteConfigPath = path.resolve("vite.config.mts");

  it("ensures UserMenu adheres to keyboard accessibility and ARIA rules", () => {
    assert.ok(fs.existsSync(userMenuPath), "UserMenu.tsx must exist");
    const code = fs.readFileSync(userMenuPath, "utf-8");

    // Must have aria-expanded and aria-haspopup for dropdown trigger
    assert.ok(code.includes('aria-expanded={isOpen}'), "Trigger must bind aria-expanded");
    assert.ok(code.includes('aria-haspopup="dialog"'), "Trigger must define aria-haspopup");
    assert.ok(code.includes('role="dialog"'), "Menu container must have dialog role");
    assert.ok(code.includes('aria-label='), "Must have accessible label");

    // All interactive buttons must have type="button" or "submit"
    const buttonMatches = [...code.matchAll(/<button\b([^>]*)>/g)];
    for (const match of buttonMatches) {
      assert.ok(
        match[1].includes('type="button"') || match[1].includes('type="submit"'),
        `Button missing explicit type: ${match[0]}`,
      );
    }

    // Keep the account dropdown focused on identity and account preferences.
    assert.ok(
      !code.includes('t("sidebar.main_nav")'),
      "UserMenu must not duplicate the main navigation toggle",
    );
    assert.ok(code.includes('t("theme.label")'), "UserMenu must include theme switcher");
    assert.ok(code.includes('toggleTheme'), "UserMenu must bind toggleTheme handler");
    assert.ok(
      code.includes("if (!isAuthenticated && !isEnrolling)"),
      "Signed-out users must receive a dedicated sign-in menu",
    );
    assert.ok(
      code.includes('aria-label={t("auth.title")}'),
      "The signed-out menu must identify its sign-in purpose",
    );
    assert.ok(
      code.includes('referrerPolicy="no-referrer"') && code.includes("onError="),
      "Remote profile photos must suppress referrers and retain the initials fallback",
    );
    assert.ok(
      fs
        .readFileSync(viteConfigPath, "utf-8")
        .includes("img-src 'self' data: https://lh3.googleusercontent.com"),
      "Renderer CSP must allow only the Google profile-photo origin",
    );
  });

  it("ensures non-color status indication for device and vault states", () => {
    const code = fs.readFileSync(userMenuPath, "utf-8");

    // Device enrollment status must display semantic text, not just a colored dot
    assert.ok(
      code.includes("t(\"auth.deviceEnrolled\")") && code.includes("t(\"auth.deviceNotEnrolled\")"),
      "UserMenu must render text for enrolled/not-enrolled states",
    );

    // Protection status must display text label
    assert.ok(
      code.includes("t(\"auth.protectionReady\")") && code.includes("t(\"auth.protectionBlocked\")"),
      "UserMenu must render text for protection ready/blocked states",
    );
  });

  it("ensures AuthDialog includes polite live regions and error alerts", () => {
    assert.ok(fs.existsSync(authDialogPath), "AuthDialog.tsx must exist");
    const code = fs.readFileSync(authDialogPath, "utf-8");

    assert.ok(code.includes('role="alert"'), "Errors in AuthDialog must use role=alert");
    assert.ok(code.includes('aria-hidden'), "Decorative icons must be hidden from screen readers");
  });

  it("ensures SettingsView provides structured headings and accessible form elements", () => {
    assert.ok(fs.existsSync(settingsViewPath), "SettingsView.tsx must exist");
    const code = fs.readFileSync(settingsViewPath, "utf-8");

    assert.ok(
      code.includes('aria-labelledby="account-settings-heading"'),
      "Account section must have aria-labelledby heading",
    );
    assert.ok(
      code.includes('id="account-settings-heading"'),
      "Account heading ID must match aria-labelledby",
    );
  });
});
