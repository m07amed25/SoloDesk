import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { transformWithOxc } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { en } from "../../packages/localization/src/shell/en.ts";
import { ar } from "../../packages/localization/src/shell/ar.ts";

const requireActual = createRequire(import.meta.url);

async function loadBannerComponent() {
  const source = readFileSync(
    "app/renderer/shell/QuotaWarningBanner.tsx",
    "utf8",
  );
  const transformed = await transformWithOxc(
    source,
    "app/renderer/shell/QuotaWarningBanner.tsx",
  );
  const js = transformed.code
    .replace(/^import .*;\s*$/gm, "")
    .replace(
      "export function QuotaWarningBanner",
      "function QuotaWarningBanner",
    );

  const mockIcon = (name) => (props) =>
    React.createElement("svg", { "data-icon": name, ...props });

  const context = {
    React,
    useLocalization: () => ({
      locale: "en",
      t: (k) => en[k] || k,
    }),
    Button: (props) => React.createElement("button", props),
    AlertTriangle: mockIcon("AlertTriangle"),
    AlertCircle: mockIcon("AlertCircle"),
    CloudOff: mockIcon("CloudOff"),
    X: mockIcon("X"),
    _jsx: requireActual("react/jsx-runtime").jsx,
    _jsxs: requireActual("react/jsx-runtime").jsxs,
    document: undefined,
    window: undefined,
  };

  return vm.runInNewContext(`${js}\nQuotaWarningBanner`, context);
}

test("A-16: QuotaWarningBanner renders bilingual English/Arabic with proper RTL/LTR semantics", async () => {
  const QuotaWarningBanner = await loadBannerComponent();

  // English 70% warning
  const enMarkup = renderToStaticMarkup(
    React.createElement(QuotaWarningBanner, {
      tier: "warning_70",
      overrideLocale: "en",
    }),
  );
  assert.match(enMarkup, /role="alert"/);
  assert.match(enMarkup, /dir="ltr"/);
  assert.match(enMarkup, /aria-live="polite"/);
  assert.match(enMarkup, /data-testid="quota-warning-70-banner"/);
  assert.match(enMarkup, /Storage utilization reached 70%/);

  // Arabic 70% warning
  const arComponent = async () => {
    const source = readFileSync(
      "app/renderer/shell/QuotaWarningBanner.tsx",
      "utf8",
    );
    const transformed = await transformWithOxc(
      source,
      "app/renderer/shell/QuotaWarningBanner.tsx",
    );
    const js = transformed.code
      .replace(/^import .*;\s*$/gm, "")
      .replace(
        "export function QuotaWarningBanner",
        "function QuotaWarningBanner",
      );
    const mockIcon = (name) => (props) =>
      React.createElement("svg", { "data-icon": name, ...props });
    const context = {
      React,
      useLocalization: () => ({
        locale: "ar",
        t: (k) => ar[k] || k,
      }),
      Button: (props) => React.createElement("button", props),
      AlertTriangle: mockIcon("AlertTriangle"),
      AlertCircle: mockIcon("AlertCircle"),
      CloudOff: mockIcon("CloudOff"),
      X: mockIcon("X"),
      _jsx: requireActual("react/jsx-runtime").jsx,
      _jsxs: requireActual("react/jsx-runtime").jsxs,
    };
    return vm.runInNewContext(`${js}\nQuotaWarningBanner`, context);
  };

  const ArQuotaWarningBanner = await arComponent();
  const arMarkup = renderToStaticMarkup(
    React.createElement(ArQuotaWarningBanner, {
      tier: "warning_70",
      overrideLocale: "ar",
    }),
  );
  assert.match(arMarkup, /role="alert"/);
  assert.match(arMarkup, /dir="rtl"/);
  assert.match(arMarkup, /aria-live="polite"/);
  assert.match(arMarkup, /وصل استهلاك مساحة التخزين إلى 70٪/);
});

test("A-16 / A-17: QuotaWarningBanner renders progressive tiers and assertive live-region for critical/exhausted", async () => {
  const QuotaWarningBanner = await loadBannerComponent();

  // 1. Normal tier produces null (zero banner noise)
  const normalMarkup = renderToStaticMarkup(
    React.createElement(QuotaWarningBanner, {
      tier: "normal",
      providerStatus: "operational",
    }),
  );
  assert.equal(normalMarkup, "");

  // 2. Warning 85
  const markup85 = renderToStaticMarkup(
    React.createElement(QuotaWarningBanner, {
      tier: "warning_85",
    }),
  );
  assert.match(markup85, /data-testid="quota-warning-85-banner"/);
  assert.match(markup85, /aria-live="polite"/);

  // 3. Critical 95
  const markup95 = renderToStaticMarkup(
    React.createElement(QuotaWarningBanner, {
      tier: "critical_95",
    }),
  );
  assert.match(markup95, /data-testid="quota-critical-banner"/);
  assert.match(markup95, /aria-live="assertive"/);
  assert.match(markup95, /Critical storage warning/);

  // 4. Exhausted 100
  const markup100 = renderToStaticMarkup(
    React.createElement(QuotaWarningBanner, {
      tier: "exhausted_100",
    }),
  );
  assert.match(markup100, /data-testid="quota-exhausted-banner"/);
  assert.match(markup100, /aria-live="assertive"/);
  assert.match(markup100, /Cloud storage capacity exhausted/);

  // 5. Cloud degraded status
  const markupDegraded = renderToStaticMarkup(
    React.createElement(QuotaWarningBanner, {
      tier: "normal",
      providerStatus: "degraded",
    }),
  );
  assert.match(markupDegraded, /data-testid="quota-degraded-banner"/);
  assert.match(markupDegraded, /temporarily unavailable or degraded/);
});

test("A-16: QuotaWarningBanner satisfies WCAG 2.2 AA visible focus indicators on action elements", async () => {
  const QuotaWarningBanner = await loadBannerComponent();
  const markup = renderToStaticMarkup(
    React.createElement(QuotaWarningBanner, {
      tier: "warning_70",
    }),
  );

  // Button must have focus-visible styling for WCAG AA compliance
  assert.match(markup, /focus-visible:outline-2/);
  assert.match(markup, /focus-visible:outline-ring/);
  assert.match(markup, /aria-label="Dismiss alert"/);
});
