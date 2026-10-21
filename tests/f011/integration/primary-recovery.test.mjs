import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PrimaryRecoveryManager } from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  F011_CANARY_SECRETS,
} from "../fixtures/security-fixtures.mjs";

describe("T035: Neutral Primary-Credential Recovery & Non-Enumeration", () => {
  it("returns identical visible shape, status, and wording for existing and non-existing accounts", async () => {
    const manager = new PrimaryRecoveryManager({
      knownAccounts: [ACCOUNT_A.subject_id, "alice@solodesk.test"],
    });

    const existingRes = await manager.requestRecovery("alice@solodesk.test");
    const nonExistingRes = await manager.requestRecovery(
      "nobody_here@solodesk.test",
    );
    const disabledRes = await manager.requestRecovery(
      "disabled_user@solodesk.test",
    );

    // All returns have strictly identical shape and keys
    assert.deepEqual(
      Object.keys(existingRes).sort(),
      Object.keys(nonExistingRes).sort(),
    );
    assert.deepEqual(
      Object.keys(existingRes).sort(),
      Object.keys(disabledRes).sort(),
    );

    assert.equal(existingRes.status, "recovery_requested");
    assert.equal(nonExistingRes.status, "recovery_requested");
    assert.equal(
      existingRes.messageKey,
      "identity.security.status.recovery_requested",
    );
    assert.equal(
      nonExistingRes.messageKey,
      "identity.security.status.recovery_requested",
    );

    // No enumeration flags
    assert.equal("accountExists" in existingRes, false);
    assert.equal("userFound" in nonExistingRes, false);
    assert.equal("delivered" in existingRes, false);
  });

  it("fails closed on secret canaries and raw provider errors", async () => {
    const manager = new PrimaryRecoveryManager();

    await assert.rejects(
      async () =>
        manager.requestRecovery("user@solodesk.test", {
          rawPassword: F011_CANARY_SECRETS.rawPassword,
        }),
      /prohibited_secret/,
    );
  });

  it("handles rate-limiting neutrally without account status disclosure", async () => {
    const manager = new PrimaryRecoveryManager({ maxRequests: 2 });
    const id = "frequent_requester@solodesk.test";

    await manager.requestRecovery(id);
    await manager.requestRecovery(id);

    // 3rd attempt is rate limited
    const rateLimitedRes = await manager.requestRecovery(id);
    assert.equal(rateLimitedRes.status, "rate_limited");
    assert.equal(
      rateLimitedRes.messageKey,
      "identity.security.status.rate_limited",
    );
    assert.equal(rateLimitedRes.safeNextAction, "retry_later");
    assert.equal("accountExists" in rateLimitedRes, false);
  });
});
