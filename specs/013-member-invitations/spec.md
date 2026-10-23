# Feature Specification: F013 — Member Invitations

**Feature Branch**: `feat/f013-member-invitations`

**Created**: 2026-10-23

**Status**: Draft — specification only; implementation and delivery claims require separate evidence and approval

**Input**: User description: "Create a spec for f013 at '/home/mohamed-s/Desktop/SoloDesk/plan.md'"

**Feature / Milestone**: F013 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisite**: F012 workspace creation and safe switching. F013 consumes F012's immutable workspace identity, current-workspace context, and initial owner membership without reopening workspace creation or switching behavior.

**Parent requirement**: PLT-004. Supporting constraints: D-10, D-11, D-14, D-15, D-17, A-03, A-04, Q-02, Q-05, Q-08, and Constitution Principles I–V and VIII.

**Authority**: [F013 card](../../plan.md#f013), [platform and workspaces](../../docs/specs/platform-and-workspaces.md), [account-to-team workflow](../../docs/product/workflows.md), [workspace screens](../../docs/product/screens.md), [security and privacy](../../docs/architecture/security-and-privacy.md), [API contracts](../../docs/architecture/api-contracts.md), [data model](../../docs/architecture/data-model.md), [UX and localization](../../docs/product/ux-and-localization.md), [test strategy](../../docs/quality/test-strategy.md), [decisions](../../docs/planning/decisions.md), and [constitution](../../.specify/memory/constitution.md).

F013 lets an authorized workspace administrator invite one specific recipient to join the current workspace with an explicit role, scope, and expiry. The recipient must accept once, online, while signed in as the intended verified identity. Acceptance creates at most one membership and never derives access from an unverified address, a client contact, possession of a link alone, or cached offline state.

Invitation creation, message delivery, link use, and membership acceptance are distinct outcomes. Authorized users can see pending and failed-delivery states, resend an invitation while invalidating every earlier acceptance secret, or revoke a pending invitation. Exact production expiry, role templates, scope policy, and public email delivery remain gated decisions; this specification requires configured approved values without presenting provisional choices as confirmed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Invite a Specific Member with Explicit Access (Priority: P1)

As an authorized workspace administrator, I can invite a specific person with a visible role, scope, and expiry so that they know what workspace access they are being offered and no broader membership is created accidentally.

**Why this priority**: A recipient-bound invitation is the only safe foundation for growing a one-person workspace into a team. Ambiguous identity or scope would turn an administrative convenience into a tenant-access vulnerability.

**Independent Test**: From a workspace with one owner, invite a new recipient using valid English and Arabic identity values and an allowed role/scope. Verify one pending invitation is created, the intended recipient and access summary are explicit, no membership exists before acceptance, duplicate submission has one effect, and a client contact with the same email receives no automatic membership.

**Acceptance Scenarios**:

1. **A-01 — Start an authorized invitation**: **Given** the current account may invite members in the active workspace, **When** the invitation flow opens, **Then** the workspace, intended recipient, selected role, selected scope, and configured expiry are explicit before submission.
2. **A-02 — Validate recipient and access**: **Given** the recipient identifier is missing, malformed, unverified where verification is required, already an active member, or paired with a role or scope the inviter may not assign, **When** the invitation is submitted, **Then** no new invitation or membership is created and the user receives a safe correction action.
3. **A-03 — Create one pending invitation**: **Given** a valid recipient, allowed access, current authority, and a reusable client intent, **When** submission succeeds, **Then** exactly one recipient-bound pending invitation is recorded with authoritative expiry and no membership is created yet.
4. **A-04 — Keep contacts separate from members**: **Given** a client, lead, billing, or other contact record uses the same address as the intended recipient, **When** that contact is created, edited, imported, or matched, **Then** it grants no workspace membership and does not count as invitation acceptance.
5. **A-05 — Reconcile duplicate or interrupted creation**: **Given** submission is repeated, concurrent, timed out, or its response is lost, **When** the result is reconciled, **Then** the original invitation is returned or proven absent without creating multiple active invitation generations or memberships.

---

### User Story 2 - Accept Once as the Intended Identity (Priority: P1)

As an invited person, I can review and accept the invitation while signed in as the intended verified identity so that I join the correct workspace once with the offered access and understand what happened.

**Why this priority**: The invitation provides value only when it safely becomes a membership. Single-use, identity-bound, current online acceptance prevents forwarded, replayed, expired, or stolen invitations from granting tenant access.

**Independent Test**: Open one current invitation as the intended existing account, as a different account, signed out, expired, revoked, and concurrently from two sessions. Verify only the intended verified identity can accept, one membership results, all later uses fail safely, and the accepted role/scope matches the reviewed current offer.

**Acceptance Scenarios**:

1. **A-06 — Require trusted identity before details or acceptance**: **Given** an invitation is opened without a current verified account, **When** the recipient continues, **Then** the product requires the approved online sign-in flow and does not treat possession of the invitation link or secret as identity proof.
2. **A-07 — Reject the wrong identity safely**: **Given** the signed-in account does not match the invitation's intended verified recipient, **When** acceptance is attempted, **Then** no invitation details beyond safe guidance and no workspace data or membership are disclosed, and the user can switch to the intended account or stop.
3. **A-08 — Review the current offer**: **Given** the intended account opens a pending current invitation, **When** the acceptance confirmation appears, **Then** it identifies the workspace, inviter where permitted, role, scope, expiry, and the fact that joining does not imply broader financial or administrative authority.
4. **A-09 — Accept exactly once**: **Given** the invitation, recipient identity, workspace, role/scope policy, and inviter action remain valid, **When** acceptance succeeds, **Then** exactly one active membership is created with the reviewed access and the invitation becomes consumed.
5. **A-10 — Reconcile concurrent or unknown acceptance**: **Given** two sessions accept concurrently or the response is lost after commitment, **When** either session retries or restarts, **Then** both converge on the same single membership and consumed invitation without duplicate membership or broader access.
6. **A-11 — Deny unusable invitations**: **Given** an invitation is malformed, expired, consumed, superseded, revoked, recipient-mismatched, or no longer allowed by current workspace policy, **When** acceptance is attempted, **Then** no membership is created and the intended recipient receives a safe reason category and next action without hidden-workspace disclosure.

---

### User Story 3 - Resend or Revoke a Pending Invitation (Priority: P1)

As an authorized workspace administrator, I can recover from delayed delivery or withdraw an unaccepted invitation so that only the latest intended offer can be accepted.

**Why this priority**: Delivery failures and changed staffing decisions are routine. Leaving old acceptance secrets valid after resend or revocation would undermine the recipient and expiry controls of the primary flow.

**Independent Test**: Create a pending invitation, resend it twice, fail one delivery attempt, and then revoke it. Verify each resend invalidates all earlier acceptance secrets, delivery attempts remain distinct from invitation state, failure does not claim delivery or acceptance, and revocation prevents every outstanding secret from creating membership.

**Acceptance Scenarios**:

1. **A-12 — Distinguish creation, delivery, and acceptance**: **Given** a pending invitation exists, **When** its notification is queued, delivered, delayed, bounced, rate-limited, or fails, **Then** each delivery outcome is shown separately and none is represented as recipient acceptance or membership.
2. **A-13 — Resend with one current generation**: **Given** an authorized user resends a pending invitation, **When** the resend is committed, **Then** one new acceptance generation becomes current, all earlier acceptance secrets become unusable, the expiry follows the approved resend policy, and no membership is created.
3. **A-14 — Recover from failed delivery**: **Given** delivery of the current generation fails or remains unknown, **When** the administrator reviews the invitation, **Then** the invitation remains visibly unresolved with an allowed retry or alternate-contact correction path and the product does not claim the recipient received it.
4. **A-15 — Revoke all outstanding acceptance**: **Given** an invitation remains pending, **When** an authorized user revokes it, **Then** every current and prior acceptance secret becomes unusable, the invitation is marked revoked, and no membership is removed because none was created by that pending invitation.
5. **A-16 — Make stale administration harmless**: **Given** the invitation was accepted, revoked, superseded, expired, or changed after an administration view opened, **When** a stale resend or revoke action is submitted, **Then** the action cannot restore an old invitation, duplicate a membership, or overwrite the newer state and must return the current safe status.

---

### User Story 4 - Review Invitation Status Without Leaking Workspace Data (Priority: P2)

As an authorized workspace administrator, I can distinguish who is invited, whether delivery was attempted, and whether membership was accepted, expired, superseded, or revoked so that I can manage onboarding without exposing secrets or unrelated tenant information.

**Why this priority**: Administrators need operational clarity, while recipients and unauthorized users must not gain an enumeration channel for accounts, workspaces, members, or customer data.

**Independent Test**: Review a list containing pending, delivery-failed, accepted, expired, superseded, and revoked invitations as an authorized administrator and as an unauthorized member. Verify authorized status is clear, sensitive acceptance material is absent, unauthorized reads reveal no invitation or recipient information, and counts match authoritative invitation and membership states.

**Acceptance Scenarios**:

1. **A-17 — Show authoritative status to allowed administrators**: **Given** the viewer currently has invitation-management authority, **When** invitation status is viewed, **Then** each record identifies the safe recipient label, offered role/scope summary, expiry, invitation lifecycle, latest delivery outcome, and membership outcome without exposing acceptance secrets.
2. **A-18 — Protect status and counts**: **Given** the viewer lacks authority or targets another workspace, **When** they list, search, count, or open invitations, **Then** no recipient, invitation, workspace, membership, delivery, or aggregate information is disclosed.
3. **A-19 — Keep accepted membership distinct**: **Given** an invitation was accepted, **When** its history is viewed or delivery is retried, **Then** the membership remains a separate current-authority record, the invitation cannot be accepted again, and revoking invitation history cannot remove the member.
4. **A-20 — Preserve safe evidence**: **Given** an invitation is created, delivered, resent, accepted, expired, superseded, revoked, denied, or reconciled, **When** its evidence is reviewed, **Then** actor, workspace, safe recipient reference, offered access summary, event, outcome, authoritative time, and correlation are available to permitted reviewers without raw secrets or customer content.

---

### User Story 5 - Invite and Join Accessibly in English or Arabic (Priority: P2)

As an English- or Arabic-speaking keyboard or assistive-technology user, I can invite, review, accept, resend, or revoke with equivalent identity, scope, expiry, and consequence information so that safe team onboarding does not depend on language, direction, or pointer use.

**Why this priority**: Recipient identity, workspace identity, and access scope are security-critical content. Reordered email addresses, unclear status, or inaccessible confirmations can cause the wrong person or wrong access to be approved.

**Independent Test**: Complete valid, invalid, wrong-account, delivery-failed, resend, revoke, expired, and accepted flows in English and Arabic using keyboard-only and screen-reader navigation at 200% zoom, including mixed-direction addresses and workspace names.

**Acceptance Scenarios**:

1. **A-21 — Preserve bilingual meaning**: **Given** either supported language, **When** invitation identity, access, expiry, delivery, failure, or membership consequences are shown, **Then** meaning and available actions are equivalent with no untranslated user-facing content.
2. **A-22 — Keep mixed-direction identifiers intact**: **Given** an Arabic right-to-left layout contains email addresses, invitation references, role labels, or mixed Arabic/Latin workspace and recipient names, **When** they are displayed, copied, or entered, **Then** their character order and meaningful values remain intact and unambiguous.
3. **A-23 — Provide accessible state changes**: **Given** a keyboard or screen-reader user, **When** an invitation is created, sent, failed, accepted, resent, expired, or revoked, **Then** focus moves predictably, status changes are announced without leaking hidden information, and every required action has a non-pointer path.

### Edge Cases

- Two windows or devices submit the same invitation intent concurrently; one active invitation generation and no membership result before acceptance.
- A second authorized administrator invites the same recipient while a current invitation exists; the product returns the current pending state or requires an explicit resend/replacement rather than creating parallel acceptance paths.
- The recipient is already an active member, was removed previously, or joins through another valid invitation before this one is accepted; acceptance never creates a duplicate membership or silently restores prior grants.
- The intended address differs only by case, Unicode representation, aliasing, or provider-specific presentation; the verified identity provider's stable recipient binding, not display-string comparison alone, decides acceptance.
- The recipient changes their primary email after invitation creation; acceptance follows the approved verified-identity binding policy and never falls back to possession of the old address or link alone.
- The inviter loses invitation authority, the offered role/scope is disabled, or the workspace becomes unavailable between creation and acceptance; acceptance is denied or requires an authorized replacement offer.
- A resend commits but message delivery fails; every older secret stays invalid, the current delivery failure is visible, and no prior link is revived.
- A delayed delivery arrives after resend, expiry, revocation, or acceptance; opening it cannot restore or consume obsolete authority.
- Revocation and acceptance occur concurrently; one authoritative transition wins, and the result is either one valid membership from accepted current authority or no membership from revoked authority, never an ambiguous partial state.
- The service response is lost after create, resend, revoke, or accept; the user reconciles the current state before issuing a replacement action.
- The device clock, locale, or timezone is wrong; authoritative expiry and event ordering do not depend solely on the device clock.
- An invitation secret is malformed, guessed, logged out, copied to another device, or opened by a different account; no workspace or recipient existence is disclosed beyond safe neutral guidance.
- Delivery is delayed, bounced, rate-limited, quota-blocked, or unavailable; the product records the delivery outcome separately and does not claim receipt or acceptance.
- A client contact, imported address, billing recipient, or notification recipient matches the invitee; no such record becomes a member without current invitation acceptance.
- Long, mixed-direction, or identical workspace and recipient display names remain distinguishable without exposing private workspace content.
- The device is offline when create, resend, revoke, or accept is attempted; the action is not queued as if locally authoritative and the user is told that connectivity is required.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Invitation creation, resend, revocation, and acceptance MUST require current online authority for the active workspace and MUST NOT be approved from cached membership, local time, or caller-supplied actor data. Acceptance: A-01, A-09, A-13, A-15.
- **FR-002**: The invitation flow MUST make the target workspace, intended recipient, offered role, offered scope, and configured expiry explicit before commitment. Acceptance: A-01, A-08.
- **FR-003**: The product MUST validate a bounded recipient identifier and MUST bind the invitation to the intended verified account identity under the approved identity policy; display text or possession of a link alone MUST NOT establish that binding. Acceptance: A-02, A-06, A-07.
- **FR-004**: Only a currently authorized inviter MAY offer roles and scopes that the inviter is allowed to assign; acceptance MUST revalidate that the offered access remains allowed by current workspace policy. Acceptance: A-02, A-09, A-11.
- **FR-005**: A successful creation MUST produce exactly one pending invitation with one stable invitation identity, one current acceptance generation, authoritative creation and expiry evidence, and no membership. Acceptance: A-03, A-05.
- **FR-006**: Invitation creation MUST have one authoritative effect under double submission, concurrency, timeout, response loss, restart, and retry; an unknown outcome MUST be reconciled before a replacement action. Acceptance: A-05.
- **FR-007**: A workspace MUST have at most one current pending acceptance path for the same intended recipient; a duplicate or changed offer MUST return the current state or require an explicit authorized resend/replacement without parallel valid secrets. Acceptance: A-03, A-05, A-13.
- **FR-008**: Client, lead, billing, contact, imported, notification, or other address records MUST NOT create, imply, or reactivate workspace membership. Acceptance: A-04.
- **FR-009**: Invitation acceptance MUST require the intended verified account, the current unconsumed acceptance generation, current online authority, unexpired status, and a still-valid workspace and access offer. Acceptance: A-06–A-09, A-11.
- **FR-010**: Before acceptance, the intended recipient MUST be shown a safe current summary of the workspace, inviter where permitted, role, scope, expiry, and membership consequence and MUST explicitly confirm joining. Acceptance: A-08, A-09.
- **FR-011**: Successful acceptance MUST atomically create or return exactly one membership with the reviewed role and scope and mark the invitation consumed; no intermediate state may expose membership without consumed invitation authority or consume the invitation without the resulting membership. Acceptance: A-09, A-10.
- **FR-012**: Concurrent, repeated, interrupted, and outcome-unknown acceptance MUST converge on one membership and one consumed invitation without duplicate membership, expanded access, or a second valid acceptance. Acceptance: A-10.
- **FR-013**: Malformed, expired, consumed, superseded, revoked, recipient-mismatched, stale-policy, or unauthorized invitations MUST create no membership and MUST NOT be revived by retry, restart, delayed delivery, or local cache. Acceptance: A-07, A-11, A-16.
- **FR-014**: Invitation creation, message delivery, invitation opening, identity verification, acceptance, and active membership MUST be represented as distinct states so no earlier state is reported as a later one. Acceptance: A-03, A-06, A-09, A-12, A-17.
- **FR-015**: Every delivery attempt MUST record a safe independent outcome such as pending, delivered where provider evidence supports that claim, delayed, failed, bounced, rate-limited, or unknown; none of these outcomes MUST imply acceptance. Acceptance: A-12, A-14.
- **FR-016**: Resending MUST create one new current acceptance generation, invalidate all prior acceptance secrets, apply the approved expiry policy, preserve earlier evidence, and create no membership. Acceptance: A-13, A-16.
- **FR-017**: Failed or unknown resend delivery MUST keep all older generations invalid and MUST expose an authorized retry or recipient-correction path without claiming successful delivery. Acceptance: A-13, A-14.
- **FR-018**: Revoking a pending invitation MUST invalidate every current and prior acceptance secret and prevent later membership creation from that invitation. Acceptance: A-15, A-16.
- **FR-019**: Revoking, expiring, or changing invitation history after acceptance MUST NOT remove or alter the resulting membership; membership changes are separate current-authority actions outside F013. Acceptance: A-15, A-19.
- **FR-020**: Stale or concurrent create, resend, revoke, and accept actions MUST compare against current invitation state and MUST NOT overwrite a newer state, restore an obsolete generation, or broaden access. Acceptance: A-05, A-10, A-16.
- **FR-021**: Authorized invitation status views MUST distinguish invitation lifecycle, current expiry, offered access, latest delivery outcome, and membership outcome without displaying raw acceptance secrets. Acceptance: A-12, A-17, A-19.
- **FR-022**: Invitation list, detail, search, count, and evidence access MUST require current workspace authority and MUST reveal no cross-workspace or unauthorized recipient, invitation, membership, delivery, or aggregate information. Acceptance: A-17, A-18.
- **FR-023**: Public, signed-out, wrong-account, malformed, and unauthorized invitation responses MUST minimize account and workspace enumeration while still giving the intended authenticated recipient a safe next action. Acceptance: A-06, A-07, A-11, A-18.
- **FR-024**: Invitation evidence MUST retain safe actor, workspace, intended-recipient reference, offered role/scope summary, lifecycle event, outcome, authoritative time, generation, and correlation information without raw acceptance secrets, reusable credentials, customer content, or hidden tenant data. Acceptance: A-20.
- **FR-025**: Exact production invitation expiry and resend-expiry behavior MUST come from the approved Q-08 policy, be evaluated against authoritative time, and be visible to inviter and intended recipient; device time MUST NOT extend or shorten authority. Acceptance: A-01, A-08, A-11, A-13.
- **FR-026**: User-facing errors MUST distinguish invalid input, online-required, unauthorized action, wrong identity, expired, consumed, superseded, revoked, delivery-failed, rate-limited, unavailable, and outcome-unknown states when the viewer is permitted to know, while naming a safe next action and avoiding hidden-tenant disclosure. Acceptance: A-02, A-07, A-11, A-14, A-16.
- **FR-027**: All F013 states, actions, messages, warnings, errors, confirmations, and evidence summaries MUST provide equivalent English and Arabic meaning, full right-to-left layout, safe mixed-direction rendering, keyboard operation, visible focus, semantic status announcements, contrast, and 200% zoom usability. Acceptance: A-21–A-23.
- **FR-028**: Locale, display formatting, case folding, or presentation normalization MUST NOT change the stable invitation, workspace, verified-recipient, acceptance-generation, membership, role, or scope identities used for authority. Acceptance: A-07, A-09, A-22.

### Scope Boundaries

**In scope**:

- Online creation of recipient-bound invitations for the active workspace by currently authorized members.
- Explicit offered role, scope, and configured expiry, using whatever policy F014/Q-05 later approves rather than defining that policy here.
- Existing-account and not-yet-signed-in recipient journeys through verified identity matching.
- Single-use online acceptance and exactly-one membership creation.
- Delivery status separate from invitation, acceptance, and membership status.
- Resend with old-generation invalidation, delivery retry guidance, and revocation of pending invitations.
- Safe invitation status/history for authorized administrators and enumeration-resistant public or unauthorized responses.
- English/Arabic, RTL, keyboard, screen-reader, focus, contrast, and zoom behavior for F013 surfaces and invitation messages.

**Out of scope**:

- Defining or editing role templates, capabilities, project/client grants, financial permissions, final-owner safeguards, ownership transfer, member removal, or membership role changes, owned by F014 and later administration features.
- Workspace creation, profile defaults, or switching behavior owned by F012, except consuming the active workspace and initial owner membership.
- Device enrollment/revocation, offline authorization leases, durable synchronization, conflicts, deletion/rejoin, or settings owned by F015–F021.
- Client contacts, portal guests, shared proposal recipients, billing contacts, or public links; those identities never substitute for workspace membership.
- Offline creation, resend, revoke, or acceptance; locally queued invitation authority is not supported.
- Choosing the production invitation duration, identity-provider alias/change behavior, role matrix, abuse thresholds, email provider, sender domain, email content approval, or delivery service-level promise before Q-02, Q-05, and Q-08 approval.
- Provider provisioning, paid-plan selection, sender configuration, implementation, deployment, external communication, native QA claims, merge, or release.

### Key Entities

- **Workspace Invitation**: The authoritative offer for one intended verified recipient to join one workspace with a specific role/scope snapshot under a configured expiry. It has a stable identity and lifecycle but is not membership.
- **Invitation Acceptance Generation**: The single current, secret-bearing acceptance authority for an invitation. Resend replaces it and invalidates every earlier generation; raw secret material is never shown in ordinary status, evidence, diagnostics, or exports.
- **Intended Recipient Binding**: The stable verified-identity condition that must match at acceptance. User-facing email or account labels help recognition but do not by themselves grant authority.
- **Invitation Delivery Attempt**: One bounded attempt to notify the intended recipient about a particular acceptance generation. Its delivery evidence and outcome are separate from invitation acceptance.
- **Workspace Membership**: The authoritative relationship created once after valid acceptance. It references the verified account, workspace, and accepted access but thereafter has its own lifecycle outside invitation administration.
- **Invitation Evidence**: A redacted history of creation, delivery, resend, opening where recorded, acceptance, expiry, supersession, revocation, denial, and reconciliation for permitted review.

### Lifecycle and State Rules

1. Invitation creation moves from `submitting` to `pending`, `failed`, `cancelled`, or `outcome_unknown`. Only authoritative `pending` has one current acceptance generation; none of these states creates membership.
2. Delivery attempts independently move through `queued`, `delivery_pending`, `delivered` only with sufficient provider evidence, `delayed`, `failed`, `bounced`, `rate_limited`, or `unknown`. Delivery state never changes invitation acceptance by itself.
3. Resend supersedes the prior acceptance generation and creates one new current generation under the approved expiry policy. A delayed older message remains unusable.
4. A pending invitation can become `accepted`, `expired`, `revoked`, or `superseded`. Those terminal outcomes are mutually exclusive for acceptance authority and cannot return to pending through retry.
5. Acceptance binds the current generation, intended verified identity, workspace, offered access, policy revision, and authoritative time. Its commit creates or returns one membership and consumes the invitation as one outcome.
6. An outcome-unknown create, resend, revoke, or accept action must reconcile against current authoritative state before another action can replace it.
7. After acceptance, the membership is independent of delivery and invitation administration. Removing or changing it requires a separately authorized membership action owned outside F013.

### Dependencies and Entry Gates

- F012 supplies the immutable active workspace, safe workspace context, and initial owner membership. F013 never uses a display name or remembered workspace preference as authority.
- F010/F011 supply verified identity, trusted online sign-in, session, and approved recovery/MFA policy. An invitation secret never replaces their identity proof.
- F008/F009 supply tenant isolation, current server authority, one-effect command processing, reconciliation, and redacted evidence foundations reached through earlier P01 work.
- F005 supplies the bilingual accessible shell and safe focus, right-to-left, and mixed-direction behavior inherited by native F013 surfaces.
- Q-05 and F014 must approve production role templates, grant boundaries, and who may assign each access profile. F013 records and revalidates an approved role/scope offer without defining or broadening it.
- Q-08 must approve production invitation expiry and relevant verified-identity behavior. No provisional number is treated as confirmed.
- Q-02 and verified sender/provider readiness must be satisfied before public invitation delivery is promised. Controlled synthetic recipients may be used for specification acceptance without implying public delivery readiness.
- Provider quotas and anti-abuse controls must bound invitation and delivery attempts without revealing account existence or silently discarding an accepted administrative action.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In 100% of valid invitation-creation tests, one accepted intent produces exactly one pending invitation, one current acceptance generation, and zero memberships before acceptance.
- **SC-002**: In 100% of duplicate, concurrent, interrupted, timed-out, retried, and outcome-unknown creation tests, no parallel valid acceptance paths or duplicate invitation records are exposed for the same intent.
- **SC-003**: In 100% of successful acceptance tests, exactly one membership is created for the intended verified identity with the reviewed workspace, role, and scope, and the invitation cannot be accepted again.
- **SC-004**: Across malformed, expired, consumed, superseded, revoked, wrong-identity, stale-policy, offline, and unauthorized acceptance tests, zero memberships or broadened grants result.
- **SC-005**: In 100% of concurrent and response-loss acceptance tests, all participants converge on one invitation outcome and at most one membership without manual duplicate cleanup.
- **SC-006**: In 100% of resend tests, every earlier acceptance generation becomes unusable before the new generation can be accepted; failed or delayed delivery never revives an older generation.
- **SC-007**: In 100% of revocation tests completed before acceptance, all outstanding acceptance paths fail and membership count remains unchanged.
- **SC-008**: In 100% of tested delivery outcomes, creation, send attempt, provider-supported delivery, opening, acceptance, and active membership are reported separately with no false claim that a delivered message was accepted.
- **SC-009**: Across unauthorized list, detail, search, count, malformed-secret, signed-out, and wrong-account tests, zero hidden workspace names, recipient details, invitation records, membership facts, or aggregates are disclosed.
- **SC-010**: Automated secret scans and inspected acceptance artifacts find zero raw invitation secrets or reusable credentials in status views, logs, audit text, diagnostics, analytics, crash artifacts, exports, or support bundles.
- **SC-011**: At least 90% of authorized first-time participants create a valid invitation with the intended recipient, role/scope, and expiry understood in under two minutes without assistance, measured separately in English and Arabic and excluding provider-controlled delivery time.
- **SC-012**: At least 90% of intended recipients with a valid current invitation accept it in under two minutes without assistance and correctly identify the workspace and offered access before confirmation, measured separately in English and Arabic and excluding sign-in or provider outage time.
- **SC-013**: At least 95% of authorized participants correctly distinguish pending, delivery-failed, accepted, expired, superseded, and revoked states and select the safe next action in representative scenarios.
- **SC-014**: 100% of F013 states and actions pass English/Arabic meaning parity, right-to-left and mixed-direction review, keyboard navigation, focus visibility, semantic status announcement, contrast, and 200% zoom checks with no blocking defect.

## Assumptions

- F013 is a documentation feature in this request. It does not authorize implementation, provider or sender configuration, provisioning, delivery to real recipients, deployment, native QA claims, merge, or release.
- The exact production invitation lifetime and resend-expiry behavior remain Q-08 decisions. The feature is specified against a configured approved policy so planning can proceed without inventing a duration.
- The final role and scope matrix remains Q-05/F014 work. F013 carries an explicit approved role/scope offer and prevents escalation; it does not define templates or detailed grants.
- One pending invitation per workspace and intended recipient is the smallest complete model. Repeated delivery uses resend and generation invalidation rather than parallel valid invitations.
- Invitation administration and acceptance require connectivity because workspace membership is cloud-authoritative. Offline users may read previously retained non-secret status only where already authorized, but cannot queue an invitation authority change.
- A recipient who does not yet have a current session uses the existing approved identity flow. Invitation acceptance does not create a second identity system or embed credential collection in the desktop application.
- Provider evidence may prove submission or delivery only to the level the selected provider actually supports. The product never equates delivery with human receipt, identity proof, acceptance, or active membership.
- Accepted membership persists independently from the invitation. Later role changes, member removal, ownership transfer, and final-owner protection belong to F014 and related administration flows.
- Public email invitations remain blocked until an approved sender/provider, domain, abuse controls, quota behavior, and delivery evidence are ready; synthetic or controlled channels may support planning and acceptance work without a public-release claim.
