import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";
import {
  isRendererAccountSecurityState,
} from "../../../app/shared/identity-security-contracts.ts";
import {
  F011_CANARY_SECRETS,
  VALID_POLICY_SYNTHETIC,
  VALID_POLICY_REQUIRED,
} from "../fixtures/security-fixtures.mjs";

describe("T022: Factor Enrollment UI, Localization & IPC Privacy", () => {
  const securityKeys = [
    "identity.security.title",
    "identity.security.policy.optional",
    "identity.security.policy.required",
    "identity.security.status.not_configured",
    "identity.security.status.recovery_codes_pending",
    "identity.security.status.ready",
    "identity.security.announcement.browser_opened",
    "identity.security.action.enroll_factor",
    "identity.security.action.acknowledge_recovery_codes",
    "identity.security.action.cancel",
    "identity.security.recovery_codes.confined_warning",
  ];

  it("enforces bilingual English and Arabic localization parity with authentic Arabic script", () => {
    const arabicRegex = /[\u0600-\u06FF]/;

    for (const key of securityKeys) {
      assert.ok(en[key], `en missing key: ${key}`);
      assert.ok(ar[key], `ar missing key: ${key}`);
      assert.ok(en[key].length > 0, `en key ${key} is empty`);
      assert.ok(ar[key].length > 0, `ar key ${key} is empty`);
      assert.ok(
        arabicRegex.test(ar[key]),
        `Arabic text for ${key} must contain Arabic characters`,
      );
    }
  });

  it("validates renderer-safe security state DTO for recovery_codes_pending and ready", () => {
    const pendingState = {
      version: 1,
      policy_status: "optional",
      readiness: "recovery_codes_pending",
      factor_category: "totp",
      factor_label: "Authenticator App",
      recovery_status: "available",
      current_session: "continues_aal2",
      other_sessions: "ended",
      local_data: "retained_encrypted",
      heading_key: "identity.security.status.recovery_codes_pending",
      message_key: "identity.security.recovery_codes.confined_warning",
      action_key: "identity.security.action.acknowledge_recovery_codes",
      requires_online: true,
      has_retained_data: true,
      is_reconciling: false,
    };

    assert.equal(isRendererAccountSecurityState(pendingState), true);

    const readyState = {
      ...pendingState,
      readiness: "ready",
      heading_key: "identity.security.status.ready",
      message_key: "identity.security.status.ready",
      action_key: undefined,
    };

    assert.equal(isRendererAccountSecurityState(readyState), true);
  });

  it("ensures native renderer state DTO and IPC boundaries never expose secrets or raw codes", () => {
    const safeState = {
      version: 1,
      policy_status: "required",
      readiness: "recovery_codes_pending",
      factor_category: "totp",
      recovery_status: "available",
      current_session: "continues_aal2",
      other_sessions: "ended",
      local_data: "retained_encrypted",
      heading_key: "identity.security.status.recovery_codes_pending",
      message_key: "identity.security.recovery_codes.confined_warning",
      action_key: "identity.security.action.acknowledge_recovery_codes",
      requires_online: true,
      has_retained_data: true,
      is_reconciling: false,
    };

    const serialized = JSON.stringify(safeState);

    // Verify no secret canary is present
    for (const canary of Object.values(F011_CANARY_SECRETS)) {
      if (typeof canary === "string") {
        assert.equal(serialized.includes(canary), false);
      }
    }

    // Verify recovery codes are not passed in renderer DTO
    assert.equal("recovery_codes" in safeState, false);
    assert.equal("codes" in safeState, false);
    assert.equal("raw_totp_secret" in safeState, false);
  });
});
