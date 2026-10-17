# P05 — Billing, collections and commercial finances

Status: planned, documentation only; not implemented or verified. [Roadmap](../roadmap.md) owns sequence/release slices. [Decisions](../decisions.md) own unresolved gates.

## Entry prerequisites

P01 online authority/idempotency/audit and P02/P03 parties/projects; P04 for time-source invoicing.

## Delivery checklist

- [ ] Core: draft/edit/preview/issue, immutable seller/client/line snapshots, numbers, bilingual PDF export, delivery recording and manual payments.
- [ ] Advanced configurable money: tax/discount profiles, currencies/FX, partial/multiple settlements, credits/refunds/reversals, deposits, write-offs and disputes.
- [ ] Advanced agreements: retainers/service allowances, subscriptions, recurring drafts, milestone schedules and explicit proration/rollover.
- [ ] Expenses/receipts/approvals, project splits, at-cost/markup reimbursement, bank CSV matching and accounting export.
- [ ] Enforce source reservations/allocations, credit entitlements, unknown-outcome reconciliation and restore/number safety.

## Deliverables

Client-to-payment/credit/expense workflows with exact calculations and market-gated document profiles.

## Acceptance and exit evidence

- [ ] Issuance is online and atomically commits number/snapshot/source ownership/audit/receipt.
- [ ] Lost response/double-click/reordered payment event creates no second effect.
- [ ] Partial credit/refund/payment chains satisfy balance/conservation fixtures.
- [ ] Client/rate/tax/template changes cannot alter issued values; no automatic source rebilling after refund.
- [ ] English/Arabic multipage PDFs match exact saved snapshot and omit private costs.
- [ ] Recurring/subscription month-end/DST/retry produces one occurrence and explicit adjustments.

Every checkbox requires an implementation artifact/test result tied to exact build, OS, dataset and policy version. Documents alone do not check it. English/Arabic, access control, offline/online state and recovery apply to all included behavior.

## Complex decisions and risks

Q-01/03/05/09/15: jurisdictions, number/tax/rounding policies, approvals, providers and historic balances. Unvalidated profiles remain disabled.

## Specification links

- [finance](../../specs/finance.md)
- [data-model](../../architecture/data-model.md)
- [api-contracts](../../architecture/api-contracts.md)
