import test from "node:test";
import assert from "node:assert/strict";
import { ProfileOwners, parseActivation } from "../../../app/main/profiles.ts";
import { profiles } from "../fixtures/desktop.mjs";

test("one in-flight owner wins one hundred simultaneous opens", async () => {
  const owners = new ProfileOwners([profiles.default, profiles.a, profiles.b]);
  let creates = 0;
  const create = async (_id, epoch) => {
    creates++;
    await new Promise((resolve) => setTimeout(resolve, 1));
    return { epoch, focus() {} };
  };
  const opened = await Promise.all(
    Array.from({ length: 100 }, () => owners.activate(profiles.a, create)),
  );
  assert.equal(creates, 1);
  assert.equal(new Set(opened).size, 1);
  assert.equal(owners.size, 1);
});

test("distinct profiles never share owner or activation", async () => {
  const owners = new ProfileOwners([profiles.a, profiles.b]);
  const a = await owners.activate(profiles.a, async (_id, epoch) => ({
    epoch,
    focus() {},
  }));
  const b = await owners.activate(profiles.b, async (_id, epoch) => ({
    epoch,
    focus() {},
  }));
  assert.notEqual(a, b);
  assert.equal(owners.size, 2);
  await assert.rejects(owners.activate("foreign", async () => ({})));
});

test("app-registered isolated profiles can be activated", async () => {
  const owners = new ProfileOwners([profiles.default]);
  const profileId = "p0123456789abcdef0123456789abcd";
  owners.register(profileId);
  const view = { focus() {} };
  assert.equal(await owners.activate(profileId, async () => view), view);
});

test("close removes stale context and reopen advances epoch", async () => {
  const owners = new ProfileOwners([profiles.default]);
  const first = await owners.activate(profiles.default, async (_id, epoch) => ({
    epoch,
    focus() {},
  }));
  owners.close(profiles.default, first);
  const second = await owners.activate(
    profiles.default,
    async (_id, epoch) => ({ epoch, focus() {} }),
  );
  assert.notEqual(first, second);
  assert.ok(second.epoch > first.epoch);
});

test("activation additionalData is bounded and closed", () => {
  assert.deepEqual(
    parseActivation({ version: 1, profileId: profiles.default }),
    { profileId: profiles.default },
  );
  for (const bad of [
    { version: 2, profileId: profiles.default },
    { version: 1, profileId: "../../other" },
    { version: 1, profileId: profiles.default, command: "shell" },
    { version: 1, profileId: "x".repeat(5000) },
  ])
    assert.equal(parseActivation(bad), null);
});
