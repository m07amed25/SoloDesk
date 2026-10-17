# P01 — Secure desktop, cloud and team foundation

Status: planned, documentation only; not implemented or verified. [Roadmap](../roadmap.md) owns sequence/release slices. [Decisions](../decisions.md) own unresolved gates.

## Entry prerequisites

P00 foundation decisions; recommended low-cost backend and encrypted-cache compatibility proof plan.

## Delivery checklist

- [ ] Extend desktop lifecycle, single-instance handling, narrow preload/IPC, background-job boundaries and protected external/deep links.
- [ ] Provide the separate bilingual hosted browser sign-in/recovery page and validated native callback; no remote executable content loads in the Electron renderer.
- [ ] Add required account enrollment, sessions/MFA/recovery, workspaces/invitations/roles/grants and device revoke.
- [ ] Prove encrypted cache/attachments/index/outbox, secure key wrapping, lock/unlock and no plaintext fallback on Linux.
- [ ] Deliver basic push/pull sync, idempotency receipts, cursor/revision handling, conflict inbox, tombstones and permission changes.
- [ ] Provide settings, notification center, English/Arabic/RTL, keyboard shell/search foundations, import/export/backup manifests and isolated restore.
- [ ] Create cloud tenant policies, migrations, restricted command entry points, logs/redaction, quota alerts and free-tier outage states.

## Deliverables

A two-member, two-device authenticated workspace that saves offline, recovers and synchronizes safely; foundation test evidence.

## Acceptance and exit evidence

- [ ] A user cannot read/write another tenant via API/IPC/search/export/files/subscriptions.
- [ ] A revoked offline member cannot commit queued changes; local recoverable content is handled by policy.
- [ ] Kill/restart during local transaction/pull/migration preserves data and cursor integrity.
- [ ] Missing key store fails closed; recovered backup cannot restore old credentials or numbering.
- [ ] English/Arabic core shell works with keyboard and native window controls on each supported OS.

Every checkbox requires an implementation artifact/test result tied to exact build, OS, dataset and policy version. Documents alone do not check it. English/Arabic, access control, offline/online state and recovery apply to all included behavior.

## Complex decisions and risks

Q-02/06/07/08/11/13/16: hosting/residency, offline duration, keys, auth, OSs, retention and operations.

## Specification links

- [platform-and-workspaces](../../specs/platform-and-workspaces.md)
- [backend-stack](../../architecture/backend-stack.md)
- [sync-and-collaboration](../../architecture/sync-and-collaboration.md)
- [security-and-privacy](../../architecture/security-and-privacy.md)
