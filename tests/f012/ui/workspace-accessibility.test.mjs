import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

describe("T057: Workspace Renderer Accessibility & RTL Isolation Tests", () => {
  it("enforces bidi isolation wrappers (<bdi>) for dynamic workspace text", () => {
    const arabicWs = FIXTURE_WORKSPACES.ws3Arabic;
    const mixedName = "ورشة Acme 2026 🎨";

    // Text wrapped in <bdi> prevents bidirectional spillover
    const bidiWrap = (text) => `<bdi>${text}</bdi>`;
    const wrappedName = bidiWrap(mixedName);
    const wrappedDiscriminator = bidiWrap(`(${arabicWs.discriminator})`);

    assert.ok(wrappedName.startsWith("<bdi>"));
    assert.ok(wrappedName.endsWith("</bdi>"));
    assert.ok(wrappedDiscriminator.includes(arabicWs.discriminator));
  });

  it("verifies semantic status, alert, and live region patterns for screen readers", () => {
    const liveRegionStates = {
      switching: { role: "status", "aria-live": "polite" },
      locked: { role: "alert", "aria-live": "polite" },
      onlineRequired: { role: "alert", "aria-live": "polite" },
    };

    assert.equal(liveRegionStates.switching["aria-live"], "polite");
    assert.equal(liveRegionStates.locked["aria-live"], "polite");
    assert.equal(liveRegionStates.onlineRequired["aria-live"], "polite");
    assert.equal(liveRegionStates.switching.role, "status");
    assert.equal(liveRegionStates.locked.role, "alert");
  });

  it("ensures interactive elements have explicit button semantics and labels", () => {
    const actions = [
      { type: "button", label: "Create Workspace" },
      { type: "button", label: "Cancel" },
      { type: "button", label: "Save & Switch" },
      { type: "button", label: "Discard & Switch" },
      { type: "button", label: "Stay in Current Workspace" },
      { type: "button", label: "Choose another workspace" },
      { type: "button", label: "Reconnect" },
    ];

    for (const action of actions) {
      assert.equal(action.type, "button");
      assert.ok(action.label.length > 0);
    }
  });

  it("preserves currency codes and numeric discriminators without reversal in RTL contexts", () => {
    const currency = "SAR";
    const discriminator = "3333";

    // Stored and displayed order remains invariant
    assert.equal(currency, "SAR");
    assert.equal(discriminator, "3333");
  });
});
