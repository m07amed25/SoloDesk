# P06 — Business visibility, knowledge and search

Status: planned, documentation only; not implemented or verified. [Roadmap](../roadmap.md) owns sequence/release slices. [Decisions](../decisions.md) own unresolved gates.

## Entry prerequisites

Accepted P02–P05 sources with current permission-aware query projections and local cache status.

## Delivery checklist

- [ ] Create actionable personal/shared dashboards, saved filters and versioned report definitions.
- [ ] Implement net invoiced versus collected revenue, aging, margin, cost/rates, utilization, capacity and explicit scenario forecasts.
- [ ] Support currency-grouped reports and explicit FX valuation; label incomplete/missing data.
- [ ] Provide safe knowledge notes/snippets/revisions/templates and permission-aware English/Arabic global search.
- [ ] Export reproducible report snapshots with drill-down, formula/version/as-of metadata and sensitive-field preview.

## Deliverables

Explainable business answers linked to source records, with no AI and no invented financial figures.

## Acceptance and exit evidence

- [ ] Aging buckets reconcile exactly to outstanding balance.
- [ ] No unlike-currency sum, fake zero denominator or missing-cost-as-zero margin.
- [ ] Permission downgrade removes restricted snippets/counts/exports as well as pages.
- [ ] Offline reports label cached coverage; Arabic search preserves original text.
- [ ] A report stays reproducible after its definition/default rates change.

Every checkbox requires an implementation artifact/test result tied to exact build, OS, dataset and policy version. Documents alone do not check it. English/Arabic, access control, offline/online state and recovery apply to all included behavior.

## Complex decisions and risks

Q-14: reporting basis, capacity/FX policy and cost visibility; scheduled sending depends on P07.

## Specification links

- [insights-and-knowledge](../../specs/insights-and-knowledge.md)
- [finance](../../specs/finance.md)
