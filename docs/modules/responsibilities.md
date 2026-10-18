# Module ownership and dependency boundaries

All modules are proposed. Only the welcome shell and tooling exist. A module owns authoritative rules, events and contracts; projections/connector copies cannot rewrite those facts.

| Module                      | Owns                                                                                                         | Dependencies / prohibited shortcuts                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Identity/workspaces/policy  | Accounts, membership, grants, devices, lease, reauth                                                         | Identity provider + server current policy; UI claims never grant access        |
| Client/commercial           | Clients/contacts/opportunities/catalog/proposals/agreement evidence                                          | Financial calculation contract; never rewrite issued snapshots                 |
| Delivery                    | Projects/tasks/graphs/capacity/baselines/change requests/deliverables                                        | Client IDs, member grants, approved file/version contracts                     |
| Time                        | Capture/review/overlap/rates/approvals                                                                       | Delivery identities; financial eligibility contract prevents allocated edits   |
| Finance                     | Documents, exact policies, numbers, allocations, settlement/credits/refunds/expenses/retainers/subscriptions | Accepted parties/time/expense source contracts; server transaction owns commit |
| Knowledge/files             | Safe notes/revisions/attachments/publication references                                                      | Tenant/object grants, blob adapter; no executable uploaded content             |
| Insights/search             | Read projections, formula definitions, filters, snapshots                                                    | Source facts + current authorization; no separate editable balance totals      |
| Sync                        | Outbox/pull/receipts/cursors/conflicts/tombstones/rejoin                                                     | Versioned domain commands; cannot bypass domain finance or permissions         |
| Integration/jobs/rules      | Provider tokens/scopes, callbacks, schedule/lease/retry/evidence                                             | Domain commands + current actor/rule authority; no direct money-table writes   |
| Portal/publication          | Published projections/guest identity/review evidence                                                         | Exact versions and scoped domain commands, not internal serializers            |
| Recovery/import/export      | Manifests/staging/validation/portable formats                                                                | Integrity/authorization contracts; no stale cloud overwrite                    |
| Platform/release/operations | Native lifecycle, IPC/security, signing/update, monitoring/runbooks                                          | Protected keys/config; cannot silently expose arbitrary shell/filesystem       |

## Application services and events

Use cases coordinate domain rules and transaction adapters; pure domain modules do not import each other's infrastructure. Finance reads approved source revisions through ports and owns consumption records. Time queries allocation eligibility through an application contract, avoiding circular domain imports. Server composes authority; desktop composes capture/cache, not a duplicate finance authority.

Accepted events carry workspace/actor/operation/entity/revision/schema/commit metadata and minimal permitted payload. Representative events: client archived, proposal accepted, scope change applied, timer entry reviewed, invoice issued, payment posted, credit issued, member revoked, attachment verified. Domain events do not automatically authorize email/payment actions; enabled rules evaluate them with current grants. Projection failures rebuild from accepted data; they cannot cause duplicate source writes.

## Dependency rule

Domain → pure types/policies only. Application → domain + ports. Adapters → application ports. Renderer → typed bridge/contracts. Server → application/domain/adapters. Shared contracts contain serializable shapes and stable errors, not secret keys or general-purpose privileged methods. Provider adapters and UI components never become a second owner of finance/security logic.

## F003 implementation — 18 October 2026

F003 owns implemented pure primitives, transport bounds/version/intent/error contracts and draft paired localization. Domain imports only domain; contracts may import domain; localization may import contracts. Test doubles and runtime/setup tools live outside packages. Trusted registration/resolution/authorization/effects belong to future composition boundaries; the shell exposes none. See [F003](../features/F003.md).
