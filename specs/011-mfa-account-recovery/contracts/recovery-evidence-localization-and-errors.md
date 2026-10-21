# Recovery, Evidence, Localization and Error Contract

## Scope

Defines primary-credential recovery, neutral public behavior, cloud/local boundaries, redacted evidence/notifications, closed failures/actions, English/Arabic parity, and accessibility. Trace: FR-010–FR-028; A-09–A-25.

## Primary-credential recovery

When the configured primary method is a password, the separately hosted surface uses the provider's PKCE password-recovery flow and approved redirect allowlist. For a passwordless method, it uses only the Q-08-approved provider equivalent; it does not invent a password or collect primary credentials inside Electron.

The public request result is the same approved neutral message for existing, absent, disabled, rate-limited, and ineligible accounts within the approved observable/timing tolerance. It does not promise delivery. Provider recovery artifacts are time-bounded/one-use under the proven configuration and never enter native callbacks, logs, evidence, analytics, or support data.

Production recovery remains disabled until sender/domain/redirect setup, rate/abuse limits, delivery monitoring, region/cost, and support readiness are verified. Built-in test SMTP behavior is not production readiness.

## Lost-factor recovery

The baseline recovery route is provider-native recovery-code verification on the hosted surface. Successful code use must yield sufficient current provider authority before factor reset/re-enrollment. Invalid, used, wrong-account, changed, expired, rate-limited, unsupported, or concurrently superseded input changes no SoloDesk authority.

If all factors/codes are lost, only an approved configured primary recovery or manual escalation procedure may proceed. Existing local session possession alone never silently disables a factor. No support/admin bypass exists under this plan.

## Cloud identity versus local data

Successful provider recovery establishes only a verified cloud session subject to current policy. On return, SoloDesk independently evaluates:

- provider session/AAL and account-security generation;
- current workspace membership/grants and device approval;
- local protected profile/account binding and key availability;
- offline lease and pending-work rules owned by later features; and
- cloud data available to the currently authorized identity.

An unavailable local key yields `local_unlock_required` or `local_recovery_required`. The app preserves unreadable encrypted bytes and states that unsynchronized local-only work was not recovered. It never replaces, relabels, deletes, uploads, transfers, or assigns that data to the recovered/new account. Ending a remote session never claims remote deletion of downloaded data.

## Evidence allowlist

Append-only identity security evidence may contain only:

- closed event type, purpose, lifecycle/outcome, certainty, and safe reason code;
- operation/correlation/diagnostic references;
- safe account/factor/profile/device references only where already approved and access-controlled;
- policy/capability version and security generation;
- authoritative and local observation instants; and
- closed session/local-data consequence plus named next action.

User notifications identify the type/time of change and a safe review/recovery action. They do not include enough detail to authenticate, undo, or enumerate an account.

Never record or serialize passwords, factor seeds/QR payloads, TOTP/challenge values, recovery codes or derived digests, tokens/cookies, provider recovery artifacts, raw claims/responses/errors, URLs with query/fragment, public recovery identifiers, IP/network data, keys, paths, customer/cache/workspace content, unrestricted metadata, or provider text.

Unknown data is dropped by a closed projector or causes projection failure; it is not captured with generic JSON/stringification. Logs, analytics, crashes, exports, support bundles, fixtures, screenshots, videos, and CI artifacts obey the same prohibition.

## Closed failure families and actions

Safe failure families include:

- `online_required`
- `provider_unavailable`
- `capability_unavailable`
- `sign_in_required`
- `reauthentication_required`
- `proof_invalid`
- `proof_expired`
- `proof_replayed`
- `rate_limited`
- `operation_stale`
- `account_mismatch`
- `policy_changed`
- `recovery_codes_pending`
- `recovery_exhausted`
- `outcome_unknown`
- `protection_unavailable`
- `local_recovery_required`
- `upgrade_required`
- `support_required`

Named actions are limited to `retry`, `retry_after`, `cancel`, `sign_in_again`, `reauthenticate`, `use_recovery_code`, `start_primary_recovery`, `save_and_acknowledge_codes`, `regenerate_codes`, `resume_factor_setup`, `reconcile`, `unlock_local_protection`, `upgrade`, and `contact_approved_support`.

Every state gives one specific safe next step or an honest terminal limitation. Provider error text/stacks are not shown. Public errors do not distinguish account existence, factor count, recovery eligibility, or another local profile.

## Abuse and timing

Provider-owned enrollment/challenge/recovery endpoints use the exact tested provider rate/abuse controls. SoloDesk does not add a second recovery-code rate store because it never verifies codes. Its low-frequency authenticated operation API uses existing gateway bounds, request idempotency, body limits, and safe backoff.

Tests cover approved threshold, threshold+1, concurrency, restart, expiry, and recovery availability. Account-enumeration review compares status, wording, redirects, response shape, timing tolerance, and externally visible delivery claims. Missing approved limits block release rather than defaulting to unlimited.

## English/Arabic parity and bidi safety

Every hosted/native heading, instruction, warning, state, error, session consequence, local-data limitation, action, notification, and support route shares one typed localization key and parameter schema in English and Arabic. Missing/extra keys or parameters fail verification. Raw provider text is replaced with a localized safe summary.

Codes, emails, diagnostic references, times, versions, device labels, and provider-safe identifiers use semantic LTR isolation (`bdi`/equivalent) inside RTL content without changing the underlying value. Trimming or display grouping may occur only where the proven provider contract allows it; normalization never changes meaningful code characters.

Recovery-code and TOTP entry is one logical accessible input with paste support, an explicit label/instruction, and normal editing semantics. Visual grouping must not create fragmented tab stops or screen-reader order. Code display offers an accessible copy/download/print path only while plaintext is legitimately present on the hosted page; saved artifacts and their risk are explained without telemetry.

## Accessibility behavior

- All flows work by keyboard with visible focus and no pointer/hover/drag dependency.
- Browser launch moves native focus to a waiting/cancel region and announces the context switch.
- Challenge, error, expiry, rate limit, reconciliation, success, and session-consequence changes use an appropriate status/live region without reading secrets aloud.
- Return/cancel restores focus to the result heading, first safe action, or initiating control predictably.
- Status and factor requirement are conveyed by text/semantics, not color alone.
- Dialogs trap/restore focus correctly; destructive/security consequences are named before confirmation.
- English and Arabic remain usable at 200% zoom/reflow, logical RTL layout, high contrast, and reduced motion.

Automation covers keys, direction, semantics, focus paths, zoom layout, and secret absence. It supplements—not replaces—fluent Arabic review, native screen-reader/keyboard observation, and recovery-comprehension evidence on declared targets.

## Session consequence wording

Every successful recovery or security change explicitly states:

1. whether the current session continues and at what safe status;
2. whether other sessions ended, remain, or need reauthentication, using observed provider behavior;
3. whether this device's local protected data is accessible, retained encrypted, or requires separate recovery;
4. that workspace membership/permissions will be revalidated; and
5. the exact next action.

Wording must not imply that authentication recovery restored an encryption key, that sign-out erased another device, or that prior membership/offline authority returned.
