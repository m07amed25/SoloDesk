# F013 Member Invitations Usability and Comprehension Protocol

## Objective

Validate success criteria SC-011, SC-012, SC-013, and SC-014 for feature F013 (Member Invitations):

- **SC-011 (Invitation Creation & Dispatch Comprehension)**: Participants create member invitations with bounded roles and explicit consequence notices within target duration (<= 90 seconds) without confusion regarding delivery versus acceptance.
- **SC-012 (State Distinction & Delivery Truth)**: Participants correctly distinguish between `queued`, `delivered`, `failed`, `unknown`, `accepted`, `revoked`, and `expired` statuses; participants understand that resending invalidates all earlier acceptance links and revoke permanently cancels access.
- **SC-013 (Hosted Redemption & Identity Binding)**: Recipients review invitation details (workspace, role, consequence, expiry) and accept into the correct authenticated account; wrong-account warnings prompt account switching without unintended membership creation.
- **SC-014 (Bilingual Parity & Accessibility)**: 50% English, 50% Arabic native speakers, with equal comprehension across native desktop shell, hosted redemption web UI, and email notification messages. Correct RTL layout, bidi text isolation, non-color semantic cues, keyboard navigation, and 200% zoom reflow.

## Target Participant Profile & Environment

- **Split**: 12 participants total (6 English primary, 6 Arabic primary).
- **Assistive Technology Matrix**:
  - Desktop Screen Readers: NVDA (Windows), VoiceOver (macOS), Orca (Linux).
  - High Contrast / Zoom: 200% text zoom and OS forced colors mode.
  - Keyboard-only navigation (zero mouse/touch pointer input).
- **Target OS Matrix**: Linux (Ubuntu 24.04), macOS 14+, Windows 11.
- **Inclusions**: Freelancers, small agency owners, and independent collaborators.
- **Exclusions**: Core SoloDesk developers, authors of F013, or individuals with foreknowledge of invitation security mechanics.
- **Outage Exclusions**: External IdP outages or synthetic provider simulated disconnects pause timing and are excluded from baseline usability metrics.

## Protocol Journeys

### Journey 1: Create Invitation with Role Consequence & Bidi Isolation

1. Administrator opens the Invite Member dialog.
2. Administrator enters recipient email address (including mixed Latin/Arabic usernames).
3. Administrator reviews available roles and consequences (`member_standard` vs `read_only`).
4. Administrator observes the truthful notice: invitation dispatches a single attempt and remains pending until accepted.
5. Administrator submits and verifies immediate appearance in the invitation status list.

- **Success Measure**: Completion time <= 90 seconds; 100% comprehension that invitation creation does not grant immediate membership.

### Journey 2: Resend Rotation & Revoke Invalidation Comprehension

1. Administrator reviews an existing pending invitation in the invitation status list.
2. Administrator triggers the "Resend Invitation" action and reads the consequential warning notice.
3. Administrator confirms resend and verifies rotation (new generation, earlier links permanently invalidated).
4. Administrator triggers "Revoke Invitation" on another pending invitation, reads the permanent invalidation warning, and confirms.
5. Administrator verifies terminal state (`revoked`) with mutations disabled.

- **Success Measure**: Participant accurately explains that older links cannot be used after resend, and revoked invitations cannot be restored.

### Journey 3: State Distinction & Delivery Recovery

1. Administrator is presented with an invitation list containing mixed statuses: `delivered`, `queued`, `failed`, `unknown`, `accepted`, and `expired`.
2. Participant completes the State-Distinction Task: correctly classifies which invitations are active, which require delivery reconciliation, and which are terminal.
3. For a `failed` or `unknown` delivery, administrator identifies and executes the recovery action (Reconcile / Refresh).

- **Success Measure**: >= 95% accuracy on state-distinction task; participant clearly understands provider delivery failure does not cancel invitation authority.

### Journey 4: Hosted Redemption & Account Binding

1. Invitee opens invitation URL in browser (hash fragment scrubbed immediately from address bar).
2. Invitee signs in with their identity provider account.
3. Invitee reviews the authoritative invitation summary (workspace name, assigned role, consequence, 7-day expiration).
4. Scenario A: Authenticated user matches intended recipient -> Invitee clicks Confirm and accepts into the workspace.
5. Scenario B: Authenticated user is a different identity -> Invitee observes Wrong Account notice and executes Switch Account.

- **Success Measure**: Invitee successfully binds membership to intended identity; 0% accidental cross-account redemption.

## Privacy Rules

- Zero secrets, raw selectors, hash fragments, continuation tokens, bearer JWTs, or encryption keys are logged or recorded in test artifacts.
- Only participant ID, locale, assistive technology used, journey timing, comprehension responses, and pass/fail indicators are recorded.

## Evidence Recording Template

```json
{
  "protocol_version": "f013-v1",
  "participant_id": "P-01",
  "locale": "ar",
  "assistive_tech": "NVDA",
  "target_os": "windows",
  "journey": "resend_rotation_comprehension",
  "completion_time_seconds": 52,
  "comprehension_score_pct": 100,
  "state_distinction_accuracy_pct": 100,
  "bidi_isolation_intact": true,
  "secret_disclosure_detected": false,
  "outcome": "passed",
  "notes": "Arabic participant correctly identified that resend invalidated earlier generation link without confusion."
}
```

## Governance

This protocol must be executed prior to production release approval under Q-02 and Q-08. Usability and comprehension evidence must be committed to `docs/qa/F013.md`.
