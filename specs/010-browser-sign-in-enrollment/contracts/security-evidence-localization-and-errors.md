# Security Evidence, Localization and Error Contract

## Scope

Defines bounded evidence, abuse behavior, safe failures, and English/Arabic accessible presentation. Trace: FR-001, FR-022–FR-024; A-03, A-06, A-09, A-11, A-12, A-20–A-22.

## Evidence allowlist

Security-significant terminal events use a versioned closed `event_type`, `outcome`, `safe_reason_code`, diagnostic/correlation ID, optional safe attempt/intent/profile/device/account reference, authoritative instant where available, and local observation instant. They are append-only where server-authoritative and follow the F009 redacted-projector discipline.

Never record passwords, codes, tokens, PKCE verifier/challenge bytes, raw state/nonce, cookies, callback/provider payloads, unrestricted errors, URLs with query/fragment, keys, paths, cache/customer content, full display identifier, or secret-derived hashes useful for replay. Unknown fields do not fall back to generic serialization; projection fails or uses an approved minimal event.

## Closed outcomes and next actions

At minimum the safe error families distinguish: `network_unavailable`, `provider_unavailable`, `cancelled`, `attempt_expired`, `invalid_return`, `sign_in_required`, `account_mismatch`, `protection_unavailable`, `enrollment_rejected`, `outcome_unknown`, `upgrade_required`, and `recovery_required`.

Each maps to one or more named actions: `retry`, `cancel`, `unlock_protection`, `sign_in_again`, `choose_isolated_profile`, `reconcile`, `upgrade`, or `contact_support`. Errors carry F003-compatible code/message key/diagnostic/recovery/certainty; provider text and stack traces are not shown. No response confirms whether an unrelated account/profile/device exists.

## Bounds and abuse controls

Attempt start, callback admission, exchange, enrollment, reconciliation, and diagnostic lookup have versioned field/byte/lifetime/concurrency/rate limits. Rate-limit responses use bounded backoff/retry-after where safe and never include identity existence. Limits must be chosen with the selected provider/security owner and tested at boundary, boundary+1, concurrency, and restart; missing limits block deployment.

## English/Arabic parity

Every state, error, action, warning, hosted instruction, and recovery explanation has the same typed localization key and parameter schema in English and Arabic. Missing keys fail verification. Provider-controlled untranslated text is not copied; SoloDesk gives a localized safe summary and named recovery action.

Email-like identifiers, device labels, diagnostic IDs, versions, and URLs use bidi isolation (`bdi`/equivalent) without changing stored values. Layout uses logical properties and remains usable at supported zoom/reflow.

## Accessibility behavior

- Starting sign-in moves focus to the native waiting/cancel region before opening the browser and states that another window opened.
- Return, cancellation, expiry, enrollment, failure, and retry changes announce through a polite/assertive live region appropriate to urgency; announcements do not expose secret detail.
- Focus returns to the state heading or first safe recovery action after browser return and to the initiating control after cancellation.
- Every action is keyboard reachable with visible focus and no pointer-only/drag/hover dependency.
- Status is conveyed by text/semantics, not color alone; reduced-motion is respected.

Automated parity/a11y tests supplement, but do not replace, fluent Arabic and native screen-reader/keyboard review on the declared targets.
