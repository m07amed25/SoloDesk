import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isolateBidi,
  isLtrToken,
  LRM,
  RLM,
} from "../../../app/renderer/lib/bidi.ts";

describe("T056: RTL and Bidi Isolation for F010", () => {
  it("isolates pure LTR tokens (emails, UUIDs, diagnostic IDs, version tags)", () => {
    const email = "user@example.com";
    assert.equal(isLtrToken(email), true);
    const isolated = isolateBidi(email);
    assert.equal(isolated, `${LRM}user@example.com${LRM}`);
    // Underlying stored string is unmodified
    assert.equal(email, "user@example.com");

    const diagnosticId = "309df112-c2ff-4d34-bb65-22b183bd2745";
    assert.equal(isLtrToken(diagnosticId), true);
    assert.equal(isolateBidi(diagnosticId), `${LRM}${diagnosticId}${LRM}`);

    const versionTag = "v1.0.0-rc.1";
    assert.equal(isLtrToken(versionTag), true);
    assert.equal(isolateBidi(versionTag), `${LRM}${versionTag}${LRM}`);
  });

  it("identifies Arabic and mixed-direction strings correctly", () => {
    const arabicLabel = "جهاز المكتب الرئيسي";
    assert.equal(isLtrToken(arabicLabel), false);

    const mixedLabel = "جهاز محمد 💻 MacBook Pro";
    assert.equal(isLtrToken(mixedLabel), false);

    const latinOnly = "Mohamed's Laptop";
    assert.equal(isLtrToken(latinOnly), true);
  });

  it("handles empty or falsy values gracefully without throwing", () => {
    assert.equal(isLtrToken(""), false);
    assert.equal(isolateBidi(""), "");
    assert.equal(isLtrToken(null), false);
    assert.equal(isolateBidi(null), null);
  });

  it("ensures LRM and RLM directional constants match Unicode specification", () => {
    assert.equal(LRM, "\u200E");
    assert.equal(RLM, "\u200F");
  });
});
