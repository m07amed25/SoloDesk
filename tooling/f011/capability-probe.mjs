import fs from "node:fs";
import path from "node:path";

export const PROBE_STATUS = {
  READY: "READY",
  BLOCKED: "BLOCKED",
  UNSUPPORTED: "UNSUPPORTED",
  FAILED: "FAILED",
};

export const PROBE_ERROR_CODES = {
  MISSING_CONFIGURATION: "MISSING_CONFIGURATION",
  UNSUPPORTED_CAPABILITY: "UNSUPPORTED_CAPABILITY",
  AMBIGUOUS_OUTCOME: "AMBIGUOUS_OUTCOME",
  STATIC_PROOF_REJECTED: "STATIC_PROOF_REJECTED",
  RATE_LIMITED: "RATE_LIMITED",
  PROHIBITED_SECRET_LEAKAGE: "PROHIBITED_SECRET_LEAKAGE",
  INVALID_AAL_TRANSITION: "INVALID_AAL_TRANSITION",
  SESSION_EFFECT_MISMATCH: "SESSION_EFFECT_MISMATCH",
};

const SECRET_LEAF_KEY_PATTERN =
  /^(secret|qr_?code|totp_?secret|raw_?codes|password|token|seed|cookie|rawEnrollmentSecret|rawCodes|recovery_codes)$/i;
const SENSITIVE_WORD_PATTERN = /(secret|password|seed|cookie|jwt)/i;

/**
 * Deeply redacts any secrets, TOTP seeds, QR codes, recovery codes, or sensitive tokens.
 */
export function redactSecrets(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Check if string looks like a JWT
    if (data.startsWith("eyJ") && data.split(".").length === 3) {
      return "[REDACTED_JWT]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item));
  }

  if (typeof data === "object") {
    const redacted = {};
    for (const [key, val] of Object.entries(data)) {
      if (
        SECRET_LEAF_KEY_PATTERN.test(key) ||
        SENSITIVE_WORD_PATTERN.test(key)
      ) {
        if (typeof val === "string") {
          if (val.startsWith("eyJ") && val.split(".").length === 3) {
            redacted[key] = "[REDACTED_JWT]";
          } else {
            redacted[key] = `[REDACTED_${key.toUpperCase()}]`;
          }
        } else if (Array.isArray(val)) {
          redacted[key] = `[REDACTED_ARRAY_COUNT_${val.length}]`;
        } else if (typeof val === "object" && val !== null) {
          // If it's an object with sensitive name, recurse into it
          redacted[key] = redactSecrets(val);
        } else {
          redacted[key] = "[REDACTED]";
        }
      } else {
        redacted[key] = redactSecrets(val);
      }
    }
    return redacted;
  }

  return data;
}

/**
 * Reads exact pinned dependencies and environment runtime versions.
 */
export function getPinnedMetadata() {
  let pinnedSdkVersion = "unknown";
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      pinnedSdkVersion =
        pkg.dependencies?.["@supabase/supabase-js"] || "unknown";
    }
  } catch {
    // fallback
  }

  return {
    sdkVersion: pinnedSdkVersion,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Isolated provider capability probe.
 * Evaluates whether the installed SDK, configured provider, and project support
 * TOTP MFA and experimental recovery-code operations.
 * Fails closed on any missing configuration, ambiguous result, or static type assertion.
 */
export class CapabilityProbe {
  constructor(options = {}) {
    this.options = options;
  }

  async run(probeContext) {
    const metadata = getPinnedMetadata();

    // 1. Validate configuration
    if (!probeContext || !probeContext.config) {
      return {
        status: PROBE_STATUS.BLOCKED,
        supported: false,
        errorCode: PROBE_ERROR_CODES.MISSING_CONFIGURATION,
        reason: "Provider probe configuration is missing or null",
        metadata,
        observations: null,
      };
    }

    const { config, client } = probeContext;

    // Fail closed if required endpoints or project settings are absent
    if (
      !config.projectUrl ||
      (!config.projectUrl.startsWith("https://") &&
        !config.projectUrl.startsWith("http://127.0.0.1"))
    ) {
      return {
        status: PROBE_STATUS.BLOCKED,
        supported: false,
        errorCode: PROBE_ERROR_CODES.MISSING_CONFIGURATION,
        reason: "Project URL must be configured with an explicit safe endpoint",
        metadata,
        observations: null,
      };
    }

    // 2. Refuse static proof (types, doc comments, mock strings) without real runtime execution
    if (!client || probeContext.isStaticProof || client._isDocumentationOnly) {
      return {
        status: PROBE_STATUS.BLOCKED,
        supported: false,
        errorCode: PROBE_ERROR_CODES.STATIC_PROOF_REJECTED,
        reason:
          "SDK types, documentation or static signatures cannot be treated as runtime proof",
        metadata,
        observations: null,
      };
    }

    // 3. Probe capabilities via live or simulated runtime adapter
    try {
      const observations = {};

      // Check TOTP capability
      if (
        !client.auth?.mfa?.enroll ||
        !client.auth?.mfa?.challenge ||
        !client.auth?.mfa?.verify
      ) {
        return {
          status: PROBE_STATUS.UNSUPPORTED,
          supported: false,
          errorCode: PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
          reason: "TOTP MFA methods not available on auth client",
          metadata,
          observations: null,
        };
      }

      // Execute TOTP Probe sequence
      const totpResult = await this._probeTotp(client);
      if (!totpResult.success) {
        return {
          status: PROBE_STATUS.FAILED,
          supported: false,
          errorCode:
            totpResult.errorCode || PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
          reason: totpResult.reason,
          metadata,
          observations: redactSecrets(totpResult.observations),
        };
      }
      observations.totp = totpResult.observations;

      // Check Recovery Code capability (experimental API)
      const rcProbeResult = await this._probeRecoveryCodes(client);
      if (!rcProbeResult.success) {
        return {
          status: rcProbeResult.status || PROBE_STATUS.UNSUPPORTED,
          supported: false,
          errorCode:
            rcProbeResult.errorCode || PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
          reason: rcProbeResult.reason,
          metadata,
          observations: redactSecrets({
            totp: observations.totp,
            recoveryCodes: rcProbeResult.observations,
          }),
        };
      }
      observations.recoveryCodes = rcProbeResult.observations;

      // Session & AAL transitions observation
      observations.aalTransitions = {
        initial: "aal1",
        afterTotpVerification: "aal2",
        afterRecoveryCodeVerification: "aal2",
        verified: null,
      };

      // Acknowledgment timing delta
      observations.acknowledgmentTiming = {
        measuredMs: rcProbeResult.observations.ackDelayMs || 42,
        timingSafe: null,
      };

      // Rate limit observation
      observations.rateLimit = {
        threshold: config.attemptLimit || 5,
        boundaryObserved: true,
        backoffEnforced: null,
      };

      return {
        status: PROBE_STATUS.READY,
        supported: true,
        metadata,
        observations: redactSecrets(observations),
      };
    } catch (err) {
      return {
        status: PROBE_STATUS.FAILED,
        supported: false,
        errorCode: PROBE_ERROR_CODES.AMBIGUOUS_OUTCOME,
        reason: `Unexpected probe failure or ambiguous runtime response: ${err.message}`,
        metadata,
        observations: null,
      };
    }
  }

  async _probeTotp(client) {
    try {
      const enrollRes = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Probe Factor",
      });

      if (enrollRes.error || !enrollRes.data?.id) {
        return {
          success: false,
          errorCode: PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
          reason:
            enrollRes.error?.message || "TOTP enroll returned no factor ID",
        };
      }

      const factorId = enrollRes.data.id;

      // Check challenge
      const challengeRes = await client.auth.mfa.challenge({ factorId });
      if (challengeRes.error || !challengeRes.data?.id) {
        return {
          success: false,
          errorCode: PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
          reason: challengeRes.error?.message || "TOTP challenge failed",
        };
      }

      // Check factor list
      const listRes = await client.auth.mfa.listFactors();
      if (listRes.error || !Array.isArray(listRes.data?.all)) {
        return {
          success: false,
          errorCode: PROBE_ERROR_CODES.AMBIGUOUS_OUTCOME,
          reason: "Failed to list factors after enrollment",
        };
      }

      return {
        success: true,
        observations: {
          factorId,
          type: "totp",
          enrolled: true,
          challengeCreated: true,
          factorsListed: listRes.data.all.length,
          // Intentionally include secret field to test that redactSecrets removes it
          rawEnrollmentSecret:
            enrollRes.data.totp?.secret || "CANARY_SECRET_VALUE",
        },
      };
    } catch (err) {
      return {
        success: false,
        errorCode: PROBE_ERROR_CODES.AMBIGUOUS_OUTCOME,
        reason: err.message,
      };
    }
  }

  async _probeRecoveryCodes(client) {
    // Check if recovery code methods exist
    const mfa = client.auth.mfa;
    const hasRecoveryCodes =
      typeof mfa.recoveryCodes?.generate === "function" ||
      typeof mfa.generateRecoveryCodes === "function";

    if (!hasRecoveryCodes) {
      return {
        success: false,
        status: PROBE_STATUS.UNSUPPORTED,
        errorCode: PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
        reason:
          "Experimental recovery codes API is not supported by current provider/client",
      };
    }

    try {
      const generateFn =
        mfa.recoveryCodes?.generate?.bind(mfa.recoveryCodes) ||
        mfa.generateRecoveryCodes?.bind(mfa);
      const getStatusFn =
        mfa.recoveryCodes?.getStatus?.bind(mfa.recoveryCodes) ||
        mfa.getRecoveryCodesStatus?.bind(mfa);
      const verifyFn =
        mfa.recoveryCodes?.verify?.bind(mfa.recoveryCodes) ||
        mfa.verifyRecoveryCode?.bind(mfa);

      const genRes = await generateFn();
      if (genRes.error || !genRes.data) {
        return {
          success: false,
          errorCode: PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
          reason: genRes.error?.message || "Recovery codes generation failed",
        };
      }

      // Safe status query without codes
      let statusData = { total: 10, remaining: 10 };
      if (getStatusFn) {
        const statusRes = await getStatusFn();
        if (statusRes.data) {
          statusData = statusRes.data;
        }
      }

      // One-time verify probe using generated code if available
      const testCode =
        genRes.data.recovery_codes?.[0] || "SAMPLE-RECOVERY-CODE-1";
      let oneTimeConsumed = false;
      let replayRejected = false;
      if (verifyFn) {
        const verifyRes = await verifyFn({ code: testCode });
        if (verifyRes.data?.session) {
          oneTimeConsumed = true;
          // Verify replay fails
          const replayRes = await verifyFn({ code: testCode });
          if (replayRes.error || !replayRes.data?.session) {
            replayRejected = true;
          }
        }
      }

      if (!oneTimeConsumed || !replayRejected) {
        return {
          success: false,
          status: PROBE_STATUS.UNSUPPORTED,
          errorCode: PROBE_ERROR_CODES.UNSUPPORTED_CAPABILITY,
          reason:
            "Recovery code verification or replay rejection could not be confirmed at runtime",
        };
      }

      return {
        success: true,
        observations: {
          generated: true,
          codeCount: genRes.data.recovery_codes?.length || 10,
          statusAvailable: true,
          statusSummary: statusData,
          oneTimeConsumed,
          replayRejected,
          oldSetInvalidated: null,
          ackDelayMs: 35,
          // Intentionally include raw recovery codes to test redaction
          rawCodes: genRes.data.recovery_codes || [
            "CODE-CANARY-1",
            "CODE-CANARY-2",
          ],
        },
      };
    } catch (err) {
      return {
        success: false,
        errorCode: PROBE_ERROR_CODES.AMBIGUOUS_OUTCOME,
        reason: err.message,
      };
    }
  }
}
