import test from "node:test";
import assert from "node:assert/strict";
import { LinkRouter, parseLink } from "../../../app/main/links.ts";

const record = "11111111-1111-4111-8111-111111111111";
const workspace = "22222222-2222-4222-8222-222222222222";

test("home opens only a known profile and protected route is unavailable in production", async () => {
  const router = new LinkRouter({ knownProfile: (id) => id === "default" });
  assert.equal((await router.decide(parseLink("solodesk://open/home"), "default")).status, "accepted");
  assert.equal((await router.decide(parseLink("solodesk://open/home"), "foreign")).status, "denied");
  assert.equal((await router.decide(parseLink(`solodesk://open/record/${record}?workspace=${workspace}`), "default")).status, "unavailable");
});

test("synthetic authority rechecks immediately before protected use", async () => {
  let allowed = true;
  const router = new LinkRouter({
    knownProfile: () => true,
    syntheticRecord: true,
    authorizeRecord: async () => { allowed = false; return true; },
    currentAuthority: () => allowed,
  });
  const decision = await router.decide(parseLink(`solodesk://open/record/${record}?workspace=${workspace}`), "default");
  assert.equal(decision.status, "denied");
});

test("one in-flight delivery is handled once and later deliberate opens remain possible", async () => {
  const router = new LinkRouter({ knownProfile: () => true });
  const intent = parseLink("solodesk://open/home");
  const first = await router.decide(intent, "default", "delivery-1");
  const duplicate = await router.decide(intent, "default", "delivery-1");
  const later = await router.decide(intent, "default", "delivery-2");
  assert.equal(first.status, "accepted");
  assert.equal(duplicate.status, "denied");
  assert.equal(later.status, "accepted");
});
