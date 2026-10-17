# P04 — Time evidence, rates and review

Status: planned, documentation only; not implemented or verified. [Roadmap](../roadmap.md) owns sequence/release slices. [Decisions](../decisions.md) own unresolved gates.

## Entry prerequisites

P01 durable encrypted local capture/sync and P03 project/task identities; financial policies coordinated with P05.

## Delivery checklist

- [ ] Core: persistent start/pause/resume/switch/stop, manual entries, description/billable flags and visible timer.
- [ ] Recover checkpoints after crash/sleep/clock anomalies; let users review uncertain intervals.
- [ ] Add dated selling/cost rates, exact seconds, eligibility/overlap rules, split/merge and allocation locks.
- [ ] Advanced: timesheets/submission/review, productivity/focus preferences, estimates/budgets, filters, utilization and imports.
- [ ] Reconcile concurrent-device capture rather than asserting impossible global offline exclusivity.

## Deliverables

Recoverable work evidence and a reviewed billable-source contract for finance.

## Acceptance and exit evidence

- [ ] Duplicate stop/retry yields one entry; switch saves old and starts new atomically.
- [ ] DST/midnight/report bucket seconds sum exactly to original duration.
- [ ] Sleep/clock jumps produce review, not silent billable time.
- [ ] Cost rates stay private; default rate changes do not rewrite billed work.
- [ ] Partial-source allocations conserve seconds and reject overlaps.

Every checkbox requires an implementation artifact/test result tied to exact build, OS, dataset and policy version. Documents alone do not check it. English/Arabic, access control, offline/online state and recovery apply to all included behavior.

## Complex decisions and risks

Q-03/04/05: rounding, idle/sleep defaults, approval policy, rate precedence and snapshot timing.

## Specification links

- [time-and-productivity](../../specs/time-and-productivity.md)
- [finance](../../specs/finance.md)
