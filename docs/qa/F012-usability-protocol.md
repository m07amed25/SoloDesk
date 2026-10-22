# F012 Workspace Creation & Safe Switching Usability and Comprehension Protocol

## Objective

Validate success criteria SC-008, SC-009, and SC-010 for feature F012:

- **SC-008**: Participants create a workspace with truthful defaults (starts as `setup_incomplete`, editable settings) within target duration (<= 120 seconds) without confusion regarding compliance or readiness claims.
- **SC-009**: Participants switch workspaces safely; when pending work exists, participants clearly comprehend the source vs target boundary and select stay, discard, or save-to-source without unintentional loss.
- **SC-010**: Bilingual parity: 50% English, 50% Arabic native speakers, with equal comprehension of dynamic names, RTL layout, bidi isolation, and duplicate-name discriminators.

## Target Participant Profile

- **Split**: 12 participants total (6 English primary, 6 Arabic primary).
- **Inclusions**: Freelancers, independent contractors, and solo business owners.
- **Exclusions**: Core SoloDesk engineers or individuals with prior knowledge of F012 internals.
- **Target OS Matrix**: Linux (Ubuntu 24.04), macOS 14+, Windows 11.
- **Outage Exclusions**: Infrastructure outages or network disconnects during a test session pause timing and are excluded from baseline usability metrics.

## Protocol Journeys

### Journey 1: Workspace Creation with Truthful Defaults

1. Participant opens the Create Workspace dialog.
2. Participant enters workspace profile details (name, currency, timezone, locale).
3. Participant observes the truthful notice: workspace starts with `setup_incomplete`.
4. Participant submits and observes immediate activation with truthful setup status.

- **Success Measure**: Completion time <= 120 seconds; participant accurately understands initial setup is incomplete.

### Journey 2: Safe Workspace Switching & Pending Edit Resolution

1. Participant has unsaved changes in current Workspace A.
2. Participant initiates a switch to Workspace B.
3. Participant is presented with the pending switch dialog showing both source (A) and target (B).
4. Participant evaluates the three choices: Stay, Discard & Switch, Save & Switch.
5. Participant selects one choice and observes the result.

- **Success Measure**: Participant correctly identifies which workspace receives saved changes (Workspace A only) and recognizes that Workspace B never receives uncommitted edits from A.

### Journey 3: Duplicate-Name Discrimination & Consequential Confirmation

1. Participant observes two workspaces with the same display name ("Acme Studio").
2. Participant uses the 4-character deterministic discriminator (e.g., `1111` vs `2222`) to select the intended workspace.
3. Participant confirms the target workspace in header utilities and dialog context cues.

- **Success Measure**: 100% of participants correctly distinguish and select the intended workspace without color-only cues.

## Privacy Rules

- No secrets, bearer tokens, passwords, encryption keys, or private filesystem paths may be collected or recorded.
- Only participant ID, locale, timing, error counts, and comprehension responses are recorded.

## Evidence Recording Template

```json
{
  "protocol_version": "f012-v1",
  "participant_id": "P-01",
  "locale": "ar",
  "target_os": "linux",
  "journey": "safe_switch_pending_work",
  "completion_time_seconds": 45,
  "comprehension_score_pct": 100,
  "discriminator_identified": true,
  "unintended_data_loss": false,
  "outcome": "passed",
  "notes": "Arabic bidi isolation ensured name and discriminator maintained correct visual ordering"
}
```

## Governance

This protocol is executed prior to production feature enablement. Results must be committed to `docs/qa/F012.md`.
