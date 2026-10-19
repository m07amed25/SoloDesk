import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("globals.css configures reduced motion overrides", () => {
  const cssPath = path.resolve("app/renderer/styles/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.ok(
    cssContent.includes("@media (prefers-reduced-motion: reduce)"),
    "globals.css must define prefers-reduced-motion media query",
  );
  assert.ok(
    cssContent.includes("animation-duration") &&
      cssContent.includes("transition-duration"),
    "globals.css must suppress animation and transition durations under reduced motion",
  );
});

test("globals.css configures high contrast visible focus indicator", () => {
  const cssPath = path.resolve("app/renderer/styles/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.ok(
    cssContent.includes(":focus-visible"),
    "globals.css must define :focus-visible rules",
  );
  assert.ok(
    cssContent.includes("outline: 2px solid"),
    ":focus-visible must enforce minimum 2px solid outline",
  );
});

test("globals.css configures Windows forced colors mode", () => {
  const cssPath = path.resolve("app/renderer/styles/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.ok(
    cssContent.includes("@media (forced-colors: active)"),
    "globals.css must handle forced-colors high contrast mode",
  );
  assert.ok(
    cssContent.includes("ButtonBorder") || cssContent.includes("Highlight"),
    "forced-colors must use system color keywords",
  );
});
