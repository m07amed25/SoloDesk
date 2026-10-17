# Finance and commercial operations specification

Status: **proposed documentation, not implemented behavior**. This describes operational freelance billing and financial visibility. It does not claim legal compliance, certified accounting, payroll, statutory tax filing, or a complete general ledger. Countries, tax registrations, invoice mandates, currencies, payment providers, and accounting obligations are unresolved user decisions. Jurisdiction-specific behavior must be validated before adoption.

Primary delivery is **P05**, after durable storage (P01), client/commercial records (P02), project scope (P03), and billable evidence (P04). Reporting expands in P06; external delivery/payment/bank/accounting integrations are gated in P07; shared financial authority is mandatory in P01 and enforced in P05. See the [roadmap](../planning/roadmap.md), [decision register](../planning/decisions.md), and [time specification](time-and-productivity.md). The baseline covers invoices, exact calculations, manual payment recording, PDFs, and explicit correction flows. Advanced slices add estimates, credits/refunds, recurring agreements, retainers, expenses, reconciliation, and consolidated reports without changing the baseline integrity rules.

## Requirements catalogue

| ID | Requirement and boundary |
| --- | --- |
| FIN-001 | Maintain seller identity, billing address, optional registration identifiers, invoice contacts, payment instructions, currency defaults, date terms, and document branding. Snapshot customer-visible values when issuing documents. |
| FIN-002 | Create estimate/quote versions with scope, quantities, rate assumptions, exclusions, validity date, payment schedule, currency, taxes/discounts, and acceptance evidence. Issued versions remain immutable; later revisions reference the preceding version. |
| FIN-003 | Convert accepted estimate lines to invoice drafts or milestones with an explicit selection and preview. Track converted amounts/quantities and avoid duplicate conversion on retry. Acceptance is not proof of legal signature or payment. |
| FIN-004 | Support hourly, fixed-fee, milestone, and mixed invoice lines when they share client and document currency. Time lines retain source allocations; a project budget/estimate never becomes an invoice automatically. |
| FIN-005 | Create, edit, duplicate, preview, and discard drafts. Duplication creates a new draft without number, payment, allocation ownership, delivery history, or external identifiers. |
| FIN-006 | Finalize valid drafts atomically: revalidate references/rates/calculations, allocate number, freeze snapshot, commit time/expense ownership, and write audit event. Return the same document on an idempotent retry. |
| FIN-007 | Configure unique numbering by seller identity, document type, optional period, prefix, and sequence. No reuse after issue or void; restored or concurrent workspaces require an authority plan before issuance. |
| FIN-008 | Render printable, accessible PDFs and previews from the saved snapshot, with configurable layout, notes, currency, line detail, payment terms, and correction references. Export failure must not unissue or renumber a document. |
| FIN-009 | Track delivery separately from issuance and settlement. Manual export/share remains supported; automated email/provider delivery requires configured consent, delivery identity, retries, and evidence. |
| FIN-010 | Record multiple and partial payments with date, exact amount, currency, payer, method, reference, and optional attachment. Allocate one payment across invoices for the same client/currency with a reviewable allocation preview. |
| FIN-011 | Show unpaid, partially paid, settled, and overdue balances derived from posted settlement events. Overdue is a date-sensitive flag, not a destructive status transition. |
| FIN-012 | Record overpayments as unapplied client credit; allocate or refund explicitly. Never hide excess payment inside an invoice total or create a negative outstanding amount. |
| FIN-013 | Issue partial/full credit notes against issued invoices with original line/tax/discount references and reasons. Credit limits and source adjustments prevent duplicate reductions. |
| FIN-014 | Record partial/full refunds linked to original payment allocations or available client credit. A refund is a cash event; it is not automatically a cancellation or expense. |
| FIN-015 | Reverse erroneous payment/refund/credit allocations through compensating events; retain original records and external references. Editing a posted amount or deleting settlement history is prohibited. |
| FIN-016 | Support configurable tax labels/rates, exemption reason fields, inclusive/exclusive calculation, and permitted compounding order only after policy approval. Effective versions and rounding are stored with the document. |
| FIN-017 | Support fixed and percentage discounts at line or document level, with deterministic allocation across eligible lines. Discount order and tax basis are explicit and snapshot-based. |
| FIN-018 | Use one currency per financial document. Support configured currency precision, separate currency balances, explicit exchange rates for reports, and reviewed cross-currency settlement records. |
| FIN-019 | Generate recurring invoice drafts from versioned schedules and contract templates, with preview, pause/resume/end, missed-run handling, and duplicate prevention. Automatic issue or delivery is a separate opt-in. |
| FIN-020 | Track retainers as either prepaid money or included service units under an explicit agreement. Define replenishment, expiry, rollover, overage, and cancellation; never mix these models silently. |
| FIN-021 | Record expenses with supplier, date, category, original currency/amount, tax details if used, receipt, payment source, project/client, billable eligibility, and reimbursement policy. |
| FIN-022 | Convert approved billable expenses to invoice lines with markup or at-cost policy and immutable source references. Prevent duplicate reimbursement; preserve original expense and any billed conversion rate. |
| FIN-023 | Record receipt of client payments separately from payment processing. Payment links, provider webhooks, dispute/chargeback handling, and payout reconciliation are optional integrations. |
| FIN-024 | Reconcile imported bank/provider records against recorded payments and expenses through suggested matches, split/combined matching, fee separation, and user confirmation. No external movement of money is implied. |
| FIN-025 | Provide revenue, receivables, cash collection, costs, project margin, effective rate, expense, tax-component, and aging reports with date basis and formula labels. Provide reproducible snapshots and CSV/PDF exports. |
| FIN-026 | Export accounting-ready transaction data with stable IDs, source references, currency, exact amounts, dates, tax/discount components, and reversals. Accounting integrations require approved mapping and reconciliation. |
| FIN-027 | Provide configurable reminder schedules, previewed text, suppression, and history. Do not send reminders on paid, disputed, voided, or opted-out accounts; automation rechecks balance immediately before sending. |
| FIN-028 | Record disputes, promised-payment dates, write-offs, and collection notes without changing the original invoice. A write-off is a separately approved operational adjustment, not a tax deduction determination. |
| FIN-029 | Preserve audit history, calculation-policy versions, document hashes/render versions, actors, and idempotency keys. Archive clients and projects without deleting referenced documents. |
| FIN-030 | Handle backup restoration, imports, multiple devices, and simultaneous finalization without duplicate numbers, payments, allocation consumption, or corrupted balances. Unsafe financial conflicts block finalization and require review. |
| FIN-031 | Offer versioned invoice/estimate/credit templates, localized dates/numbers, language selection, optional payment QR/link fields, and hidden internal notes. A translation/layout change must not alter stored amounts. |
| FIN-032 | Support configurable deposits and milestone schedules: planned amount, due trigger, issued invoice, cash received, and remaining contracted amount are distinct. Deposits must not be counted twice when issuing a final invoice. |
| FIN-033 | Retain attachment metadata, checksum, source document link, and access policy. Missing or invalid receipts/templates show a repair state without deleting financial records. |
| FIN-034 | Validate commercial transactions before committing and preserve drafts/input on failure. Long PDF/export/import jobs expose progress, cancellation boundaries, retry, and recovery. |
| FIN-035 | Configure client service-subscription plans, periods, quantities, upgrades/downgrades, cancellation and explicitly selected proration; preserve accepted terms and issued history. This is separate from SoloDesk product seat billing. |

## Documents, states, and derived views

An estimate has `draft`, `issued`, `accepted`, `declined`, `expired`, and `superseded` states. Only a draft is freely editable. Acceptance records the accepted version, timestamp, identity/evidence source, and scope. Expiration is evaluated against the stored validity calendar date and document timezone. An accepted quote does not automatically authorize an invoice or mark work complete. Conversion ownership is tracked at line/milestone level; changing the quote later creates a new version and explicit scope change.

An invoice lifecycle is `draft → issued → voided` where the allowed void conditions are met. Issuance creates the permanent number and financial obligation. Delivery (`not_sent`, `queued`, `sent`, `failed`, `unknown`), settlement (`unpaid`, `partial`, `settled`), dispute state, and overdue flag are separate projections. “Sent” means a recorded manual action or provider handoff; it does not prove that a client read the document. Bounced/undelivered messages remain visible.

A draft may contain incomplete values and validation errors. Issue requires at least one nonzero valid line, seller/client snapshots, currency, dates, terms, totals, approved tax/discount policy, ownership checks, and resolved relevant timer/review conflicts. The proposed default requires total greater than zero; zero-value statements and standalone negative invoices are excluded until a user need is confirmed. Credits use a dedicated document type.

An issued invoice cannot be deleted or edited. The proposed void action is allowed only for an unpaid, uncredited, undisputed invoice with a reason and no posted settlement allocations. Whether an issued document may be voided at all, and when a credit/replacement is required instead, is jurisdiction-dependent and unresolved. Consequently the UI must support disabling voiding by policy. Reversing a payment merely to bypass a void restriction is not allowed. A replacement retains a reference to the original. Releasing time/expense allocations after a permissible void requires deliberate review and a new audit event.

Credit documents are `draft → issued`; an issued credit is immutable and tied to original invoice line balances. Corrections to an issued credit require an approved compensating-document workflow, not record deletion. The exact document type for reversing a credit is a jurisdiction decision. Payments and refunds are `draft → posted → reversed`; posted data is corrected by a compensating event with reason, date, and reference. Payment initiation/provider states (`pending`, `succeeded`, `failed`, `disputed`) are distinct from local posted accounting evidence.

## Exact arithmetic contract

### Representation and precision

Store currency on every monetary record. Posted amounts and document component totals are integer minor units using versioned currency metadata; never assume two decimals. Store quantity, rates, percentages, and exchange rates as exact decimal strings or numerator/denominator values. Binary floating-point is prohibited for authoritative amounts. Validate input precision and supported ranges before conversion; do not silently truncate excessive decimals or overflow a safe storage range.

Proposed policy for approval: exact intermediate arithmetic; round each document line component to the currency's minor unit with **half-up** for nonnegative charges. Represent credits as positive reductions of original components, avoiding ambiguous signed rounding. A reversal uses the exact stored amount. Cash rounding, where required, is a separate explicitly configured component, not a hidden change to line/tax totals.

A time line uses `rate_minor_per_hour × allocated_source_seconds / 3600`, after any approved time-rounding policy. A fixed quantity line uses `unit_price × exact_quantity`. Preserve the unrounded value/policy for explanation, but issued line and document totals must agree to minor units.

### Proposed calculation order

1. Compute exact quantity × price for each line and round to a minor-unit base amount.
2. Apply each line's permitted discount, rounding percentage discounts once to minor units; reject a reduction greater than that line's base.
3. Allocate the document discount proportionally across eligible remaining line amounts using the largest-remainder method. Resolve equal remainders by stable line order/ID. The sum must equal the document discount exactly.
4. Calculate taxes on each resulting line basis using the saved tax policy. Exclusive taxes add to the net; inclusive taxes are extracted from the already-tax-inclusive amount. Multiple independent taxes share the declared basis; compounded taxes use a stored explicit order. Mixed inclusive/compound arrangements require an approved policy before enabling them.
5. Sum saved line net amounts and tax components to the document total. A permitted cash-rounding adjustment is separately itemized. Never recalculate the total from rounded displayed hours or rounded displayed percentages.

Discount timing, inclusive-tax extraction, tax rounding per line versus whole document, exemptions, and credit-note tax rules must be confirmed for the user's actual use. The above is a proposed engine policy, not a statement of legal requirements.

### Arithmetic fixtures

| Fixture | Expected result under the proposed policy |
| --- | --- |
| Currency precision 2; 90 seconds at 120.00/hour | 3.00 line base, independent of a display of 0.03 hours. |
| Currency precision 2; 3 units × 19.99, then 10% line discount and 15% exclusive tax | Base 59.97; discount 6.00; net 53.97; tax 8.10; total 62.07. |
| Three eligible lines of 1.00; document discount 0.01 | Stable first line receives 0.01; remaining lines 0.00; net sum 2.99. |
| Inclusive gross 115.00 with one 15% tax | Extracted net 100.00 and tax 15.00; gross remains 115.00. |
| Currency precision 0; exact line value 100.5 | Rounded line base 101 units. |
| Currency precision 3; exact line value 1.2345 | Rounded line base 1.235 units. |
| Credit half of a line whose stored tax cannot split evenly | Proportional component allocation with deterministic remainder tracking; final full credit consumes the exact remaining original net/tax, never more. |

Every release that changes arithmetic policy needs regression fixtures including zero/large values, fractional quantities, 0/2/3-decimal currencies, rounding ties, multiple taxes, mixed discounts, partial credits, cancellation, and imported legacy documents. Existing issued snapshots retain their old version.

## Balances, payments, credits, refunds, and deposits

For one invoice in its own currency, define:

- `T`: original issued total.
- `C`: valid issued credit reductions allocated to this invoice, net of permitted compensating reversals.
- `W`: separately approved write-off reductions, excluding amounts already credited.
- `S`: net posted settlement allocations, including applied prepaid client credit, less settlement reversals and refunds assigned to those allocations.
- `remaining_obligation = T − C − W`, which cannot be negative.
- `outstanding = max(0, remaining_obligation − S)`.
- `settlement_surplus = max(0, S − remaining_obligation)`.

A payment's total allocations plus unapplied amount equal its posted amount less refunds/reversals. A client-credit unit can be consumed only once. An invoice surplus must be explicitly refunded or transferred to unapplied client credit; the transfer simultaneously decreases the invoice settlement allocation and increases the client credit balance. It is never counted as available credit in two places.

Examples: an invoice for 100.00 with 30.00 paid has 70.00 outstanding. A further payment of 80.00 allocates 70.00 and leaves 10.00 unapplied credit. On a fully paid 100.00 invoice, a 40.00 credit creates a 40.00 settlement surplus; a linked 40.00 refund reduces net settlement to 60.00 and leaves zero outstanding. Refunding 40.00 **without** a credit/cancellation reduces settlement and reopens 40.00 outstanding; require an explanatory preview. Refunds cannot exceed refundable original cash after prior refunds, chargebacks, transfers, and reversals.

Payment fees are expenses or separately mapped cost components. A provider's 97.00 payout after a 3.00 fee can settle a 100.00 payment when the payment/fee/payout links are explicit; it must not be recorded as only 97.00 paid by the client. A chargeback records its source and financial effect, updates the relevant allocations, and marks the dispute; it never deletes the original receipt.

Milestone/deposit invoices reference the agreement and planned amount. The final invoice must either bill only remaining scope or explicitly apply the already-invoiced deposit/credit according to the approved policy. A prior deposit invoice and cash receipt cannot both reduce the final obligation independently. Estimate conversion and deposit application use stable source IDs and consumed amounts.

## Invoice issuance, ownership, and numbering

A finalization command carries draft ID, expected revision, actor, and idempotency key. In one transaction: validate draft completeness; recompute and compare preview totals; check source availability; reserve the next number; write immutable document/line/tax/discount snapshots; commit allocations; append the audit event. All steps commit together or none do. An optimistic version conflict returns a refresh/diff; it cannot silently issue using changed values.

Number uniqueness scope is seller legal identity + document type/series + applicable period + sequence. Formatting and resets are approved configuration. Do not recycle a number after an issue, void, export failure, or delivery failure. If infrastructure reserves a number outside a document transaction, preserve the unused reservation and reason rather than silently reusing it.

A backup cannot know which invoices were issued after the backup was taken. Restoration therefore enters issuance review: compare an external numbering register/latest export/authoritative service, or deliberately start an approved new series. Do not claim that restoring the database alone prevents collisions. Cloned workspaces cannot concurrently issue from the same local sequence.

The confirmed cloud/team model uses server-authoritative transactions for documents, numbers, settlement allocations and billable-source ownership. Last-write-wins is forbidden for financial facts. Offline capture and invoice draft editing continue, but **invoice finalization requires online service access (D-13)**. Credit issuance/payment/refund posting are also online-authoritative under the documented design. Offline source selections are candidates, not global reservations. After a timeout, resolve the original operation receipt before retrying; never issue a second document as a connectivity workaround.

## Advanced agreements and recurring behavior

A recurring schedule records timezone, cadence, calendar anchor, service-period rule, end condition, template revision, generation mode, and next due occurrence. The occurrence key is stable across retries, app restarts, clock changes, and devices. The proposed month-end rule uses the last valid day in a short month while retaining the original anchor for subsequent months; the UI previews the next occurrences. Calendar date computation uses the schedule timezone, not elapsed 30-day durations.

Opening the app after missed occurrences presents each period and an explicit create/skip/merge decision. A desktop-only app cannot promise generation or delivery while the computer is off. A durable managed-cloud scheduler supplies enabled recurring drafts in P05; general connector/rule execution expands in P07. Default behavior creates drafts; auto-issue and auto-send are independently enabled and must revalidate client consent, current tax configuration, balance/contract state, and numbering authority. Pausing never deletes issued history.

A monetary retainer tracks agreed prepaid amount, receipts, allocation balance, replenishments, refunds, expiry treatment, and linked invoices. A service retainer tracks included hours/units per service period, approved consumption, remaining allowance, rollover cap/expiry, and overage rate. They are separate models. Receipt of prepaid cash must not be presented as earned revenue without the selected reporting/accounting basis. Service consumption is linked to actual source seconds; the same seconds cannot consume included hours and generate ordinary hourly charges, except an explicit overage portion. Expired allowance is not a cash refund event.

Retainer release requires scenarios for partial period, scope cancellation, overage, mid-period rate change, unused balance, reversal, rollover, and multiple currencies. Terms and legally required treatment remain user decisions. Client service-subscription billing is specified below. Automatic bank debit requires a separately configured P07 payment provider; a complete general ledger is outside this product scope.

## Client service subscriptions

A client subscription has accepted plan/version, quantity, currency, service-period timezone/anchor, effective start/end, renewal rule, invoice template, billing in advance/arrears, cancellation policy and optional provider mandate reference. States: Draft → Pending activation → Active ↔ Paused → Cancelled or Ended. Activation and changes are authorized online and reference evidence; no provider charge is implied by recording a subscription.

Changes use effective-dated plan revisions. Preview full next-period and any current-period adjustment separately. Proration is configurable and disabled until its policy is selected: actual calendar-day fractions, exact interval fractions, or no proration have different results. For a declared 30-day period with 15 days remaining, a 100.00→200.00 change under calendar-day difference proration creates a 50.00 pre-tax adjustment; taxes/rounding follow the frozen policy. A change never edits an already issued invoice. Credits, failed collection, grace, service suspension, resume, early cancellation and unused allowance follow explicit agreement rules and never erase debt automatically. Generation dedupes by subscription+period+revision+adjustment identity. Test leap years, month-end, DST, repeated callbacks and cancellation at the period boundary.

## Expenses, reimbursement, and profitability

Expense workflow is `draft → recorded`, with optional `submitted → approved/rejected` when approvals apply. The document stores original supplier amount/currency and any report-currency conversion separately. A billable expense has eligible amount, reimbursement currency, tax handling, markup, and source receipt; these are not inferred from a category name. One expense may be split among projects through amounts that exactly sum to the allocatable total. Personal/nonreimbursable portions remain distinguishable.

The proposed baseline bills an entire eligible expense once. Advanced partial reimbursement tracks consumed minor-unit portions per source expense, with exact bounds and reversal history. Draft reservation, finalization ownership, and correction rules mirror time allocations. A credit note does not silently make an expense billable again. Cross-currency rebilling requires an explicit rate/source/date and rounding preview, frozen at issue.

Profitability reports disclose their basis. Proposed operational project margin is net invoiced service revenue after discounts/credits, excluding sales-tax components, minus attributed direct expenses and configured internal labor cost. It is not statutory profit. Collection margin substitutes collected revenue and labels that date basis. Internal labor cost rates are private, separate from customer billing rates, and versioned. An expense reimbursement can be shown as pass-through revenue/cost or excluded from service margin according to the selected report policy; never count it inconsistently across compared projects.

Multi-currency reports retain original amounts and show totals by currency by default. A consolidated report requires reporting currency, exchange-rate source, valuation date policy, rate version, missing-rate handling, and rounding method. Never present a sum of unlike currencies as one unlabeled number. Realized/unrealized exchange gains require a separately approved accounting model; an operational converted estimate must not be labeled that way.

## Reconciliation, exports, delivery, and privacy

Manual matching can link many bank/provider rows to many payments/expenses when the amounts reconcile under explicit fee, transfer, and conversion components. Imported external IDs are unique per account/provider. File reimport skips exact duplicates and flags changed rows. Matching suggestions never post automatically in the baseline. Unmatched items, disputed items, partial matches, and excluded personal items remain visible. Undoing a match preserves both source transaction and history.

CSV exports neutralize spreadsheet formula injection in text fields, use explicit dates/timezones, document the delimiter/encoding, and preserve exact numeric strings. Export packages include IDs and links needed to reconcile totals, but omit private notes and credentials unless the selected export expressly includes authorized private content. PDFs use local snapshot data and permitted assets; rendering must not fetch arbitrary remote resources or execute document content.

Delivery commands have per-document, recipient, template-version, and occurrence keys. If a provider accepts a message but the response is lost, reconcile provider status before retrying; show “delivery unknown” if proof is unavailable. The UI distinguishes retrying PDF creation from resending an invoice. A new export can re-render the same issued snapshot with a recorded renderer version; legal archiving/rendering requirements remain unresolved.

## Failure and acceptance matrix

| Scenario | Required outcome |
| --- | --- |
| FIN-A01: Finalize twice or lose the response after commit | One number, one document, one set of source allocations; return the existing result. |
| FIN-A02: Another draft consumed selected time/expense | Issuance fails atomically with the exact conflicting source; user can revise the draft. |
| FIN-A03: Seller/client/rate settings change after issue | Saved PDF details and totals remain unchanged; future documents use new values. |
| FIN-A04: PDF generation crashes or disk is full | Issued record remains valid; user can retry export with the same number and snapshot. |
| FIN-A05: Partial payment, overpayment, refund, credit, and reversal chain | Balance equations hold; no negative obligation; available credit is consumed only once. |
| FIN-A06: Partially credit every line, then credit all remaining value | Net/tax/discount reductions exactly exhaust original components without a one-cent excess or remainder. |
| FIN-A07: Payment webhook or bank import repeats | Duplicate event does not increase cash, settle twice, or duplicate fees. |
| FIN-A08: Monthly schedule anchored on day 31, offline for two periods | Next dates follow the declared month-end rule; missed periods are previewed; one draft per accepted occurrence. |
| FIN-A09: Restore an old backup or clone the workspace | Issuance review blocks unsafe number reuse; existing documents remain readable/exportable. |
| FIN-A10: Multi-device draft changes or settlement conflict | Preserve both facts/drafts; block conflicting financial mutation; never silently last-write-wins. |
| FIN-A11: Foreign-currency payment or expense | Explicit conversion and original amount retained; no implicit currency mixing. |
| FIN-A12: Reminder executes just after a payment | Recheck suppresses the reminder when no eligible outstanding balance remains. |
| FIN-A13: Refund with and without a linked credit | Preview explains whether debt reopens; posted result matches the approved choice. |
| FIN-A14: Credit/void changes a previously invoiced source | Rebilling eligibility changes only through an explicit audited release/correction, not automatically. |
| FIN-A15: Provider cash payout differs because of fees | Gross payment, fee, net payout, and invoice settlement reconcile without a false underpayment. |
| FIN-A16: Invoice modified while preview is open | Revision mismatch requires a new preview; stale totals are not issued. |
| FIN-A17: Private internal notes and labor costs exist | Customer PDF/portal/export omit them; user-facing preview confirms included information. |
| FIN-A18: Retainer allowance partially consumed and then corrected | Units/money are conserved; reversal returns only eligible unused consumption; no double invoice charge. |

## Decisions requiring user input before dependent work

1. Seller country, client regions, tax registrations, required document languages, tax/e-invoice mandates, and whether an accountant must validate formats/calculations.
2. Actual currencies and report currency; line versus document rounding; inclusive/exclusive/compound tax arrangements; discount and credit policy.
3. Invoice numbering/series, void/correction rules, retention requirements, multiple seller identities, and existing invoice numbers to import.
4. Required baseline versus advanced payments, credits, refunds, retainers, deposits, recurring invoices, expenses, write-offs, and reconciliation.
5. Manual or automated delivery; email provider/identity; payment links, bank feeds, accounting tools; reminder permissions and dispute rules.
6. Which retainer models and contractual rollover/overage/expiry rules apply; whether estimates/contracts need electronic signatures or only recorded acceptance.
7. Financial roles/approvers for the confirmed sync/team model, and who can issue, credit, refund, export, or change financial configuration.
8. Cash versus invoiced revenue reporting, internal labor cost handling, forecast assumptions, and how reimbursement/pass-through amounts should appear.

These answers select the applicable subset and determine legal/commercial validation. The documentation intentionally leaves unchosen policies marked proposed or unresolved; advanced feature breadth must not disguise an unresolved financial invariant.
