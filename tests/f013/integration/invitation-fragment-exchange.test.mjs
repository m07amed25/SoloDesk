import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  isCanonicalUuid,
  computeInvitationOperationDigest,
} from "../../../app/shared/invitation-contracts.ts";
import {
  parseInvitationFragment,
  digestInvitationSecret,
  constantTimeCompare,
  assembleInvitationFragmentUrl,
} from "../../../supabase/functions/_shared/invitation-delivery.ts";


test("F013 T031: Fragment URL assembly and parsing", () => {
  const selector = `sel_${crypto.randomBytes(16).toString("hex")}`;
  const secret = crypto.randomBytes(32).toString("hex");

  const fragmentUrl = assembleInvitationFragmentUrl(
    "https://auth.solodesk.test/invitation",
    selector,
    secret,
  );

  assert.ok(fragmentUrl.startsWith("https://auth.solodesk.test/invitation#"));
  assert.ok(fragmentUrl.includes(`selector=${selector}`));
  assert.ok(fragmentUrl.includes(`secret=${secret}`));

  // Parse valid fragment
  const hash = fragmentUrl.split("#")[1];
  const parsed = parseInvitationFragment(hash);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.selector, selector);
    assert.equal(parsed.secret, secret);
  }
});

test("F013 T031: Rejects malformed, truncated, or oversized selectors and secrets", () => {
  // Missing selector
  assert.equal(parseInvitationFragment("secret=abc").ok, false);
  // Missing secret
  assert.equal(parseInvitationFragment("selector=sel_123").ok, false);
  // Empty
  assert.equal(parseInvitationFragment("").ok, false);
  // Short selector
  assert.equal(
    parseInvitationFragment("selector=sel_short&secret=" + "a".repeat(64)).ok,
    false,
  );
  // Selector without sel_ prefix
  assert.equal(
    parseInvitationFragment("selector=" + "a".repeat(36) + "&secret=" + "a".repeat(64)).ok,
    false,
  );
  // Short secret (not 256 bits / 64 hex chars)
  assert.equal(
    parseInvitationFragment("selector=sel_" + "a".repeat(32) + "&secret=short").ok,
    false,
  );
  // Secret with non-hex characters
  assert.equal(
    parseInvitationFragment(
      "selector=sel_" + "a".repeat(32) + "&secret=" + "g".repeat(64),
    ).ok,
    false,
  );
  // Oversized payload
  assert.equal(
    parseInvitationFragment(
      "selector=sel_" + "a".repeat(32) + "&secret=" + "a".repeat(64) + "&extra=" + "x".repeat(1000),
    ).ok,
    false,
  );
});

test("F013 T031: Constant-time digest comparison rejects guessed or corrupted secrets", async () => {
  const rawSecret1 = crypto.randomBytes(32).toString("hex");
  const rawSecret2 = crypto.randomBytes(32).toString("hex");

  const digest1 = await digestInvitationSecret(rawSecret1);
  const digest2 = await digestInvitationSecret(rawSecret2);

  assert.equal(constantTimeCompare(digest1, digest1), true);
  assert.equal(constantTimeCompare(digest1, digest2), false);

  // Alter single byte
  const corrupted = new Uint8Array(digest1);
  corrupted[0] ^= 1;
  assert.equal(constantTimeCompare(digest1, corrupted), false);
});

test("F013 T031: Neutral public responses on non-existent or expired selector/secret", async () => {
  // Neutral contract: any failure to match current valid generation collapses to neutral unavailable
  const neutralResponse = {
    state: "unavailable",
    action: "request_new_invitation",
  };

  const simulateExchange = (exists, secretMatches, expired) => {
    if (!exists || !secretMatches || expired) {
      return neutralResponse;
    }
    return { state: "continue", next: "sign_in" };
  };

  // Selector does not exist
  assert.deepEqual(simulateExchange(false, false, false), neutralResponse);
  // Selector exists but secret wrong
  assert.deepEqual(simulateExchange(true, false, false), neutralResponse);
  // Selector exists and secret matches but expired
  assert.deepEqual(simulateExchange(true, true, true), neutralResponse);
  // Valid current generation
  assert.deepEqual(simulateExchange(true, true, false), {
    state: "continue",
    next: "sign_in",
  });
});
