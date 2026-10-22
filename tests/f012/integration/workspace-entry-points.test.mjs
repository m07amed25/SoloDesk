import test from "node:test";
import assert from "node:assert/strict";
import { parseLink, LinkRouter } from "../../../app/main/links.ts";

test("T048: parseLink retains exact recordId and workspaceId canonical UUIDs", () => {
  const recordId = "a1111111-1111-4111-8111-111111111111";
  const workspaceId = "b2222222-2222-4222-8222-222222222222";
  const url = `solodesk://open/record/${recordId}?workspace=${workspaceId}`;

  const intent = parseLink(url);
  assert.ok(intent);
  assert.equal(intent.kind, "record");
  assert.equal(intent.recordId, recordId);
  assert.equal(intent.workspaceId, workspaceId);
});

test("T048: parseLink rejects malformed, non-UUID, or dangerous characters", () => {
  // Non-UUID record
  assert.equal(parseLink("solodesk://open/record/not-a-uuid?workspace=b2222222-2222-4222-8222-222222222222"), null);
  // Non-UUID workspace
  assert.equal(parseLink("solodesk://open/record/a1111111-1111-4111-8111-111111111111?workspace=injection"), null);
  // Path traversal or control characters
  assert.equal(parseLink("solodesk://open/record/../../../etc/passwd"), null);
  assert.equal(parseLink("solodesk://open/record/a1111111-1111-4111-8111-111111111111%00"), null);
});

test("T048: LinkRouter accepts record link matching current workspace", async () => {
  const currentWsId = "11111111-1111-4111-8111-111111111111";
  const recordId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const router = new LinkRouter({
    knownProfile: (p) => p === "prof-1",
    syntheticRecord: true,
    getCurrentWorkspaceId: (p) => currentWsId,
    isWorkspaceSelectable: async (wsId, p) => wsId === currentWsId,
    authorizeRecord: async (intent, p) => true,
    currentAuthority: (intent, p) => true,
  });

  const intent = parseLink(`solodesk://open/record/${recordId}?workspace=${currentWsId}`);
  const decision = await router.decide(intent, "prof-1");

  assert.equal(decision.status, "accepted");
  assert.equal(decision.route, "record");
});

test("T048: LinkRouter requires switch for authorized different workspace", async () => {
  const currentWsId = "11111111-1111-4111-8111-111111111111";
  const targetWsId = "22222222-2222-4222-8222-222222222222";
  const recordId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  const router = new LinkRouter({
    knownProfile: (p) => p === "prof-1",
    syntheticRecord: true,
    getCurrentWorkspaceId: (p) => currentWsId,
    isWorkspaceSelectable: async (wsId, p) => wsId === targetWsId || wsId === currentWsId,
    authorizeRecord: async (intent, p) => true,
    currentAuthority: (intent, p) => true,
  });

  const intent = parseLink(`solodesk://open/record/${recordId}?workspace=${targetWsId}`);
  const decision = await router.decide(intent, "prof-1");

  assert.equal(decision.status, "switch_required");
  assert.equal(decision.targetWorkspaceId, targetWsId);
  assert.equal(decision.recordId, recordId);
});

test("T048: LinkRouter gives generic denial for foreign, guessed, or revoked workspace without disclosure", async () => {
  const currentWsId = "11111111-1111-4111-8111-111111111111";
  const foreignWsId = "99999999-9999-4999-8999-999999999999";
  const recordId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  const router = new LinkRouter({
    knownProfile: (p) => p === "prof-1",
    syntheticRecord: true,
    getCurrentWorkspaceId: (p) => currentWsId,
    isWorkspaceSelectable: async (wsId, p) => false, // Not a member of foreignWsId
    authorizeRecord: async (intent, p) => false,
    currentAuthority: (intent, p) => false,
  });

  const intent = parseLink(`solodesk://open/record/${recordId}?workspace=${foreignWsId}`);
  const decision = await router.decide(intent, "prof-1");

  assert.equal(decision.status, "denied");
  // Zero metadata or workspace info is leaked in the decision
  assert.equal(decision.targetWorkspaceId, undefined);
  assert.equal(decision.route, undefined);
});

test("T048: Replayed or duplicate deliveryId is denied", async () => {
  const currentWsId = "11111111-1111-4111-8111-111111111111";
  const recordId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  const router = new LinkRouter({
    knownProfile: (p) => p === "prof-1",
    syntheticRecord: true,
    getCurrentWorkspaceId: (p) => currentWsId,
    isWorkspaceSelectable: async (wsId, p) => true,
    authorizeRecord: async (intent, p) => true,
    currentAuthority: (intent, p) => true,
  });

  const intent = parseLink(`solodesk://open/record/${recordId}?workspace=${currentWsId}`);
  const deliveryId = "delivery-123456";

  const firstDecision = await router.decide(intent, "prof-1", deliveryId);
  assert.equal(firstDecision.status, "accepted");

  // Second delivery with identical deliveryId is denied
  const secondDecision = await router.decide(intent, "prof-1", deliveryId);
  assert.equal(secondDecision.status, "denied");
});
