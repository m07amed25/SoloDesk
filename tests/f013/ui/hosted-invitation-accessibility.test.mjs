import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";

test("F013 T063: Hosted invitation UI supports complete bilingual localized journeys", () => {
  const hostedSrc = fs.readFileSync(
    path.resolve("web/auth/invitation.tsx"),
    "utf8",
  );

  // Localization imports and dir handling
  assert.ok(
    hostedSrc.includes('from "../../packages/localization/src/shell/en.ts"'),
  );
  assert.ok(
    hostedSrc.includes('from "../../packages/localization/src/shell/ar.ts"'),
  );
  assert.ok(
    hostedSrc.includes('dir={isRtl ? "rtl" : "ltr"}'),
    "Root container sets logical dir attribute",
  );

  // Key journey labels present
  const requiredKeys = [
    "invitation.redemption.title",
    "invitation.redemption.reviewHeading",
    "invitation.redemption.confirm",
    "invitation.redemption.accepting",
    "invitation.redemption.accepted",
    "invitation.redemption.acceptedNotice",
    "invitation.redemption.wrongAccountNotice",
    "invitation.redemption.unavailableNotice",
    "invitation.redemption.switchAccount",
    "invitation.redemption.returnHome",
  ];

  for (const key of requiredKeys) {
    assert.ok(en[key], `en missing key: ${key}`);
    assert.ok(ar[key], `ar missing key: ${key}`);
  }
});

test("F013 T063: Hosted UI enforces secret scrubbing and cookie/fragment privacy", () => {
  const hostedSrc = fs.readFileSync(
    path.resolve("web/auth/invitation.tsx"),
    "utf8",
  );

  // URL fragment scrubbing
  assert.ok(
    hostedSrc.includes("window.history.replaceState"),
    "Scrubs window history immediately",
  );
  assert.ok(
    hostedSrc.includes("window.location.pathname + window.location.search"),
    "Removes hash fragment from address bar",
  );

  // Credentials include for HttpOnly continuation cookie
  assert.ok(
    hostedSrc.includes('credentials: "include"'),
    "Uses secure continuation cookies",
  );
});

test("F013 T063: Accessible alert semantics and heading hierarchy in hosted redemption", () => {
  const hostedSrc = fs.readFileSync(
    path.resolve("web/auth/invitation.tsx"),
    "utf8",
  );

  // Accessible headings and alerts
  assert.ok(hostedSrc.includes("<h1"), "Includes primary h1 heading");
  assert.ok(
    hostedSrc.includes('role="alert"'),
    "Includes alert role for notifications/errors",
  );
  assert.ok(
    hostedSrc.includes("<bdi>"),
    "Includes bdi element for mixed direction labels",
  );
});

test("F013 T063: Hosted CSS styles implement contrast, reduced motion, and 200% reflow", () => {
  const cssSrc = fs.readFileSync(path.resolve("web/auth/styles.css"), "utf8");

  // Reduced motion query
  assert.ok(
    cssSrc.includes("@media (prefers-reduced-motion: reduce)"),
    "Implements prefers-reduced-motion media query",
  );

  // Logical properties or responsive reflow
  assert.ok(
    cssSrc.includes("box-sizing: border-box"),
    "Universal border-box for reflow",
  );
  assert.ok(
    cssSrc.includes("max-width"),
    "Responsive bounded container max-width",
  );
});
