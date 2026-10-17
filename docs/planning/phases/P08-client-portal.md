# P08 — Client portal and external review

Status: planned, documentation only; not implemented or verified. [Roadmap](../roadmap.md) owns sequence/release slices. [Decisions](../decisions.md) own unresolved gates.

## Entry prerequisites

P01 cloud/team baseline, P02 commercial versions, P03 deliverables and P05 invoice snapshots; portal-specific identity policy.

## Delivery checklist

- [ ] Build separately deployed English/Arabic RTL portal with scoped client identity or approved expiring verified links.
- [ ] Publish exact selected proposal/contract/deliverable/invoice versions and attachments, keeping internal drafts/private data out.
- [ ] Support exact-version comments/approvals/change requests and permission-aware notification/report sharing.
- [ ] Optional hosted payment links/signatures use P07 provider verification and market/evidence gates.
- [ ] Revoke guest/link access, expire downloads, retain decision provenance and support version disputes.

## Deliverables

A client can review only deliberately published work and provide traceable responses.

## Acceptance and exit evidence

- [ ] Client A cannot access Client B via IDs/search/counts/files or expired links.
- [ ] A new internal draft is invisible until separately published.
- [ ] Two acceptance clicks have one effect; stale/withdrawn version response is reviewed, not silently accepted.
- [ ] Revocation denies future service access without claiming recall of prior downloads.
- [ ] Portal keyboards/screen readers/RTL and multipage documents pass.

Every checkbox requires an implementation artifact/test result tied to exact build, OS, dataset and policy version. Documents alone do not check it. English/Arabic, access control, offline/online state and recovery apply to all included behavior.

## Complex decisions and risks

Q-01/10/16: evidence/signature, guest identity, sharing expiry/retention, hosting region and support.

## Specification links

- [sync-and-collaboration](../../architecture/sync-and-collaboration.md)
- [client-lifecycle](../../specs/client-lifecycle.md)
- [work-management](../../specs/work-management.md)
