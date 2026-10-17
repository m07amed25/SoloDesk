# Phased delivery roadmap

Status: full documentation roadmap, 17 October 2026. Only the minimal welcome shell exists. No phase below is marked implemented. Estimates/dates require team capacity, budget, and resolved gates; none are invented here.

## Phase map

| Phase                                            | Outcome                                                                    | Main specifications                                    | Dependency                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| [P00](phases/P00-product-decisions.md)           | Agreed product rules, UX, system boundaries and evidence plan              | Decision register, requirements, screens               | User choices and risk review                        |
| [P01](phases/P01-platform-and-cloud.md)          | Secure desktop, cloud identity/teams, encrypted cache, basic sync/recovery | Platform, security, sync, backend, API, data lifecycle | P00 foundation decisions                            |
| [P02](phases/P02-client-lifecycle.md)            | Clients, CRM, estimates, proposals, agreements, onboarding                 | Client lifecycle                                       | P01; signature/legal gates for connected acceptance |
| [P03](phases/P03-work-management.md)             | Team projects, tasks, dependencies, planning, deliverables                 | Work management                                        | P01/P02 client identities                           |
| [P04](phases/P04-time-and-productivity.md)       | Recoverable time, rates, timesheets, approval and costing                  | Time/productivity                                      | P01/P03                                             |
| [P05](phases/P05-finance.md)                     | Configurable billing, collections, credits, expenses, recurring/retainers  | Finance                                                | P01/P02/P03; P04 for time billing                   |
| [P06](phases/P06-insights-and-knowledge.md)      | Reports, forecasts, knowledge, search, saved views                         | Insights/knowledge                                     | Reliable source domains P02–P05                     |
| [P07](phases/P07-integrations-and-automation.md) | Deterministic rules, provider connections, reconciliation                  | Integrations/automation                                | P01/P05; provider credentials and approval          |
| [P08](phases/P08-client-portal.md)               | Scoped client portal and advanced review/collaboration                     | Sync/collaboration, delivery, client lifecycle         | P01/P02/P03/P05; web auth and publication gates     |
| [P09](phases/P09-release-and-operations.md)      | Supported installers, service operations, recovery and support             | Test strategy, release/support                         | All capabilities included in that release           |

P01 already includes required cloud accounts, roles, multi-device sync and team authorization. P08 does not postpone those fundamentals. English/Arabic, RTL, offline states, security and tests are required in every phase.

## Release slices

**Core pilot:** P00/P01 plus basic client/project/task/time/invoice/payment slices of P02–P05, with real team isolation, encrypted cache, synchronization, English/Arabic and tested recovery. Optional advanced capability switches remain off. Pilot cannot claim the full roadmap is delivered.

**Advanced business release:** extend P02–P06 with commercial pipeline, contractual scope controls, capacity, partial allocations, configured taxes/credits/refunds/retainers/recurrence, advanced reports and knowledge. Each enabled finance profile passes its own fixtures and market review.

**Connected release:** P07 and P08 providers/portal enabled only after their specific authorization, reliability, data-sharing and support gates. AI is excluded.

**Public release gate:** P09 applies before every public release, including the core release; it is not work deferred until after shipping. Expand/contract migrations and compatibility tests accompany each slice.

## Dependency and execution rules

Start with an end-to-end authenticated two-member workspace. Prove local save/outbox/server acknowledgment and revoked-member handling before adding large feature breadth. Establish authoritative transactional commands before issuance/payment/credit workflows. Establish immutable files/snapshots before external publication. Reports consume versioned source definitions; connectors cannot bypass domain services.

A phase may have parallel domain slices after its prerequisites pass. A blocked optional signature/payment provider must not prevent safe manual recording/export. A blocked foundational security or tenant-isolation invariant prevents release. Feature switches are enforced on server and client and never bypass permissions or hide historical data needed for export.

## Common entry and exit gate

Entry: linked requirements, state diagrams, fields, role/offline behavior, errors, acceptance fixtures, unresolved blockers and migration impact are reviewed. Exit: required positive/negative/recovery scenarios pass on target OSs; server and local policies agree; Arabic/RTL and keyboard checks pass; operational/runbook coverage exists; evidence identifies exact build; defects and disabled capabilities are explicit. Documented specifications alone never satisfy an implementation exit gate.

See [coverage register](coverage.md), [acceptance plan](../quality/acceptance.md), and [risk register](risks.md). Each phase file contains its delivery checklist and concrete acceptance examples.
