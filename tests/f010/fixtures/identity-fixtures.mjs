import crypto from "node:crypto";

// Test-only device vault shared by recreated owners; production uses Electron safeStorage.
const testVaultKey = crypto.randomBytes(32);
export const TEST_SECRET_PROTECTION = Object.freeze({
  assertAvailable() {},
  sealSecret(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", testVaultKey, iv);
    const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]);
  },
  openSecret(value) {
    const decipher = crypto.createDecipheriv("aes-256-gcm", testVaultKey, value.subarray(0, 12));
    decipher.setAuthTag(value.subarray(12, 28));
    return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString("utf8");
  },
});

export const ISSUER = "https://auth.solodesk.test";
export const AUDIENCE = "solodesk-desktop";
export const HOSTED_ORIGIN = "https://auth.solodesk.test";
export const CALLBACK_URL_LOOPBACK = "http://127.0.0.1:42042/auth/callback";
export const CALLBACK_URL_CUSTOM_SCHEME = "solodesk://auth/callback";

export const PROHIBITED_SECRET_MARKERS = Object.freeze({
  rawPassword: "FIXTURE_SECRET_RAW_PASSWORD_DO_NOT_LEAK_XYZ123",
  rawToken: "FIXTURE_SECRET_BEARER_TOKEN_DO_NOT_LEAK_JWT456",
  rawRefreshToken: "FIXTURE_SECRET_REFRESH_TOKEN_DO_NOT_LEAK_RT789",
  rawVerifier: "FIXTURE_SECRET_PKCE_VERIFIER_DO_NOT_LEAK_VERIFIER000",
  rawState: "FIXTURE_SECRET_RAW_STATE_DO_NOT_LEAK_STATE111",
  rawNonce: "FIXTURE_SECRET_RAW_NONCE_DO_NOT_LEAK_NONCE222",
  serviceRoleKey: "FIXTURE_SECRET_SERVICE_ROLE_DO_NOT_LEAK_SUPABASE_KEY_333",
  rawCookie: "FIXTURE_SECRET_AUTH_COOKIE_DO_NOT_LEAK_COOKIE444",
  profilePath: "/Users/secret_user/.solodesk/profiles/confidential_path",
});

export const ACCOUNT_A = Object.freeze({
  issuer_id: ISSUER,
  subject_id: "usr_a_11111111-1111-4111-8111-111111111111",
  displayName: "Alice Freelancer",
  displayIdentifier: "a***@example.com",
  avatarUrl: "https://lh3.googleusercontent.com/a/test-avatar",
});

export const ACCOUNT_B = Object.freeze({
  issuer_id: ISSUER,
  subject_id: "usr_b_22222222-2222-4222-8222-222222222222",
  displayName: "Bob Contractor",
  displayIdentifier: "b***@example.com",
});

export const PROFILE_A = Object.freeze({
  profile_id: "prof_a_00000000-0000-4000-8000-000000000001",
  issuer_id: ACCOUNT_A.issuer_id,
  subject_id: ACCOUNT_A.subject_id,
  protection_binding_id: "prot_bind_001",
  profile_generation: 1,
  compatibility_version: 1,
  lifecycle: "enrolled",
  last_transition_at: "2026-10-20T12:00:00.000Z",
  retained_work_status: "none",
});

export const PROFILE_B = Object.freeze({
  profile_id: "prof_b_00000000-0000-4000-8000-000000000002",
  issuer_id: ACCOUNT_B.issuer_id,
  subject_id: ACCOUNT_B.subject_id,
  protection_binding_id: "prot_bind_002",
  profile_generation: 1,
  compatibility_version: 1,
  lifecycle: "enrolled",
  last_transition_at: "2026-10-20T12:05:00.000Z",
  retained_work_status: "none",
});

export function generatePkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function createAttemptFixture(overrides = {}) {
  const pkce = generatePkcePair();
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const stateDigest = crypto.createHash("sha256").update(state).digest("hex");
  const nonceDigest = crypto.createHash("sha256").update(nonce).digest("hex");

  const now = Date.now();
  return {
    attempt_id: crypto.randomUUID(),
    profile_id: PROFILE_A.profile_id,
    profile_generation: 1,
    protocol_version: 1,
    identity_method: "authorization_code",
    issuer_id: ISSUER,
    application_audience: AUDIENCE,
    state_digest: stateDigest,
    nonce_digest: nonceDigest,
    challenge_method: "S256",
    challenge_reference: pkce.challenge,
    return_destination_id: "desktop_loopback_v1",
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + 300000).toISOString(),
    status: "pending",
    raw_proof: {
      verifier: pkce.verifier,
      state,
      nonce,
    },
    ...overrides,
  };
}

export function createExpiredAttemptFixture() {
  const past = Date.now() - 600000;
  return createAttemptFixture({
    created_at: new Date(past - 300000).toISOString(),
    expires_at: new Date(past).toISOString(),
    status: "expired",
  });
}

export function createSupersededAttemptFixture() {
  return createAttemptFixture({
    status: "superseded",
  });
}

export const LABELS = Object.freeze({
  enStandard: "Alice's MacBook Pro",
  enLong: "Primary Development Workstation Running Linux On Enterprise Core 64",
  arStandard: "حاسوب العمل الرئيسي",
  arLong: "جهاز الحاسوب المحمول المخصص لإدارة الفواتير والمهام اليومية الكاملة",
  bidiMixed1: "جهاز Alice للمكتب 01",
  bidiMixed2: "MacBook Pro - محطة العمل 2",
  withEmoji: "💻 MacBook Pro (أليس)",
  maxAllowed64: "A".repeat(64),
  overflow65: "A".repeat(65),
  withControlChar: "Bad\u0000Device\u001FLabel",
});
