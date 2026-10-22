export const FIXTURE_ACCOUNTS = Object.freeze({
  accountA: {
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    email: "alice@test.local",
  },
  accountB: {
    issuerId: "https://auth.solodesk.test",
    subjectId: "b0000000-0000-4000-8000-000000000002",
    email: "bob@test.local",
  },
});

export const FIXTURE_DEVICES = Object.freeze({
  deviceA1: "d0000000-0000-4000-8000-000000000001",
  deviceB1: "d0000000-0000-4000-8000-000000000002",
});

export const FIXTURE_WORKSPACES = Object.freeze({
  ws1: {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    displayName: "Acme Studio",
    discriminator: "1111",
    role: "owner",
    membershipStatus: "active",
    workspaceStatus: "active",
    readinessState: "setup_incomplete",
    defaultTimezone: "UTC",
    defaultCurrency: "USD",
    defaultLocale: "en",
    profileVersion: 1,
    authorityVersion: 1,
    checkedAt: "2026-10-21T12:00:00.000Z",
  },
  ws2DuplicateName: {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    displayName: "Acme Studio",
    discriminator: "2222",
    role: "owner",
    membershipStatus: "active",
    workspaceStatus: "active",
    readinessState: "setup_incomplete",
    defaultTimezone: "UTC",
    defaultCurrency: "EUR",
    defaultLocale: "en",
    profileVersion: 1,
    authorityVersion: 1,
    checkedAt: "2026-10-21T12:00:00.000Z",
  },
  ws3Arabic: {
    workspaceId: "33333333-3333-4333-8333-333333333333",
    displayName: "ورشة الإبداع",
    discriminator: "3333",
    role: "owner",
    membershipStatus: "active",
    workspaceStatus: "active",
    readinessState: "setup_incomplete",
    defaultTimezone: "Asia/Riyadh",
    defaultCurrency: "SAR",
    defaultLocale: "ar",
    profileVersion: 1,
    authorityVersion: 1,
    checkedAt: "2026-10-21T12:00:00.000Z",
  },
  ws4MixedBidi: {
    workspaceId: "44444444-4444-4444-8444-444444444444",
    displayName: "SoloDesk ✨ حلول المكتب",
    discriminator: "4444",
    role: "owner",
    membershipStatus: "active",
    workspaceStatus: "active",
    readinessState: "setup_incomplete",
    defaultTimezone: "Africa/Cairo",
    defaultCurrency: "EGP",
    defaultLocale: "ar",
    profileVersion: 1,
    authorityVersion: 1,
    checkedAt: "2026-10-21T12:00:00.000Z",
  },
});

export const FIXTURE_POLICIES = Object.freeze({
  synthetic: {
    version: "f012_v1_synthetic",
    enabled: true,
    locales: ["en", "ar"],
    currencyCodes: ["XTS", "USD", "EUR", "GBP", "EGP", "SAR", "AED"],
    timezoneCatalogue: "UTC",
    requiredProfileFields: ["display_name"],
    boundsProfile: {
      maxDisplayNameScalars: 120,
      maxLegalNameScalars: 200,
      maxTradeNameScalars: 120,
    },
  },
  disabled: {
    version: "f012_v1_disabled",
    enabled: false,
    locales: ["en", "ar"],
    currencyCodes: [],
    timezoneCatalogue: "UTC",
    requiredProfileFields: ["display_name"],
    boundsProfile: {
      maxDisplayNameScalars: 120,
      maxLegalNameScalars: 200,
      maxTradeNameScalars: 120,
    },
  },
});

export const CANARIES = Object.freeze({
  AUTH_TOKEN: "solodesk_secret_token_CANARY_TEST_123",
  DATABASE_KEY: "solodesk_sqlite_key_CANARY_456",
  RAW_ERROR: "INTERNAL_DB_ERROR_CANARY_789",
  HIDDEN_TENANT: "hidden_tenant_CANARY_999",
  FILE_PATH: "/secret/userData/identities/profile-a/credentials.v1.enc",
});
