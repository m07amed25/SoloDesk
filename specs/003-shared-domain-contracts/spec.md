# Feature Specification: F003 — Shared Typed Commands and Domain Primitives

**Feature Branch**: `feat/f003-shared-typed-commands-and-domain-primitives` (proposed implementation identity; no branch created by this specification)

**Created**: 2026-10-18

**Status**: Draft — requirements quality reviewed; ready for technical planning; no implementation authorized by this request

**Input**: User description: "Build a full specs for F003 in plan.md"

**Feature / Milestone**: F003 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisite**: Actual merged F002. The root plan records F002 merged on 18 October 2026 and separately discloses remaining fork/control evidence. This specification does not independently verify that remote outcome or waive its recorded limitations. Recheck the merged prerequisite and any relevant inherited defects before implementation.

**Parent requirements**: NFR-001 (exact financial values, immutable history and idempotent authority), NFR-015 (unprivileged renderer and narrow typed boundaries), PLT-008 (versioned, revision-checked, deduplicated offline work). F003 supplies foundational contracts; complete runtime acceptance belongs to subsequent owning features.

**Authority**: [root F003 card](../../plan.md#f003), [common delivery contract](../../plan.md#4-mandatory-contents-of-every-feature-pr), [requirements](../../docs/product/requirements.md), [platform specification](../../docs/specs/platform-and-workspaces.md), [command contracts](../../docs/architecture/api-contracts.md), [shared data rules](../../docs/architecture/data-model.md), [module ownership](../../docs/modules/responsibilities.md), [constitution](../../.specify/memory/constitution.md), [decisions](../../docs/planning/decisions.md), [localization](../../docs/product/ux-and-localization.md), [acceptance](../../docs/quality/acceptance.md) and [verification strategy](../../docs/quality/test-strategy.md).

F003 gives feature contributors one consistent vocabulary for requests, results, identities, exact values and recoverable failures. Freelancers and team members benefit when later features preserve their amounts and work, reject unsafe references, and explain whether an action was saved locally or accepted by the service. Its immediate users are contributors, reviewers and future adapter authors; it introduces no business screen by itself.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Exchange Validated Commands Consistently (Priority: P1)

As a feature contributor, I can describe a named operation and exchange its bounded request and result without each feature inventing a different format or treating unchecked input as trustworthy.

**Why this priority**: Later boundaries depend on agreeing what was requested, which revision it concerns and what result actually occurred.

**Independent Test**: Submit synthetic registered operations and malformed variants to a contract-only receiver. Observe acceptance or rejection before any synthetic effect, then round-trip accepted results between independent consumers.

**Acceptance Scenarios**:

1. **A-01 — Complete exchange**: **Given** a registered operation with valid context and payload, **When** its request and result pass between consumers, **Then** operation identity, workspace, applicable device, request correlation, expected revision and exact values are preserved, and the result identifies its actual acceptance stage.
2. **A-02 — Invalid structure**: **Given** missing required fields, wrong types, unrecognized operation names, unknown command fields or invalid enum values, **When** validation runs, **Then** it rejects the request with bounded stable field issues before any effect; no input is silently discarded to make it valid.
3. **A-03 — Boundaries**: **Given** each approved size, length, depth, collection and numeric limit, **When** values at the limit and immediately beyond it are submitted, **Then** the permitted value passes its structural check and the excessive value fails without truncation, wrapping or unbounded error output.
4. **A-04 — No authority from claims**: **Given** a well-formed request claiming another actor, extra capabilities or a privileged operation, **When** a receiver evaluates it with a synthetic trusted context, **Then** client claims cannot grant authority and unsupported privileged methods remain unavailable.
5. **A-05 — Portable representation**: **Given** an accepted request/result containing Arabic text, large exact values, dates and identifiers, **When** independent supported consumers encode and decode it, **Then** they recover the same meaning and canonical values without process-specific objects or locale-dependent interpretation.

---

### User Story 2 - Preserve Exact Values and Date Meaning (Priority: P1)

As a contributor implementing billing or time features, I can represent and compare exact values without rounding away source evidence or accidentally applying an unapproved financial rule.

**Why this priority**: Precision errors spread into later bills and reports; a shared primitive must not quietly become a tax or time-rounding policy.

**Independent Test**: Use independently calculated synthetic examples for amounts, decimals, ratios, seconds, instants and date-only values. Compare exact expected results before and after exchange, and exercise invalid and overflow cases.

**Acceptance Scenarios**:

1. **A-06 — Currency precision**: **Given** explicit synthetic currency profiles with 0, 2 and 3 fractional places, **When** minor-unit amounts are exchanged and compared, **Then** their integer value, currency, precision and profile version remain exact; 123 minor units under a 2-place profile remains 1.23 units.
2. **A-07 — Decimal and ratio exactness**: **Given** exact 0.1 and 0.2, and an exact ratio of 1/3, **When** permitted arithmetic or normalization occurs, **Then** the sum equals exactly 0.3 and the ratio remains exact; a finite-decimal conversion that cannot represent 1/3 exactly returns a declared nonrepresentable result instead of choosing rounding.
3. **A-08 — Invalid authoritative numbers**: **Given** a binary floating-point amount, fractional source seconds, non-finite value, zero ratio denominator, malformed numeric text or value beyond the approved limit, **When** it is admitted as an authoritative primitive, **Then** it fails explicitly without coercion, saturation or approximate replacement.
4. **A-09 — Compatible units and signs**: **Given** amounts with different currencies or incompatible profile versions, or a negative value in a nonnegative field, **When** comparison, addition or field validation is attempted, **Then** it refuses the incompatible operation. A separately declared signed adjustment can represent a negative exact value without making ordinary source duration negative.
5. **A-10 — Preserve source duration**: **Given** 59 and 61 source seconds, **When** they are combined and exchanged in either locale, **Then** the result is exactly 120 seconds; no minute rounding, billing minimum or timer recovery rule is applied.
6. **A-11 — Dates and instants**: **Given** a date-only value and an event instant with relevant timezone context, **When** consumers in different timezones exchange them, **Then** the calendar date remains that date and the instant remains the same point in time. Impossible dates and ambiguous unqualified event times fail their respective validation.
7. **A-12 — Locale-independent values**: **Given** equivalent reviewed English and Arabic numeric-entry examples, including ambiguous separators, **When** their normalized values reach shared contracts, **Then** both languages produce identical canonical values; ambiguous input requires resolution before submission and cannot be interpreted differently by receivers.

---

### User Story 3 - Keep Operations Inside Their Workspace and Authority (Priority: P1)

As an adapter author or security reviewer, I can distinguish a correctly formed identifier from a resource the current actor is actually permitted to use, so shared contracts never imply access merely because a value looks valid.

**Why this priority**: Solo and team work share the same tenant boundary. Structural validation must support current authority checks without pretending to replace them.

**Independent Test**: Use two synthetic workspaces, resource kinds, actors and a current-authority test double. Submit valid, mismatched, missing and revoked references and record whether the synthetic handler was invoked.

**Acceptance Scenarios**:

1. **A-13 — Stable identity kinds**: **Given** stable identities for a workspace, project, operation and display document number, **When** a contributor uses one where another kind is required, **Then** the contract rejects the misuse; a display number cannot substitute for a resource identity and changing a label cannot change that identity.
2. **A-14 — Explicit tenant mismatch**: **Given** a request for workspace A with a reference explicitly scoped to workspace B, **When** it is validated, **Then** it is rejected before the operation runs, without exposing B's names, counts or contents.
3. **A-15 — Opaque foreign identity**: **Given** a structurally valid opaque reference whose actual resource belongs to B but whose request claims A, **When** the synthetic authoritative resolver checks ownership, **Then** it denies the request. Structural validity alone must never be reported as proof of ownership.
4. **A-16 — Revoked or insufficient access**: **Given** a valid request and a previously allowed actor, **When** current trusted context reports revocation, missing project scope or a denied action, **Then** execution is denied and cached client grants cannot restore access.
5. **A-17 — Private and absent resources**: **Given** equivalent requests for a missing resource and an inaccessible resource, **When** each is denied, **Then** public errors do not reveal private identities or fields; permitted diagnostics can correlate the failure without returning hidden resource details.

---

### User Story 4 - Evolve Contracts and Retry Without False Success (Priority: P1)

As a contributor implementing offline and service adapters, I can identify supported contracts, retries, conflicts and unknown outcomes without losing a queued operation or claiming an authoritative result prematurely.

**Why this priority**: Older clients, disconnected work and lost replies are normal conditions. Their meaning must agree before persistence and synchronization are implemented.

**Independent Test**: Exchange versioned synthetic messages and drive a receipt-aware test double through local acceptance, authoritative acceptance, response loss, repeat submission and revision conflict. This proves contract semantics, not durable production receipts or synchronization.

**Acceptance Scenarios**:

1. **A-18 — Unsupported version**: **Given** an unsupported, missing or malformed contract version, **When** a request or accepted-event description is received, **Then** it stops before unsafe interpretation and reports the supported recovery/upgrade action; the original pending content remains available to its owner for recovery.
2. **A-19 — Declared compatibility**: **Given** the published supported-version list and a fixture from every supported version, **When** each is consumed, **Then** every supported fixture preserves meaning and every unsupported fixture fails explicitly. Unknown event fields or kinds cannot be silently dropped or treated as an applied event.
3. **A-20 — Local versus authoritative**: **Given** only a local receipt, a queued operation or a remotely accepted background job, **When** a result is described, **Then** it cannot masquerade respectively as synchronized data, an authoritative financial commit or completed external delivery.
4. **A-21 — Repeat and changed intent**: **Given** the same actor/workspace/operation kind and operation identity, **When** identical intent is retried, **Then** a conforming test double resolves the same receipt; when a materially changed payload, expected revision or referenced policy reuses that identity, it rejects reuse without a second effect. Correlation changes alone do not change intent.
5. **A-22 — Response loss and conflict**: **Given** a response is lost or an expected revision no longer matches, **When** the caller interprets the result, **Then** it distinguishes unknown outcome from rejection and revision conflict, resolves the existing operation before a new effect is attempted, and never silently overwrites the newer revision.

---

### User Story 5 - Explain Failures in English and Arabic Safely (Priority: P1)

As a future user-facing feature contributor, I can turn stable errors into an actionable English or Arabic message while preserving valid input and keeping private internals out of the display.

**Why this priority**: A failure contract is incomplete if it only returns raw exceptions, loses input or encourages unsafe retries.

**Independent Test**: Review a synthetic error catalogue and representative rendered messages in both languages. Verify parameters, safe diagnostic references, recovery actions and mixed-direction identifiers without adding a production screen.

**Acceptance Scenarios**:

1. **A-23 — Stable localized meaning**: **Given** each public error category and its declared safe parameters, **When** English and Arabic messages are selected, **Then** the same code has equivalent meaning and recovery action in both; changing language changes neither stored enums nor exact values.
2. **A-24 — Useful field issues**: **Given** invalid fields alongside valid input, **When** validation fails, **Then** bounded field identifiers and stable issue keys identify the correction needed, valid input remains available, and no untranslated internal exception is required to understand the failure.
3. **A-25 — Safe fallback**: **Given** an unknown future error code or missing message, **When** a supported consumer presents it, **Then** it uses a reviewed generic localized message and safe diagnostic reference; it neither crashes nor guesses that retrying a potentially committed operation is safe.
4. **A-26 — Redaction and direction**: **Given** a failure containing a synthetic secret, private resource detail, malicious markup and a mixed Arabic/Latin reference, **When** its public message and diagnostics are produced, **Then** forbidden content is absent, text is inert, and identifiers remain readable in both directions without changing their values.
5. **A-27 — Recovery classification**: **Given** validation, expired authentication, denied access, online-required, conflict, rate-limit, unknown-outcome and unavailable-storage cases, **When** their recovery advice is inspected, **Then** it respectively requests correction, sign-in, permitted access repair, connectivity, explicit conflict resolution, bounded delayed retry, status reconciliation or protected-storage recovery; none reports fabricated success.

---

### User Story 6 - Reuse the Same Rules Across Adapters (Priority: P2)

As a later feature contributor, I can use shared contracts through narrow capability-specific boundaries without importing a desktop, storage or cloud implementation into the rules themselves.

**Why this priority**: This makes the earlier stories reusable while keeping actual infrastructure and business features in their owning phases.

**Independent Test**: Run one contract-conformance fixture pack against two independent in-memory adapter doubles and in the declared desktop/service execution environments. Inspect dependency boundaries and compare outcomes to independently authored expectations.

**Acceptance Scenarios**:

1. **A-28 — Equivalent adapters**: **Given** the same context and independently expected fixtures, **When** two adapter doubles receive them, **Then** both preserve exact values, revisions, errors, workspace scope and result stages; switching adapters cannot invent a financial or authorization policy.
2. **A-29 — Independence and narrowness**: **Given** the shared rules and adapter-facing capabilities, **When** they are used outside the desktop process, **Then** they need no window, filesystem, database, network credential or UI instance. No capability permits arbitrary execution, query text, path access or caller-selected privileged channels.
3. **A-30 — Adapter failures**: **Given** an adapter timeout, cancellation, unavailable dependency or uncertain commit, **When** the adapter reports its result, **Then** it distinguishes safe nonexecution from unknown outcome, preserves correlation and recoverable intent, and cannot label an uncertain effect as canceled or successful without evidence.
4. **A-31 — Integrated conformance review**: **Given** the future F003 review proposal, **When** agent QA exercises serialization, exact values, denied references, version failures and bilingual error samples, **Then** evidence records actual expected/observed outcomes and environments; missing fluent/native evidence remains explicit and no business, encryption or synchronization pass is inferred.
5. **A-32 — Compatible repair**: **Given** a defective contract revision and an older pending fixture, **When** a repair or backout is proposed, **Then** compatibility is checked before adoption, original intent is retained, and an incompatible rollback is replaced by a versioned forward repair rather than silently rewriting persisted intent.

### Edge Cases

- Absent, null and empty are distinct; a partial-update contract must explicitly allow clearing a field. An omitted required value never becomes an implicit default.
- Wrong resource-kind identifiers, mixed-case/noncanonical identities and invoice display numbers cannot pass merely because they resemble valid text. Removed resources still require current authority checks.
- Excessive nesting, oversized strings/collections, huge numeric digit counts, duplicate field names, malformed text and unsupported values fail with bounded diagnostics. Declared envelope size applies before expensive interpretation.
- Exact zero, signed zero, leading zeros, trailing fractional zeros, exponent notation, whitespace and locale separators have a declared canonicalization/rejection rule. Normalization never changes value or hides invalid input.
- Overflow at construction, intermediate arithmetic or final conversion is explicit; reducing a ratio or decimal cannot conceal a disallowed original input size. Division by zero and nonterminating conversion cannot fall back to approximations.
- Missing currency/profile, changed exponent, unlike currencies and negative ordinary duration are invalid. The primitive layer cannot select tax order, FX rate, rounding, billing minimum or invoice number policy.
- Leap days, invalid calendar dates, timezone-offset changes and clock skew cannot confuse date-only work dates with instants or client occurrence time with authoritative commit order.
- Structurally valid references with false workspace claims need trusted resolution. A well-formed actor, device or cached grant is not authentication, enrollment or permission proof.
- Identical retries with new correlation identifiers retain the same intent. Changed intent with an old operation identity is rejected. Separate actors/workspaces/operation kinds do not accidentally share a receipt scope.
- Timeout or cancellation after a potential effect remains unknown until reconciled. Retrying with a fresh identity cannot serve as an automatic unknown-outcome recovery path.
- Unknown contracts/events retain recoverable originals; unknown errors get safe display fallbacks. Neither fallback grants permission to process unsupported data.
- Empty translations, extra/untrusted message parameters, plural forms, long Arabic content and bidirectional control characters need bounded, inert display. Untrusted diagnostic text cannot become a recovery link or executable markup.
- A fake adapter's successful round-trip is not durable storage, server authorization, encryption, real offline replay, native IPC or financial transaction proof.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: F003 MUST define one discoverable catalogue of named, versioned operation contracts and shared primitives, linked to NFR-001, NFR-015 and PLT-008; each contract MUST declare its purpose, required context, fields, result alternatives, bounds and owning feature.
- **FR-002**: A request MUST identify contract version, operation kind, request/correlation identity, workspace, applicable device context, operation identity for writes and expected revision where applicable, with a bounded operation-specific payload. Actor authority MUST come from verified context, not client fields.
- **FR-003**: Every public input MUST be validated at runtime before a receiver treats it as a valid contract. Missing/unknown fields, invalid types/enums and unsupported operation kinds MUST fail explicitly; static types or client-side checks alone MUST NOT establish trust.
- **FR-004**: Contract semantics MUST distinguish absent, explicit null and empty values. Defaults and partial-update clearing MUST be declared per field; there MUST be no silent field dropping, truncation or coercion of invalid inputs into valid commands.
- **FR-005**: The initial contract pack MUST declare finite measurable limits for encoded envelope size, nesting, field text, collections, issue counts and numeric representations before implementation adoption. Limits MUST be checked before unbounded work and at the exact boundary; entry approval and evidence MUST cover every limit category.
- **FR-006**: Accepted values MUST have a portable, lossless representation across supported consumers, including Unicode, exact numeric values, date-only values and instants. Process-local handles, executable values and platform-specific objects MUST NOT be admitted as ordinary shared data.
- **FR-007**: Resource, workspace, device, operation and correlation identities MUST have explicitly distinct meanings and validation. Opaque stable resource IDs MUST remain independent of user-editable labels, sequential display numbers, locale and clock-derived ordering.
- **FR-008**: Tenant-owned references MUST be associated with a workspace context. An explicitly mismatched reference MUST fail before an effect; a matching claim or valid opaque ID MUST still require trusted resource ownership and current permission resolution before later adapter execution.
- **FR-009**: The contract for trusted context MUST distinguish verified actor/device identity, current workspace/project/action authority and client-supplied claims. Missing or denied authority MUST fail closed without accepting stale client grants.
- **FR-010**: Denied/missing-resource results MUST avoid disclosing inaccessible names, fields, identities or counts. A safe diagnostic reference MUST permit permitted investigation without widening the caller's access.
- **FR-011**: Authoritative money MUST retain an exact integer minor-unit amount, currency identity, explicit precision and profile version. Numeric construction and transport MUST NOT derive authoritative value from binary floating-point or display formatting.
- **FR-012**: Quantities, prices, percentages and exchange-rate primitives MUST preserve bounded exact decimal or rational values. Rational denominators MUST be positive and nonzero; canonical representations MUST preserve mathematical equality and reject malformed/unbounded input.
- **FR-013**: Any supplied primitive arithmetic MUST be exact and checked, with compatible operands/units and explicit overflow or nonrepresentable results. It MUST NOT round, saturate, wrap or invent a currency conversion. A conversion requiring rounding MUST require an explicit owning policy and MUST NOT supply a default policy in F003.
- **FR-014**: Money operations MUST reject unlike currencies and incompatible precision/profile interpretations unless an explicitly versioned owning feature defines conversion. Missing profile metadata MUST NOT be replaced by a universal two-place assumption.
- **FR-015**: Source duration MUST be bounded nonnegative integer seconds. Generic signed adjustments MUST be explicitly distinguished from nonnegative durations/amount fields. Display minutes, timer heuristics and billing rounding MUST NOT alter source seconds.
- **FR-016**: Calendar dates MUST remain distinct from event instants. Date validity, instant qualification and relevant timezone context MUST be declared; client occurred-at and service received/committed-at MUST remain distinct, and client clocks MUST NOT determine authoritative revision order.
- **FR-017**: Stable codes, enums and canonical numeric/date/identity values MUST be locale independent. English/Arabic presentation or reviewed input normalization MUST NOT rewrite exact stored values, user-entered legal text or resource identities; ambiguous financial input MUST be resolved before admission.
- **FR-018**: Protocol, payload/event schema, entity revision and financial policy/profile versions MUST be distinguishable. Every consumer MUST publish the versions it supports; initial adoption MUST explicitly list accepted versions rather than assume forward compatibility.
- **FR-019**: Unsupported contracts/events, unknown fields with no declared compatibility rule and incompatible revisions MUST stop unsafe processing and provide an upgrade/recovery result. Pending original intent MUST remain recoverable; rejection MUST NOT acknowledge an unapplied event or advance its progress marker.
- **FR-020**: Results MUST distinguish rejection, durable local acceptance, queued work, authoritative acceptance, conflict and unknown outcome. Optional revision/progress/commit metadata MUST only appear with the stage that can substantiate it; a local receipt MUST NOT claim service acknowledgment.
- **FR-021**: Acceptance of a background job MUST remain distinct from completion, sending, delivery or provider settlement. Contracts MUST NOT imply a financial posting, publication or external effect merely from a successful request exchange.
- **FR-022**: Retry intent MUST be scoped by workspace, verified actor and operation kind plus operation identity. The contract MUST define which validated fields determine identical intent, including relevant payload, expected revision and policy references; request correlation and transport-attempt metadata MUST NOT change that intent.
- **FR-023**: A conforming receipt-capable adapter MUST resolve the same intent to its existing receipt and reject changed-intent reuse without a second effect. Contract conformance doubles MUST prove this behavior; durable receipts, retention and actual financial uniqueness remain subsequent feature obligations.
- **FR-024**: Unknown outcomes MUST instruct operation-status reconciliation before a new effect; revision conflicts MUST expose only permitted resolution information and MUST NOT allow silent overwrite. Cancellation/timeout MUST NOT claim nonexecution when an effect may have occurred.
- **FR-025**: Public failures MUST use the stable project error taxonomy and bounded issue keys, safe parameters, correlation/diagnostic references and recovery classification. Raw exceptions, credentials, query text, private fields and stack traces MUST NOT be public contract content.
- **FR-026**: Every initial public error code and issue key MUST have complete parameter-compatible English and Arabic message definitions and actionable recovery guidance. Valid input MUST remain available after validation failure; field identifiers MUST permit a future interface to associate an issue with its input.
- **FR-027**: Unknown codes/missing messages MUST produce a reviewed localized safe fallback while retaining a diagnostic reference. Fallbacks MUST NOT assert success, leak raw text or authorize blind retries; missing initial-catalogue translations remain a readiness defect despite fallback availability.
- **FR-028**: Public error text/parameters MUST remain inert and bounded, and mixed-direction identifiers MUST retain readable exact meaning. Redaction MUST apply before public diagnostics are produced; translation or diagnostic parameters MUST NOT widen private resource access.
- **FR-029**: Shared rules MUST remain independent of UI, native lifecycle, storage, network and provider implementations. Adapter-facing ports MUST describe narrow named capabilities and explicit outcomes, with no arbitrary execution, SQL, filesystem path, URL-fetch or raw-channel facility.
- **FR-030**: Ports MUST require applicable workspace context, current authority, expected revision and result-stage semantics; adapters MUST implement them without inventing financial, permission, retry or localization policy. Atomic durable writes and authoritative commits MUST remain owned by their later adapters/features.
- **FR-031**: A reusable conformance fixture pack MUST compare at least two independent synthetic adapter implementations and the declared supported execution environments against independently authored expected results. Empty suites, same-code-generated expectations and skipped environments MUST NOT be reported as conformance.
- **FR-032**: Documentation MUST publish the contract/primitives catalogue, normalization and bounds policy, version support/evolution policy, intent identity rules, public error catalogue, port responsibilities, examples and known limits. Examples MUST include malformed, oversized, cross-tenant, unsupported-version, exact-value and English/Arabic cases.
- **FR-033**: A contract change MUST state compatibility with pending operations and supported consumers, affected owners and required repeat checks. Backout MUST be verified compatible or replaced by a versioned forward repair; changing a contract MUST NOT silently rewrite accepted financial facts or queued intent.
- **FR-034**: F003 delivery MUST retain one primary feature proposal, current automated verification, actual agent QA, feature guidance and QA evidence, prerequisite review, no blocking defects and explicit final user approval before merge. Specification/checklist completion MUST NOT advance implementation or release status.

### Key Entities _(include if feature involves data)_

These are shared logical values and contracts, not a customer database schema or stored records introduced by this request.

- **Contract Definition / Supported-Version Record**: Operation purpose, owner, message/schema versions, required fields, validation bounds, permitted results and declared compatibility fixtures.
- **Command / Query Envelope**: Named operation, version, correlation, workspace/device context, write identity and applicable expected revision, plus bounded payload. Queries do not manufacture write identities or accepted effects.
- **Trusted Execution Context**: Verified actor/device and current tenant/project/action authority; supplied by a trusted boundary, never established by the ordinary command payload.
- **Scoped Resource Reference**: Stable opaque identity, resource kind and workspace context; an ownership claim requiring trusted resolution before use.
- **Exact Value**: Money with currency/precision/profile, exact decimal or rational quantity/rate, integer-second duration or explicitly signed adjustment; construction and arithmetic retain exactness and bounds.
- **Date / Instant / Revision**: Separate calendar, event-time and accepted-order concepts; timezone/context and version semantics prevent one from standing in for another.
- **Operation Intent / Receipt / Result**: Scoped write identity, normalized validated intent, observed acceptance stage, permitted revision/commit metadata and reconciliation path. The receipt contract is separate from its eventual durable implementation.
- **Public Error / Field Issue**: Stable code/key, bounded safe parameters, field association, diagnostic reference, recovery classification and paired language messages.
- **Adapter Capability / Conformance Fixture**: Narrow responsibility, required context and outcomes, independent synthetic input/expected result and evidence of whether a receiver respects the contract.

### Contract Semantics and Ownership

| Concern                  | F003 contract obligation                                                                                 | Later owner / boundary                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Named request and result | Bounded, versioned, serializable shapes; runtime rejection; no generic privileged command                | F004 binds native handlers; F008/F009 bind service authority                                        |
| Identity and authority   | Distinct ID kinds, workspace context, trusted actor/permission requirements                              | F008–F016 implement tenancy, memberships, grants, enrollment and revocation                         |
| Exact values             | Exact construction, normalization, checked primitive arithmetic and conversions that require no rounding | F040 owns financial calculation/profile application; time features own capture and billing policies |
| Offline meaning          | Local/queued/accepted/conflicted/rejected/unknown distinctions; retry and receipt obligations            | F007/F017/F018/F020 implement durable local changes, replay, pull and conflicts                     |
| Version evolution        | Explicit supported versions, safe failure and preservation obligations                                   | Storage/sync owners implement migrations, compatibility rollout and actual retained pending content |
| Public errors            | Stable codes/keys, paired messages, safe parameters and actionable semantics                             | F005 and later screens render full accessible UI; domain owners define additional bounded issues    |
| Ports                    | Narrow capabilities, current context, explicit effects and failure outcomes                              | Native/local/cloud/provider adapters implement effects under their own phase gates                  |

### Validation and Precision Policy

F003 MUST publish a versioned bounds profile before implementation adoption. The profile is a technical contract, distinct from commercial quotas and financial calculation policy. This specification does not invent approved numerical ceilings: the root card requires their approval as an entry decision. Technical planning must propose concrete finite values and rationale, record approval through the existing review workflow, and provide acceptance fixtures at/beyond each value. An omitted or unapproved profile blocks implementation adoption, not preparation of this specification.

| Profile category            | Required declaration and acceptance                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Envelope and nesting        | Maximum encoded bytes and nesting depth; reject excessive input before unbounded parsing/validation; duplicate field names cannot hide conflicting values                                                     |
| Strings and collections     | Explicit length unit for text, maximum field/key length, collection entries and field-issue count; account for Arabic/combining characters; error overflow is summarized safely                               |
| Identifiers and revisions   | Canonical accepted grammar, resource-kind distinction, revision range/ordering and missing/null rules; display labels cannot pass as identities                                                               |
| Decimal and rational values | Maximum input digits, coefficient magnitude, decimal scale and numerator/denominator magnitude; accepted sign/zero rules; bound intermediate work and outputs                                                 |
| Money and seconds           | Minor-unit magnitude, explicit precision metadata, source-second range and legal signed contexts; include 0/2/3-place synthetic currency fixtures and values beyond ordinary floating-point integer precision |
| Dates and instants          | Accepted date/instant ranges and timezone/offset qualification; impossible dates, offset boundaries and distinct occurrence/commit metadata                                                                   |

Canonical exchange uses locale-independent exact text for authoritative numeric values. Decimal/rational normalization must have one published equal-value representation; zero must not retain a misleading negative sign. Group separators, localized digits and ambiguous decimal input belong to reviewed input normalization, not receiver-specific guesses. Resource limits apply to the supplied input before normalization as well as normalized output. No concrete field grammar, runtime library, transport, hashing algorithm or storage representation is selected by this specification.

### Version and Failure Contract

Initial delivery MUST define an explicit initial supported version and fixtures. A receiver accepts only versions in its declared support list. Command fields are closed unless a particular extension is explicitly defined; an unrecognized field is not silently ignored. Subsequent additive or breaking changes require a declared compatibility assessment and supported-version update. Financial policy/profile versions, event schema versions and entity revisions do not become interchangeable with protocol versions. Forward/backward compatibility is demonstrated, not inferred from a version label.

Public error categories retain the existing command-contract meanings:

| Stable code(s)                         | Required safe next action                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| VALIDATION                             | Correct bounded identified fields; preserve valid input                                            |
| AUTH_REQUIRED / SESSION_REVOKED        | Stop protected actions; offer sign-in or recovery without exposing credentials                     |
| FORBIDDEN / RESOURCE_UNAVAILABLE       | Deny access without private detail; refresh permitted scope or request authorized assistance       |
| REVISION_CONFLICT                      | Review permitted current state and explicitly resolve; no silent overwrite                         |
| FINANCIAL_LOCK / ALLOCATION_CONFLICT   | Use the owning feature's permitted correction path; never unlock or rebill implicitly              |
| ONLINE_REQUIRED                        | Retain eligible draft/local intent and request connectivity; do not claim finalization             |
| OUTCOME_UNKNOWN                        | Resolve the existing operation's status before requesting another effect                           |
| RATE_LIMITED                           | Respect declared bounded delay; retain eligible work                                               |
| UPGRADE_REQUIRED / SCHEMA_UNSUPPORTED  | Stop incompatible processing and offer upgrade/recovery; retain pending originals                  |
| STORAGE_UNAVAILABLE / KEY_UNAVAILABLE  | Offer protected-storage recovery; no fabricated empty data or plaintext fallback                   |
| PROVIDER_FAILURE / SERVICE_UNAVAILABLE | Follow declared retry/reconciliation semantics; failure code alone cannot prove no effect occurred |

The initial catalogue defines these meanings and bilingual examples; it does not implement the corresponding financial, provider, key-store or account functionality. Retry permission is explicit for the observed outcome, not inferred solely from a generic service error. Cancellation may assert no effect only when the receiver can establish that fact.

### Scope and Authority Boundaries

**Included in future F003 delivery**: Shared versioned requests/results/events where needed for conformance, stable IDs/references, exact money/decimal/rational/second/date primitives, bounded validation, stable bilingual public errors, narrow adapter contracts, synthetic conformance fixtures and discoverable usage/evolution/recovery guidance. General primitive arithmetic is limited to exact checked operations; no invoice/tax/FX calculation policy is delivered.

**Excluded from this invocation**: Application or tooling implementation, package installation, new infrastructure, branches/commits/PRs, remote settings, purchases, deployment, external messages, automatic technical-plan/task generation or an implementation/merge/release claim. Deliverables are this specification, its quality checklist, the local active-feature pointer and the F003 card's specification link/status correction.

**Excluded from F003 feature delivery**: F004 lifecycle/preload/sender enforcement; F005 production shell and complete UI localization/accessibility; F006/F007 key protection, encryption, persistence and migrations; F008/F009 real tenancy/service transactions; identity/enrollment/roles; durable sync/outbox/receipts; actual clients/projects/tasks/timers/invoices; financial rounding/tax/numbering/FX profiles; provider effects; portal and signed distribution. Defining an obligation for an adapter does not implement it.

**Actors and permissions**: Contributors define/use contracts; adapter authors supply trusted context and enforce current authority; reviewers verify conformance and privacy; the product/security/finance owners resolve their existing open policies; the user approves final delivery. No product role matrix, new user permission or independent human staffing requirement is created here.

**Online/offline state**: Contract validation and exact-value operations need no connectivity. A structural pass gives no access lease, durable save or accepted financial effect. Later offline adapters must supply atomic persistence and distinguish local from service outcomes; authoritative financial operations remain online. Unknown outcomes preserve intent and require reconciliation. No offline authorization duration or receipt-retention period is chosen here.

**Data, migration and recovery**: This request adds no customer schema or persisted-data migration. Future F003 adoption must identify consumers and pending-data compatibility; no persisted old contract may be silently replaced. Repair repeats affected conformance checks and agent QA. Incompatible backout requires a forward repair/version transition with preserved originals; no branch backout may justify data loss.

**Entry gates**: F002 merge and applicable inherited limitations; approved finite numeric/input bounds; explicit initial protocol/version policy and declared consumer environments. Technical planning proposes implementation details and limit values. Q-03 financial rules, Q-05 roles, Q-06 offline duration, Q-07 encryption/recovery, Q-08 identity and Q-11 supported native versions remain open for their owning features. Synthetic profiles and contexts can demonstrate contracts without closing these decisions or claiming production readiness.

**Delivery evidence**: The future primary F003 PR includes `docs/features/F003.md`, `docs/qa/F003.md`, affected contract/architecture/coverage guidance and compatibility/backout notes. Automated results and agent QA must identify current build/base, contract/bounds/policy versions, environments, synthetic fixtures, expected/observed outcomes, artifacts, defects and reviewers. Bilingual samples require actual review, including fluent Arabic review where applicable; a screenshot or translated fixture alone is not fluent approval. Native applicability is justified against changed behavior; shared-runtime conformance does not certify installers or the open Q-11 matrix.

### Acceptance and Constitution Traceability

| Requirements  | Acceptance scenarios                    | Expected evidence / constitutional concern                                                                     |
| ------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| FR-001–FR-006 | A-01–A-05, A-18–A-19, A-28–A-29         | Catalogue completeness, input rejection, exact limits and portable exchange; I/II/V/VII                        |
| FR-007–FR-010 | A-04, A-13–A-17                         | Identity misuse and current-authority negatives using two synthetic tenants; II/III/V                          |
| FR-011–FR-017 | A-06–A-12                               | Independently expected exact values, unit/sign/overflow/date/locale cases; III/IV/VI                           |
| FR-018–FR-024 | A-18–A-22, A-30, A-32                   | Supported/unsupported fixtures, stage distinctions, changed-intent and uncertain-outcome cases; III/IV/VII     |
| FR-025–FR-028 | A-23–A-27                               | Complete paired error catalogue, safe fallback, redaction and bidi review; V/VI                                |
| FR-029–FR-031 | A-28–A-30                               | Dependency review, two independent adapters and supported-environment conformance; II/V/VIII                   |
| FR-032–FR-034 | A-03, A-19, A-21, A-23, A-28, A-31–A-32 | Reviewed examples, version/bounds entry record, actual QA, compatible repair and separate approval; I/VII/VIII |

Constitution I governs authorized documentation and traceability; II governs pure rules and narrow boundaries; III governs offline/result/retry semantics; IV governs exact values without policy invention; V governs authority/redaction; VI governs equivalent bilingual error meaning; VII governs compatible evolution and preserved intent; VIII governs honest evidence. Subsequent features still own each principle's complete runtime proof.

## Success Criteria _(mandatory)_

### Measurable Outcomes

These are future acceptance targets for F003, not results achieved by writing this specification.

- **SC-001**: All 32 acceptance scenarios have independently expected and actually observed outcomes linked to the 34 functional requirements; every included requirement has evidence or an explicit blocking gap before delivery approval.
- **SC-002**: Every malformed, excessive, wrong-identity, unauthorized, cross-workspace and unsupported-version example is rejected before its synthetic effect; zero negative cases produce a success acknowledgment or disclose protected synthetic fields.
- **SC-003**: Every exact-value fixture, including 0/2/3-place currency profiles, values beyond ordinary floating-point integer precision, decimal sums, 1/3, integer seconds and invalid dates, matches its independent expected value or explicit error with zero silent rounding or truncation.
- **SC-004**: Two independent adapter doubles and every declared supported consumer environment produce identical canonical values, acceptance stages and error classifications for the complete conformance pack. Each missing required environment is visible as a gap rather than a pass.
- **SC-005**: Every approved limit category has a passing at-limit and failing beyond-limit case, plus an enforced bounded-work result. Zero supplied values evade limits through normalization, diagnostic expansion or intermediate arithmetic.
- **SC-006**: All repeat-intent, changed-intent, revision-conflict and uncertain-outcome cases are classified correctly. Identical retries resolve one synthetic receipt, changed-intent reuse creates zero additional effects, and zero local or queued results are presented as authoritative completion.
- **SC-007**: Every initial public error code and issue key has complete English and Arabic messages with matching safe parameters and a reviewed next action. All unknown-code cases display a safe fallback; zero messages expose synthetic secrets, private details or executable content.
- **SC-008**: In representative English/Arabic message review, reviewers can identify the failure and prescribed next action in every selected case without inspecting internal exceptions; mixed-direction identifiers retain their exact readable value. Missing fluent Arabic review remains a blocking evidence gap for that claim.
- **SC-009**: Every supported-version fixture remains interpretable with unchanged meaning, and every unsupported-version fixture stops safely. The repair/backout trial preserves 100% of original pending intents and introduces zero unreviewed reinterpretations.
- **SC-010**: A contributor can complete two independent contract-conformance runs using the published guidance without undocumented infrastructure or credentials. The final review pack distinguishes specification readiness, automated results, agent QA, user approval, merge and release in every status claim.

## Assumptions

- **Request interpretation**: “F003 in plan.md” selects the existing F003 feature card as source; it does not request replacing the full programme plan, starting implementation or generating technical plans/tasks. The skill's standard output is `specs/003-shared-domain-contracts/spec.md`, linked from F003.
- **Naming**: Sequential numbering selects 003 after existing 001/002 directories. The short name `shared-domain-contracts` covers commands and primitives. The proposed implementation branch follows the repository's explicit F003 naming policy and is independent of this directory; no branch switch is required.
- **Observed baseline**: The local tree has the welcome shell, governance and F002 verification tooling. There is no shared `packages/` domain/contract implementation in the inspected tree. Installed libraries or F002 results do not establish F003 behavior. The copied F002 implementation/PR status in the F003 card is corrected only for F003; neighboring phase statuses are outside this task.
- **Version policy**: Initial support is an explicit allowlist, without presumed future compatibility. Technical planning names the initial version and concrete fields/grammars; later changes require compatibility fixtures and preserved intent. No currently deployed product protocol is claimed.
- **Bounds policy**: Approved finite bounds are a documented F003 implementation entry gate. Their exact numerical values and resource rationale belong in technical planning and entry review. This keeps the specification testable against that declared profile without presenting invented financial magnitude/precision choices as owner-approved.
- **Exact arithmetic scope**: Primitive exactness is required now; full money conservation, source ownership, rounding, tax/discount order, FX, financial issuance and timer behavior remain with owning features. Synthetic currency profiles exercise precision without selecting real-market policy or closing Q-01/Q-03.
- **Authority**: Structural validation cannot determine actual ownership of an opaque ID or authenticate a client. Trusted-context and resolver doubles demonstrate required integration semantics; real service/native enforcement belongs to later phases. No production security claim follows from a shared type.
- **Localization**: Shared values use canonical representations; input parsing and actual accessible screens are separate consumers. F003 supplies paired error definitions and representative review samples. No new production UI or screenshot harness is required by this specification request.
- **Adapter scope**: Ports and synthetic doubles establish contracts only. They do not create a database, durable outbox, encrypted cache, remote transaction, provider call or network service. Native/service runtime choices are verified during technical planning against the installed project and intended environments.
- **Open decisions and cost**: All Q-01–Q-16 retain their current state. No sign-in, encryption, role, offline-duration, financial, provider, supported-OS, retention or service-capacity policy is settled here. No current price, entitlement or provisioning promise is needed for contract specification.
- **Approval and readiness**: A completed quality checklist means requirements were reviewed. Applicable checks, real agent QA, merged prerequisites, no blocking defects and the user's final approval still govern future merge; release needs its own evidence and authority.
