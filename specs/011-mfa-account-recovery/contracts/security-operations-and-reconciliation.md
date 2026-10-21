# Security Operations and Reconciliation Contract

## Scope

Defines SoloDesk's purpose-bound account-security operations, idempotency, provider-first partial effects, generation fencing, and restart/retry behavior. Trace: FR-002–FR-008, FR-015–FR-018, FR-022–FR-024; A-02–A-08, A-15, A-17–A-22.

## Service surface

Reuse the existing command-gateway deployment with four closed identity-security messages:

- `identity.security.getState`
- `identity.security.begin`
- `identity.security.observe`
- `identity.security.acknowledgeRecoveryCodes`

`begin` accepts only protocol version, operation ID, closed purpose, expected security generation, policy version, request/correlation ID, and canonical request digest. `observe` and acknowledgment reuse the same identity and add no raw provider fields. The service derives the account, live session, AAL, and provider projection.

There is no arbitrary action name, URL, provider payload, account ID, factor proof, recovery code, password, token, role, workspace, or session ID in caller input. Unknown keys and unsupported versions fail validation.

## Admission

The gateway must:

1. authenticate the configured issuer/audience and derive `(issuer_id, subject_id, session_id)`;
2. prove the session is currently live for that account;
3. load the approved policy and current `AccountSecurityState` under a short transaction;
4. validate purpose, required AAL/recent proof, operation expiry, expected generation, and canonical digest;
5. create or return the one matching operation; and
6. return only a safe lifecycle, diagnostic reference, and next action.

An identical retry returns the prior operation. Reuse with changed account, purpose, generation, policy, or digest is rejected. A stale generation never refreshes itself from caller input.

## Provider call and observation

Provider calls occur on the hosted identity surface, outside the database transaction. The hosted result is an inert signal to reconcile, not proof of success.

For `observe`, the trusted service/provider boundary independently reads the current live session, AAL, factor summary, and recovery-code aggregate status. It then makes one of these determinations:

- `observed_applied`: exact expected provider effect is present for the operation/account;
- `observed_not_applied`: provider state proves the effect did not occur and safe retry/cancel is allowed;
- `unknown`: the provider cannot prove either result; retain and reconcile later; or
- `rejected`: account/session/purpose/generation/policy is invalid or stale.

Raw provider output is never stored. The accepted projection and request digest are revalidated inside the commit transaction.

## Commit transaction

One short PostgreSQL transaction:

1. locks the operation and current account-security row;
2. revalidates account, status, expiry, expected generation, policy version, and request digest;
3. verifies the independently observed provider effect is sufficient for the exact purpose;
4. changes the operation once;
5. changes readiness and increments `security_generation` once when the purpose is security-changing;
6. appends redacted immutable evidence and the actual safe session consequence; and
7. commits together.

External provider calls, browser waits, delivery waits, and user interaction never occur while locks are held.

## Purpose outcomes

| Purpose                                    | Sufficient observed result                                                                             | SoloDesk effect                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `factor_enroll`                            | expected TOTP factor verified at provider                                                              | increment generation once; set `recovery_codes_pending`; do not mark ready                                     |
| `recovery_codes_acknowledge`               | compatible provider set exists and matching pending setup/current generation is current                | set `ready`; do not increment again                                                                            |
| `mfa_challenge`                            | sufficient AAL for the same attempt/purpose                                                            | authorize only the originating attempt; no reusable grant                                                      |
| `recovery_codes_regenerate`                | provider reports a new current set after current `aal2`                                                | increment generation once; set `ack_pending`; prior set considered replaced; reconcile before another rotation |
| `lost_factor_recover`                      | provider recovery verification produced current `aal2`, followed by approved reset/re-enrollment state | `factor_reset_required` or next reconciled setup state; increment once                                         |
| `primary_credential_recover`               | provider recovery completed for same account/current intent                                            | apply configured session consequence and required factor state; increment once                                 |
| factor/credential/recovery identity change | exact provider effect plus sufficient fresh proof                                                      | commit corresponding state and consequence; increment once                                                     |

## Recovery-code acknowledgment

Acknowledgment records only that the current authenticated user deliberately confirmed saving the just-issued provider set. It is not evidence that a specific plaintext code was copied or stored, and it contains no code-derived data.

Acknowledgment must match one current operation/account/security generation and provider recovery status. A stale, duplicate, cross-account, or post-rotation acknowledgment has no effect. If the provider response was lost, the operation remains `reconcile_required`; codes are not redisplayed, and a later deliberate regeneration requires fresh `aal2` proof.

## Unknown outcome and retry

- Keep the original operation ID, expected generation, and protected local handoff.
- Do not start a replacement mutually exclusive operation while provider effect is unknown.
- Re-read provider state and server state; never replay a secret proof value from local storage.
- If applied, converge on the one accepted result and evidence row.
- If provably not applied and still within policy, allow a deliberate retry using the same operation or a terminally replaced operation as defined by the purpose.
- If state cannot be distinguished safely, expose `reconciliation_required`/approved support, not success.

## Concurrency and stale results

The expected security generation plus row locking makes two concurrent security-changing operations mutually stale after the first accepted commit. Late hosted returns, Electron callbacks, provider refreshes, and service responses also carry the local profile/session generation; a mismatch discards the result before renderer state changes.

At most one account-security generation and evidence effect may be committed for one operation. Provider behavior that occurred first is reported honestly even if SoloDesk rejected a later stale commit; reconciliation/support handles the divergence without rolling back a newer provider state automatically.

## Privilege and database rules

F011 tables/functions live in the private schema, enable RLS as defense in depth, and revoke `PUBLIC`, `anon`, and `authenticated`. Only narrowly privileged gateway code invokes private functions. The functions derive account/session context and never accept a service-role override from the client.

Foreign-key lookup columns and reconciliation queries are indexed. Text states have checks, timestamps use `timestamptz`, and request digests use the existing constrained canonical representation. No new extension, queue, cache, rate-limit store, microservice, or generic workflow engine is introduced.
