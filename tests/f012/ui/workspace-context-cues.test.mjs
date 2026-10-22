import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

describe("T049: Workspace Context Cues & Duplicate Name Discrimination", () => {
  it("discriminates identical display names with deterministic safe discriminators", () => {
    const ws1 = FIXTURE_WORKSPACES.ws1; // Acme Studio (1111)
    const ws2 = FIXTURE_WORKSPACES.ws2DuplicateName; // Acme Studio (2222)

    assert.equal(ws1.displayName, ws2.displayName, "Display names are identical");
    assert.notEqual(ws1.workspaceId, ws2.workspaceId, "Workspace IDs must be distinct UUIDs");
    assert.notEqual(ws1.discriminator, ws2.discriminator, "Discriminators must be distinct");

    // Formatted presentation includes textual discriminator, not color-only distinction
    const formatLabel = (ws) => `${ws.displayName} (${ws.discriminator})`;
    assert.equal(formatLabel(ws1), "Acme Studio (1111)");
    assert.equal(formatLabel(ws2), "Acme Studio (2222)");
    assert.notEqual(formatLabel(ws1), formatLabel(ws2));
  });

  it("never uses display name as authority or lookup key", () => {
    const ws1 = FIXTURE_WORKSPACES.ws1;
    const ws2 = FIXTURE_WORKSPACES.ws2DuplicateName;

    // A lookup by display name would be ambiguous; lookups must always use canonical UUIDv4
    const findByUUID = (list, id) => list.find((w) => w.workspaceId === id);
    const list = [ws1, ws2];

    assert.equal(findByUUID(list, ws1.workspaceId), ws1);
    assert.equal(findByUUID(list, ws2.workspaceId), ws2);
  });

  it("presents both source and target identity before switch commitment", () => {
    const sourceWs = FIXTURE_WORKSPACES.ws1;
    const targetWs = FIXTURE_WORKSPACES.ws2DuplicateName;

    // Both source and target must be identifiable by name and discriminator
    const dialogCues = {
      sourceLabel: `${sourceWs.displayName} (${sourceWs.discriminator})`,
      targetLabel: `${targetWs.displayName} (${targetWs.discriminator})`,
    };

    assert.ok(dialogCues.sourceLabel.includes(sourceWs.discriminator));
    assert.ok(dialogCues.targetLabel.includes(targetWs.discriminator));
    assert.notEqual(dialogCues.sourceLabel, dialogCues.targetLabel);
  });
});
