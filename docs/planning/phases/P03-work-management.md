# P03 — Projects, tasks and controlled delivery

Status: planned, documentation only; not implemented or verified. [Roadmap](../roadmap.md) owns sequence/release slices. [Decisions](../decisions.md) own unresolved gates.

## Entry prerequisites

P01 workspace/project grants and P02 client identity; templates may start with simple projects.

## Delivery checklist

- [ ] Core: project lifecycle, task/subtask/checklists, assignees, semantic statuses, priorities, dates, list/Kanban filters and archive.
- [ ] Advanced: dependencies/milestones, timeline/calendar, cycles/recurrence, capacity/leave, templates/custom fields and bulk edits.
- [ ] Version scope/budget baselines and change requests; apply only exact approved changes.
- [ ] Provide comments/mentions, files/notes, internal review and exact-version deliverable publication/acceptance.
- [ ] Support portfolio health/risk/decisions and project handover with private cost permissions.

## Deliverables

Team delivery workspace with traceable agreed scope, ownership and review evidence.

## Acceptance and exit evidence

- [ ] Cycle/hierarchy/dependency violations fail consistently in UI/import/sync.
- [ ] Same-field concurrent edits preserve candidates; merged independent edits retain audit.
- [ ] A new deliverable version does not inherit a prior client approval silently.
- [ ] Moving/archiving a task cannot break allocated time or hide recoverable timers.
- [ ] Kanban drag has keyboard alternative; Arabic/RTL view and bulk-error handling pass.

Every checkbox requires an implementation artifact/test result tied to exact build, OS, dataset and policy version. Documents alone do not check it. English/Arabic, access control, offline/online state and recovery apply to all included behavior.

## Complex decisions and risks

Q-05/14: role/approval templates, capacity calendars, task limits and private rate visibility.

## Specification links

- [work-management](../../specs/work-management.md)
- [screens](../../product/screens.md)
