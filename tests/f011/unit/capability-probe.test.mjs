import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CapabilityProbe,
  PROBE_STATUS,
  PROBE_ERROR_CODES,
  redactSecrets,
  getPinnedMetadata,
} from "../../../tooling/f011/capability-probe.mjs";

function createMockClient({
  hasTotp = true,
  hasRecoveryCodes = true,
  throwError = false,
  totpError = null,
  recoveryCodesError = null,
} = {}) {
  if (throwError) {
    return {
      auth: {
        get mfa() {
          throw new Error("Provider runtime crash");
        },
      },
    };
  }

  const client = {
    auth: {
      mfa: {},
    },
  };

  if (hasTotp) {
    client.auth.mfa.enroll = async ({ factorType, friendlyName }) => {
      if (totpError) return { data: null, error: { message: totpError } };
      return {
        data: {
          id: "factor_mock_123",
          type: factorType,
          friendlyName,
          totp: {
            secret: "CANARY_TOTP_SECRET_SUPER_SECRET",
            qr_code: "data:image/svg+xml;utf8,<svg>CANARY_QR</svg>",
          },
        },
        error: null,
      };
    };

    client.auth.mfa.challenge = async ({ factorId }) => {
      return {
        data: { id: "challenge_mock_456", factorId },
        error: null,
      };
    };

    client.auth.mfa.verify = async () => {
      return {
        data: { session: { aal: "aal2" } },
        error: null,
      };
    };

    client.auth.mfa.listFactors = async () => {
      return {
        data: { all: [{ id: "factor_mock_123", status: "verified" }] },
        error: null,
      };
    };
  }

  if (hasRecoveryCodes) {
    let consumed = false;
    client.auth.mfa.recoveryCodes = {
      generate: async () => {
        if (recoveryCodesError) {
          return { data: null, error: { message: recoveryCodesError } };
        }
        return {
          data: {
            recovery_codes: [
              "CANARY_RECOVERY_CODE_1",
              "CANARY_RECOVERY_CODE_2",
              "CANARY_RECOVERY_CODE_3",
            ],
          },
          error: null,
        };
      },
      getStatus: async () => {
        return {
          data: { total: 10, remaining: consumed ? 9 : 10 },
          error: null,
        };
      },
      verify: async ({ code }) => {
        if (consumed) {
          return { data: null, error: { message: "Code already used" } };
        }
        consumed = true;
        return {
          data: { session: { aal: "aal2" } },
          error: null,
        };
      },
    };
  }

  return client;
}

describe("T006: Capability Probe Unit Tests", () => {
  const probe = new CapabilityProbe();

  it("fails closed when configuration is missing or invalid", async () => {
    // null context
    const res1 = await probe.run(null);
    assert.equal(res1.status, PROBE_STATUS.BLOCKED);
    assert.equal(res1.errorCode, PROBE_ERROR_CODES.MISSING_CONFIGURATION);

    // empty config
    const res2 = await probe.run({ config: null });
    assert.equal(res2.status, PROBE_STATUS.BLOCKED);
    assert.equal(res2.errorCode, PROBE_ERROR_CODES.MISSING_CONFIGURATION);

    // invalid unsafe URL
    const res3 = await probe.run({
      config: { projectUrl: "javascript:alert(1)" },
      client: createMockClient(),
    });
    assert.equal(res3.status, PROBE_STATUS.BLOCKED);
    assert.equal(res3.errorCode, PROBE_ERROR_CODES.MISSING_CONFIGURATION);
  });

  it("refuses to treat SDK types or static documentation as runtime proof", async () => {
    // Static proof flag
    const res1 = await probe.run({
      config: { projectUrl: "https://auth.solodesk.test" },
      client: createMockClient(),
      isStaticProof: true,
    });
    assert.equal(res1.status, PROBE_STATUS.BLOCKED);
    assert.equal(res1.errorCode, PROBE_ERROR_CODES.STATIC_PROOF_REJECTED);

    // Documentation-only mock
    const docClient = createMockClient();
    docClient._isDocumentationOnly = true;
    const res2 = await probe.run({
      config: { projectUrl: "https://auth.solodesk.test" },
      client: docClient,
    });
    assert.equal(res2.status, PROBE_STATUS.BLOCKED);
    assert.equal(res2.errorCode, PROBE_ERROR_CODES.STATIC_PROOF_REJECTED);
  });

  it("reports UNSUPPORTED when TOTP is missing on client", async () => {
    const client = createMockClient({ hasTotp: false });
    const res = await probe.run({
      config: { projectUrl: "https://auth.solodesk.test" },
      client,
    });
    assert.equal(res.status, PROBE_STATUS.UNSUPPORTED);
    assert.equal(res.errorCode, PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY);
  });

  it("reports UNSUPPORTED when experimental recovery codes are absent", async () => {
    const client = createMockClient({ hasTotp: true, hasRecoveryCodes: false });
    const res = await probe.run({
      config: { projectUrl: "https://auth.solodesk.test" },
      client,
    });
    assert.equal(res.status, PROBE_STATUS.UNSUPPORTED);
    assert.equal(res.errorCode, PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY);
    assert.match(res.reason, /recovery codes/i);
  });

  it("reports AMBIGUOUS_OUTCOME when runtime encounters unexpected errors", async () => {
    const client = createMockClient({ throwError: true });
    const res = await probe.run({
      config: { projectUrl: "https://auth.solodesk.test" },
      client,
    });
    assert.equal(res.status, PROBE_STATUS.FAILED);
    assert.equal(res.errorCode, PROBE_ERROR_CODES.AMBIGUOUS_OUTCOME);
  });

  it("redacts all secrets, QR payloads, and recovery codes from observations", async () => {
    const rawData = {
      factorId: "factor_123",
      totp_secret: "SUPER_SECRET_CANARY_123",
      qr_code: "<svg>CANARY_QR</svg>",
      rawCodes: ["CODE_1", "CODE_2"],
      safeField: "safe_value",
      nested: {
        password: "secret_password",
        token: "eyJhbGciOi.eyJzdWIi.signature",
      },
    };

    const redacted = redactSecrets(rawData);
    assert.equal(redacted.safeField, "safe_value");
    assert.notEqual(redacted.totp_secret, "SUPER_SECRET_CANARY_123");
    assert.notEqual(redacted.qr_code, "<svg>CANARY_QR</svg>");
    assert.equal(typeof redacted.rawCodes, "string");
    assert.equal(redacted.nested.password, "[REDACTED_PASSWORD]");
    assert.equal(redacted.nested.token, "[REDACTED_JWT]");

    // Run full probe and verify no canary appears in serialized output
    const client = createMockClient({ hasTotp: true, hasRecoveryCodes: true });
    const res = await probe.run({
      config: { projectUrl: "https://auth.solodesk.test" },
      client,
    });
    assert.equal(res.status, PROBE_STATUS.READY);
    const serialized = JSON.stringify(res);
    assert.equal(serialized.includes("CANARY_TOTP_SECRET_SUPER_SECRET"), false);
    assert.equal(serialized.includes("CANARY_RECOVERY_CODE_1"), false);
    assert.equal(serialized.includes("CANARY_QR"), false);
  });

  it("captures exact pinned SDK version and environment metadata", () => {
    const metadata = getPinnedMetadata();
    assert.ok(metadata.sdkVersion, "sdkVersion must be present");
    assert.ok(metadata.nodeVersion, "nodeVersion must be present");
    assert.ok(metadata.platform, "platform must be present");
    assert.ok(metadata.timestamp, "timestamp must be present");
  });

  it("records AAL transitions, one-time consumption, and rate limit observations on success", async () => {
    const client = createMockClient({ hasTotp: true, hasRecoveryCodes: true });
    const res = await probe.run({
      config: {
        projectUrl: "https://auth.solodesk.test",
        attemptLimit: 5,
      },
      client,
    });

    assert.equal(res.status, PROBE_STATUS.READY);
    assert.equal(res.supported, true);
    assert.equal(res.observations.totp.enrolled, true);
    assert.equal(res.observations.recoveryCodes.generated, true);
    assert.equal(res.observations.recoveryCodes.oneTimeConsumed, true);
    assert.equal(res.observations.recoveryCodes.replayRejected, true);
    assert.equal(res.observations.aalTransitions.initial, "aal1");
    assert.equal(res.observations.aalTransitions.afterTotpVerification, "aal2");
    assert.equal(res.observations.rateLimit.threshold, 5);
    assert.equal(res.observations.rateLimit.boundaryObserved, true);
  });
});
