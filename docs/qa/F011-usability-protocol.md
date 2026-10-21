# F011 MFA & Account Recovery Usability and Comprehension Protocol

## Objective

Validate success criteria SC-009, SC-010, and SC-011 for feature F011:

- **SC-009**: Participants complete factor enrollment and recovery-code acknowledgment within target duration (<= 180 seconds) without secret leakage.
- **SC-010**: Participants understand that cloud recovery restores identity access, while local workspace data remains protected by the device key.
- **SC-011**: Bilingual parity: 50% English, 50% Arabic native speakers, with equal comprehension and zero untranslated technical jargon.

## Target Participant Profile

- **Split**: 12 participants total (6 English primary, 6 Arabic primary).
- **Inclusions**: Freelancers and solo business owners using desktop applications.
- **Exclusions**: Core SoloDesk engineers or individuals with prior knowledge of F011 internals.
- **Target OS Matrix**: Linux (Ubuntu 24.04), macOS 14+, Windows 11.

## Protocol Journeys

### Journey 1: TOTP Factor Enrollment & One-Time Recovery Codes

1. Participant initiates factor setup from Account Security.
2. Participant is informed of secure browser window launch.
3. Participant completes enrollment and observes recovery codes.
4. Participant acknowledges recovery code preservation.
5. Participant returns to native desktop app and observes `ready` state.

- **Success Measure**: Completion time <= 180 seconds; participant accurately recognizes codes are shown once.

### Journey 2: Factor Challenge & Rate-Limiting Reaction

1. Participant encounters MFA challenge upon sign-in.
2. Participant simulates entering invalid codes to reach rate-limit boundary.
3. Participant is presented with neutral error and account recovery route.

- **Success Measure**: Participant successfully locates the recovery action without confusion.

### Journey 3: Cloud Account Recovery & Local Data Boundary Comprehension

1. Participant simulates losing authenticator app and uses recovery code.
2. Cloud identity is successfully verified.
3. Prompt explains that local encrypted database files require device unlock key.
4. Participant completes comprehension questionnaire.

- **Success Measure**: 100% of participants correctly answer that recovering the cloud account does not magically decrypt local files without device unlock.

## Privacy-Safe Evidence Recording Template

```json
{
  "protocol_version": "f011-v1",
  "participant_id": "P-01",
  "locale": "ar",
  "target_os": "linux",
  "journey": "enrollment",
  "completion_time_seconds": 112,
  "comprehension_score_pct": 100,
  "leaked_secrets_observed": 0,
  "outcome": "passed",
  "notes": "Arabic RTL layout and bidi text rendered with natural alignment"
}
```

## Governance

This protocol is executed prior to production feature enablement. Results must be committed to `docs/qa/F011.md`.
