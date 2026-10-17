# Client lifecycle specification

Status: **proposed requirements, documentation only**. Updated 17 October 2026. No business behavior in this document is implemented or approved merely by being specified.

This specification covers the commercial journey from first contact to an accepted engagement and repeat work. Delivery behavior belongs to [work management](work-management.md); financial calculations and financial records must follow the finance specification. Phase commitments and unresolved choices are controlled by the [roadmap](../planning/roadmap.md) and [decision register](../planning/decisions.md).

## Scope, actors, and shared rules

The confirmed baseline supports freelancers and small teams in managed-cloud workspaces with required accounts and offline support. `Owner` below means the workspace owner or a member explicitly granted the corresponding capability; this is not a local-only operator model. Role/project/client scopes follow the platform specification. Contacts are business records, not automatically application accounts. Manual recording of a client response is an assertion with evidence, not authenticated client acceptance. Client reviewers are separately scoped P08 portal actors.

All mutable records have a stable ID, created/updated timestamps, and revision for conflict detection. Archive is a separate, reversible property; it does not erase lifecycle state or unlink history. Read-only historic snapshots preserve the exact client, content, amounts, and terms used at the time. Documents and currency values must not be silently rewritten when a contact, rate, address, or template changes.

An editor must distinguish unsaved changes, saving, saved, validation failure, and storage failure. A failed transaction leaves the previous persisted version intact and retains unsaved input. Local actions must work offline; external delivery, signatures, and portal responses are gated connected capabilities. No external message, calendar invitation, or payment request is sent as a side effect of editing a record.

Default sharing classification is `Internal`. An owner must explicitly select a recipient and preview the client-visible content before export or connected sharing. Internal notes, cost rates, profitability, other clients, and credentials are never implicitly included.

## Capability and dependency map

| Requirement | Capability | Delivery grouping | Prerequisites |
| --- | --- | --- | --- |
| CRM-001 | Clients and contacts | Core workspace | Persistence, audit, search |
| CRM-002 | Opportunity pipeline and forecast | Commercial lifecycle | Clients, money representation |
| CRM-003 | Relationship activities and follow-ups | Commercial lifecycle | Clients, local reminders |
| CRM-004 | Service catalog and estimates | Commercial lifecycle | Rate policy and financial calculation decisions |
| CRM-005 | Versioned proposals | Commercial lifecycle | Estimates, document export |
| CRM-006 | Proposal decisions and acceptance evidence | Commercial lifecycle; connected signatures later | Immutable versions; identity choice for connected actions |
| CRM-007 | Contracts and statements of work | Commercial lifecycle | Versioned documents; jurisdiction and signature decisions |
| CRM-008 | Client onboarding and access checklist | Delivery operations | Templates, attachments, task management |
| CRM-009 | Engagement handoff and loss/reopen | Commercial lifecycle | Accepted snapshot, projects, deduplication |
| CRM-010 | Renewals and relationship health | Advanced business operations | Engagement dates, billing summaries, delivery signals |
| CRM-011 | Client portal (P08) | P08 connected expansion | Identity, hosting, sync, authorization and revocation decisions |

Delivery groupings describe dependencies; the roadmap owns the numbered phase assignments. A deferred connected capability must not prevent the corresponding manual local workflow.

## CRM-001 — Clients, contacts, and relationship integrity

**Actors and permissions.** Owner can create, edit, archive, restore, merge, and export. In a team workspace, only members with client-management permission may edit or merge; project-only members see the minimum client fields needed for assigned work. A client reviewer sees only their explicitly published profile and engagement records.

**Fields.** Client: display name, legal/billing name, organization or individual type, website, billing addresses, country, optional registration/tax identifiers, preferred currency, locale, timezone, payment-term preference, tags, internal notes, owner, and archive state. Contact: name, role, email, telephone, preferred channel, timezone, active state, and relationship to one or more client records. Relationship fields indicate primary billing contact, delivery contact, and decision maker. Contact preferences and provenance may be recorded without asserting legal consent.

**Flow and states.** Create a client with a nonblank display name; add optional contacts; choose billing and delivery contacts; use the client in opportunities and projects. Contact state is Active or Inactive. Archived clients remain searchable through an explicit archive filter. Archiving requires resolution of active work or an explicit acknowledgment of the affected projects, timers, drafts, and future reminders; it does not alter those records.

**Validation and recovery.** Duplicate detection suggests matches by normalized name, email, or registration identifier but never automatically merges. Multiple clients can share a contact or email address. Email formatting is checked without claiming deliverability. A referenced client/contact cannot be hard-deleted. A merge previews field conflicts and affected links, selects a surviving ID, records an alias from the old ID, and commits atomically. Issued invoices, accepted proposals, and signed-document snapshots retain their original identity content. Merge reversal is not promised: require a backup or reversible link journal before enabling this action.

**Acceptance examples.** Renaming “Acme” to “Acme Ltd” updates active pickers while an old issued invoice still says “Acme.” Two clients with the same display name remain separate and are disambiguated by contact/organization. If a merge save fails, both original clients and all relationships remain intact.

## CRM-002 — Opportunities, pipeline, and weighted forecast

**Actors and permissions.** Owner manages the pipeline. Sales permission allows opportunity edits; financial estimates and forecast totals require financial visibility. A client never sees another opportunity or internal probability.

**Fields.** Client or unqualified lead name, opportunity title, source, problem/outcome, estimated amount or range, currency, confidence/probability, stage, expected decision date, expected work window, next action and due date, proposed services, linked contacts, competitors if supplied, loss reason, owner, and history. Probability is an explicit user-controlled assumption or a visible stage default, not a prediction certified by the app.

**Flow and states.** Proposed stages: New → Qualified → Discovery → Proposal → Negotiation → Won or Lost. Any open stage can move to On hold; resuming requires an open stage. Won requires an accepted engagement reference or an explicit manual-win reason. Lost requires a reason category with optional notes. Reopening records the old outcome and the new cycle rather than removing history. Custom stage configuration must map every stage to an open/on-hold/won/lost semantic category.

**Validation and recovery.** Amount and currency are required for monetary forecasting but not to save an unqualified lead. Probabilities are 0–100%; ranges have nonnegative bounds with lower ≤ upper. Weighted value is amount × probability, displayed as a forecast separately from contracted revenue and cash. Different currencies remain separate unless a user-selected reporting conversion policy is approved. Missing amounts/dates appear as “not estimated” and are counted explicitly. Stage drag operations validate exactly like form changes and revert visually on failed save. Archiving an opportunity does not cancel a proposal or project.

**Acceptance examples.** A USD 10,000 opportunity at 40% contributes USD 4,000 to weighted open forecast and zero to recognized revenue or payments. Moving it to Lost removes it from open forecast while retaining its proposal. Offline board changes survive restart without being reported as a message to the client.

## CRM-003 — Activity timeline, follow-ups, and communication records

**Actors and permissions.** Owner logs activities and creates reminders. Team visibility follows the linked client/project; private notes require separate ownership. Client reviewers cannot read internal activities.

**Fields.** Activity type (call, meeting, email summary, note, follow-up), client/contact, optional opportunity/project, occurred-at timestamp or scheduled interval, timezone, subject, summary, outcome, next action, reminder, attachments, and provenance (`manual`, `import`, or named connector). Imported external message IDs are deduplication keys, not permission grants.

**Flow and states.** A follow-up transitions Scheduled → Completed, Snoozed, or Cancelled. Snooze records the old date and creates a new due date without duplicating the task. A completed activity is an immutable event with a correction trail; future activity details remain editable. At completion, the owner may explicitly create a next follow-up. Overdue is derived from due time and unresolved state.

**Validation and recovery.** Require a subject and a valid linked record. Date-only reminders use a configured local reminder time and show the timezone. A passed reminder while the app was closed produces one catch-up notification, not repeated historical notifications. Notification denial leaves an in-app badge and explanation. Logging an email must not imply it was sent or delivered. Connector failure keeps the manual record usable and exposes the last successful sync plus pending errors. Duplicate imports update their linked item only after conflict review; they do not create repeated contact history.

**Acceptance examples.** Completing a follow-up removes its overdue badge and preserves its original due date in history. A reminder crossed during a laptop shutdown appears once on restart. “Log email” creates a timeline entry without sending any network message.

## CRM-004 — Service catalog, estimates, and scenario comparison

**Actors and permissions.** Owner creates estimates and reusable services. Team members may estimate only when granted commercial permission; internal cost assumptions require financial permission. Client output includes only explicitly selected estimate fields.

**Fields.** Service catalog item: code, title, description, unit, default quantity, selling rate, currency, optional effort/cost assumption, active state, and revision. Estimate: client/opportunity, currency, validity date, version, scope assumptions, exclusions, dependencies, line items, optional alternative/optional lines, estimated effort, contingency, payment schedule proposal, and linked source catalog revisions. Each line has quantity, unit, amount, and pricing basis (hourly, fixed, unit, or milestone). Tax/discount handling must use the finance policy and jurisdiction decisions; unsupported rules must block issuance rather than be guessed.

**Flow and states.** Draft → Ready for proposal → Superseded or Archived. Create a draft from catalog items or manual lines, compare explicit scenarios, select one, and embed its snapshot in a proposal revision. Catalog changes can refresh a draft only after a visible before/after preview. Embedded or accepted estimates are frozen. Scenario comparison distinguishes price, estimated hours, margin assumptions, and delivery range.

**Validation and recovery.** One currency per estimate; consistent units; no floating-point monetary arithmetic; no negative selling quantities unless a defined adjustment type supports them. Optional alternatives must not be counted together in the accepted total. Missing cost assumptions produce “margin unavailable,” never zero cost. An estimate is not an invoice, a receivable, or authorization to bill. A zero-cost complimentary line is valid with explicit labeling. Deleting a catalog item with history archives it; snapshots remain valid.

**Acceptance examples.** A proposal using ten hours at USD 100 remains USD 1,000 after the catalog rate becomes USD 120. Selecting alternative B removes alternative A from the selected total. A failed recalculation leaves the prior saved draft and surfaces which policy/field is invalid.

## CRM-005 — Proposals, document revisions, and sharing

**Actors and permissions.** Owner authors and exports. Authorized proposal authors can edit drafts; only a designated approver can mark a revision ready for external sharing. Client access is limited to a particular published version.

**Fields.** Proposal ID and display number, client/opportunity, version, title, objectives, scope and exclusions, deliverables, assumptions, dependencies, timeline, commercial estimate snapshot, payment/acceptance terms, validity date, owner, issue timestamp, and attachment references. Internal notes and cost assumptions remain separate from export content.

**Flow and states.** Draft → Ready → Shared → Accepted, Rejected, Expired, Withdrawn, or Superseded. Marking Shared records the method, recipient, timestamp, and exact revision; manual PDF export alone is `Exported`, not proof of sharing. After first sharing, any content change creates a new draft revision. The previous revision remains retrievable and may be explicitly superseded when the new version is shared. One opportunity can have alternatives, but acceptance must identify a single version and selected options.

**Validation and recovery.** Ready requires a client, currency/price or clearly labeled nonpriced discovery scope, validity policy, and complete required sections. Version identifiers are unique within a proposal and never reused. Export must render from the saved snapshot, include version and issue metadata, and exclude internal fields. Export failure preserves the proposal and offers retry. Withdrawal or supersession of a PDF already shared cannot erase that copy; the app must show that separate client communication is required. Concurrent acceptance of a superseded version becomes a review conflict, not an automatic project change.

**Acceptance examples.** Editing scope after sharing v1 creates v2 while the v1 PDF remains reproducible. Changing a client address does not change v1. A saved PDF with no sharing event shows “Exported, sharing not recorded.”

## CRM-006 — Decisions, acceptance evidence, and disagreement

**Actors and permissions.** Owner can record a manual client decision with evidence. A future authenticated client reviewer may decide only for versions explicitly assigned to that person; a team member cannot impersonate a client. Any delegated signing authority and multi-signatory rules are a blocking decision for connected signatures.

**Fields.** Target document/version, decision (accept/reject/request changes), actor as recorded, authority/role if supplied, method (manual note, attached correspondence, portal, external signature provider), occurred-at and recorded-at timestamps, selected options, comment, evidence reference, and verification level. Record the capturing operator separately from the purported client actor.

**Flow and states.** An eligible Shared proposal can be Accepted or Rejected; a change request creates a new revision path while retaining the response. Manual acceptance requires explicit confirmation that the owner is recording an external decision. Authenticated acceptance checks current published revision, reviewer permissions, expiry policy, and selected options in one transaction. Duplicate provider callbacks or repeated clicks must produce one decision event. A disputed or mistaken acceptance receives a correction/dispute event; its evidence is never erased.

**Validation and recovery.** Expired, withdrawn, or superseded versions require owner review and a new eligible version or a separately documented override; never silently accept stale terms. Accepted values must equal the exact saved selected scenario. Missing evidence is allowed only for explicitly labeled manual records and cannot display “verified signature.” Revoking portal access does not delete historic acceptance evidence. Provider/network failure leaves `Awaiting confirmation`; it must not show Accepted until verified receipt. The app must not claim that a click, uploaded image, or signature process is legally sufficient in all jurisdictions.

**Acceptance examples.** Manually recording a phone acceptance displays “Recorded by owner; phone conversation” with both timestamps. Two identical accepted callbacks create one acceptance record. A response to withdrawn v1 cannot silently approve v2 or generate duplicate projects.

## CRM-007 — Contracts, statements of work, and obligation tracking

**Actors and permissions.** Owner maintains documents and obligations. Authorized contract administrators can approve publication; other members see permitted delivery obligations. Clients receive only the selected document and permitted attachments.

**Fields.** Document type (agreement, statement of work, amendment, NDA, support agreement), client, related proposal/project, version, parties snapshot, title, scope, term start/end, renewal and notice dates, payment milestones, confidentiality/IP/licensing/support references, termination conditions, source template, signature/evidence records, and structured obligations. Uploaded third-party documents can be the authoritative artifact; extracted fields must indicate manual/imported provenance.

**Flow and states.** Draft → Under review → Awaiting signature → Executed → Ended or Terminated. Rejected and Withdrawn are available before execution. An amendment is a separate versioned document referencing the executed agreement; it does not edit the executed copy. “Executed” is a recorded document status, with verification level matching the evidence. Obligations are Pending, Due, Satisfied, Waived, or Disputed, with responsible actor and evidence.

**Validation and recovery.** Required signatures depend on an approved policy; until then, connected signature completion is gated. End date cannot precede start date. Renewal reminder scheduling uses explicit dates and timezones; an ambiguous automatic-renewal clause requires owner input. Missing terms, clauses, or signatures are surfaced as incomplete fields, not supplemented with invented legal text. Local templates are editable starting points and carry no legal-compliance guarantee. Terminating an agreement does not void invoices, erase delivered work, or cancel linked project commitments automatically; the owner reviews a reconciliation checklist.

**Acceptance examples.** Changing an executed support period produces an amendment linked to the original. A 30-day notice reminder is calculated from the recorded renewal date and recomputed visibly if that date changes. A missing attached agreement is shown as unavailable while structured obligations remain recoverable from backup.

## CRM-008 — Onboarding, questionnaires, and access readiness

**Actors and permissions.** Owner assigns onboarding work. Future client reviewers can submit only their assigned questionnaire/request; members see only assigned sections or project-permitted artifacts.

**Fields.** Onboarding template/version, client/project, checklist items, question type and required flag, response, responsible party, due date, blocking flag, evidence/attachment, external resource link, access-verification status, and onboarding completion criteria. Suggested categories include billing contact, stakeholders, requirements, repositories, environments, communication cadence, assets, acceptance process, and handoff expectations.

**Flow and states.** Not started → In progress → Ready or Waived; individual items are Open, Waiting on client, Submitted, Verified, Rejected, or Waived. A submission does not count as verified until the designated owner checks it. Completion requires every blocking item verified or explicitly waived with a reason. Starting delivery with incomplete onboarding requires an explicit override and visible risk record, not a hidden automatic waiver.

**Validation and recovery.** Do not ask clients to paste passwords, private keys, tokens, or production credentials into ordinary notes/forms. Record a reference to a user-chosen secure sharing mechanism and verification result instead. File responses follow attachment scanning/storage limits and never execute automatically. Changing a template affects future onboarding instances; existing instances offer a reviewed update with preserved responses. Partial questionnaire responses can be saved locally; connected submission is queued visibly and remains pending until receipt. Deleting a question with a response archives that question in the instance.

**Acceptance examples.** A repository invitation item remains Waiting on client until the owner verifies access. A waived nonessential logo item does not block readiness; an unverified blocking API-access item does. Revising a template does not delete previously submitted answers.

## CRM-009 — Accepted-engagement handoff, loss, and reopen

**Actors and permissions.** Owner performs handoff. A team role requires both commercial-read permission and project-create permission; client reviewers cannot create internal projects or alter rates.

**Fields.** Source accepted proposal/contract versions, selected project template, client/contact links, billing basis and currency, agreed scope, milestones/deliverables, agreed fee or rate schedule, planned dates, onboarding instance, source-to-target mapping, and handoff ID. The agreed commercial baseline is separate from later working estimates.

**Flow and states.** Eligible accepted engagement → Preview handoff → Created → Reconciled. Preview shows exactly which projects, tasks, milestones, and onboarding requests will be created. Owner confirms and receives links to the resulting records. The proposed default is one accepted engagement to one project, with an explicit split plan for larger engagements; repeated handoff reopens the result rather than duplicating it. Won/Lost changes do not delete prior deliverables or financial records. A reopened opportunity starts a new commercial revision/cycle.

**Validation and recovery.** Require a single selected accepted version, compatible currency, and resolved template fields. Project creation and source mapping commit atomically or use a resumable operation with a unique handoff key. If creation fails midway, retry must not duplicate tasks or projects. A contract deposit requirement can create a project readiness blocker; it cannot fabricate payment or issue an invoice without the explicit financial workflow. Later accepted amendments become reviewed scope changes, not automatic rewrites of the original baseline.

**Acceptance examples.** Clicking “Create project” twice produces one project and one set of deliverables. A failure while copying milestones leaves no partially active project or resumes the same handoff. A lost opportunity with an existing discovery invoice retains that invoice and its history.

## CRM-010 — Renewals, account reviews, and explainable health

**Actors and permissions.** Owner reviews the client relationship. Current financial/contract permissions constrain money and renewal details. No health score or internal commentary is client-visible by default.

**Fields.** Review cadence, next review date, engagement/contract renewal dates, explicit satisfaction note, unresolved delivery issues, overdue invoice count/value by currency, last contact date, planned follow-up, source timestamps, and optional health category with reason. Metrics must link to their supporting records.

**Flow and states.** Upcoming review → Due → Completed or Snoozed. A renewal opportunity is explicitly created from an eligible contract and references its origin; it does not renew the contract or charge the client. Owner sets health manually or opts into a transparent rules-based suggestion. Suggestions show each contributing rule and data age and can be dismissed without altering facts.

**Validation and recovery.** Missing activity history is “unknown,” not evidence of dissatisfaction. Archived/cancelled engagements and waived invoices must be handled by defined filters. Revenue, invoiced value, contracted value, and collected cash remain different metrics. Reminders are deduplicated per contract/date and rebuilt after date changes. An offline or stale connector makes affected indicators visibly stale. No AI sentiment analysis or AI outreach is in scope. Relationship health uses explicit notes and deterministic, explained rules.

**Acceptance examples.** An unpaid invoice warning opens the actual invoice and shows its currency. A renewal opportunity created twice from the same review is detected and offers the existing item. A client with no recorded calls is labeled “No activity recorded,” not “At risk” without a disclosed rule.

## CRM-011 — Client portal (P08) and controlled external review

**Status and actors.** This capability is **gated**, delivered in P08 after the required cloud/team foundation. Managed cloud and workspace identity/sync are confirmed foundations; portal-specific identity, data region/cost, retention and client-access rules still require resolution. Owner publishes; an authenticated client reviewer sees only assigned resources; authorized team administrators manage access only within their workspace.

**Fields.** Client identity, workspace/client membership, invitation recipient and expiry, resource grants, publication version, permitted actions, access expiry, revocation state, last delivery/sync state, and audit events. Public secret-bearing URLs alone must not authorize unrestricted workspace access.

**Flow and states.** Invitation Draft → Sent → Accepted, Expired, or Revoked. A resource is Internal → Published → Withdrawn. Publication snapshots approved fields and files; unpublished edits stay internal until republished. Review requests are Pending → Accepted, Changes requested, Declined, Expired, or Cancelled. A decision is tied to an exact version. Permission is rechecked at every read, download, and mutation on the service, rather than relying on hidden UI.

**Validation and recovery.** A client grant cannot include other clients' work, unshared notes, internal costs, or sibling attachments. Revocation prevents future service access and terminates sessions according to an approved policy; it cannot recall prior downloads, screenshots, or already sent messages. A revoked/offline queued publication or action must be revalidated before execution. Accepting from two devices is idempotent; accepting a stale revision produces a clear conflict. If the service is unavailable, local authoring works and publication/response indicators remain pending. No simulated portal action may be presented as an actual client response.

**Acceptance examples.** Client A cannot obtain Client B's document by changing an identifier. A download URL cannot outlive its applicable grant beyond the approved expiry policy. Withdrawing v1 while a client accepts it offline yields a conflict for owner review instead of silently approving v2.

## Cross-capability acceptance and open decisions

An end-to-end authenticated workspace scenario with offline authoring must create a client/contact, qualify an opportunity, compare estimates, export a versioned proposal, manually record acceptance with labeled evidence, attach an executed contract, generate one project, complete onboarding, and preserve the entire source history after archive/restore. A second scenario must cover rejected/expired/superseded terms and failed handoff retry. Connected scenarios run only after their phase gates are approved.

The following choices require the user's answer before dependent implementation:

- Does the owner only record client decisions, or must clients log in and approve/sign? If signatures are required, which jurisdictions, provider, signer roles, and verification expectations apply?
- Are opportunities, estimates, proposals, and contracts needed in the first usable release, or after daily work and billing?
- All financial engagement types are configurable by confirmed choice. Which policies/terms and initial enabled profiles apply, and must one accepted engagement create multiple projects?
- Are there existing client/contact/proposal records to import, and which fields must remain private or be deleted under a retention policy?
- Should the app send email or invitations, or generate exports for manual sharing? Sender identity, provider, consent, and delivery/error handling need separate decisions.
- Teams/cloud accounts are confirmed from the first release. For the P08 portal, choose client identity/link policy, publication/evidence rules and operating costs before deployment.

Record answers and their effects in the [decision register](../planning/decisions.md); do not silently convert a proposed default into a confirmed requirement.
