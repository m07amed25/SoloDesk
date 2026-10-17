# SoloDesk UI components and interaction contracts

Status: design specification, not implemented components. Read [DESIGN.md](../../DESIGN.md) for tokens and [screen specifications](screens.md) for composition. Domain rules remain in the functional specifications. User preference: spacious controls; English/Arabic parity; light/dark/system themes.

[Exact component visual specifications](component-visual-specs.md) define the button appearance matrix, border/outline rules, radius scale, dimensions, padding, icon gaps and per-state recipes. Use that catalogue together with this behavior contract; the short rows here do not leave unspecified styling to individual features.

## Shared component contract

Every component specification and PR must name its purpose, accessible name, permitted actions, data/permission scope, size variants, wrapping/overflow behavior, keyboard behavior, focus destination, light/dark/RTL appearance, and applicable states. All interactions have default, hover, pressed, keyboard focus, disabled-with-reason and busy states. Form controls additionally have invalid, read-only and dirty states. Data components additionally have loading, empty, filtered-empty, stale, incomplete, failed and permission-restricted states. A state that does not apply is recorded as not applicable rather than simulated.

Build from the installed shadcn/Base UI primitives, Tailwind tokens and Lucide icons. Preserve the accessibility and composition contracts of the installed primitive; do not copy Radix-specific APIs into the Base UI setup without checking compatibility. Business composites wrap primitives rather than fork their semantics. UI design does not authorize dependency installation.

## Actions

| Component | Appearance and sizing | Behavior and acceptance |
| --- | --- | --- |
| Primary button | Filled action color, 48px height, 16px inline padding, 8px radius; label 14/22 medium | One dominant action per working area. Verb + object where useful. Busy keeps width and label context. Disable duplicate submission while command is pending. |
| Secondary button | Surface fill, meaningful control border, same geometry | Supporting action; distinct from destructive. Native focus ring remains visible. |
| Ghost button | Transparent until hover, same hit area | Toolbar/context actions. Do not rely on hover to make a critical action discoverable. |
| Destructive button | Destructive fill only at consequential confirmation; destructive text in menus | Separate from ordinary actions; explain target and consequence. Undo only for truly reversible actions. |
| Icon button | 44×44px hit area, 18–20px icon; may look visually smaller inside the hit area | Accessible name plus tooltip. Tooltip is supplementary, never its sole accessible label. Unlabeled icons do not represent unfamiliar actions. |
| Split button | Main action and menu trigger independently focusable | Secondary choices share the main action's context. Single primary is preferable unless alternatives are common. |
| Link | Underline in prose; action-color text with hover underline in navigation | Links navigate; buttons mutate/open interactive surfaces. External links identify external destination and use the system browser when required. |
| Menu/context menu | 44px rows, 8px panel radius, 16px glyphs, optional shortcut suffix | Arrow keys navigate; Escape closes; focus returns to trigger. Context menu has a visible overflow-button equivalent. Destructive item last, separated. |

Busy means “Saving…”, “Checking result…” or another truthful stage. Never use an indefinite loading state where a timeout/recovery path is known. A disabled action exposes a nearby reason or an accessible description; hover-only tooltips cannot explain a disabled button to keyboard users.

## Inputs and forms

| Component | Contract |
| --- | --- |
| Field wrapper | Persistent label, optional concise hint, required/optional indication, control, error. Hint/error IDs are associated with control. 8px label-control gap and 6–8px message gap. Never use placeholder as label. |
| Text input | 44px minimum, 12px inline padding, 8px radius. Allow paste and standard selection. Single-line values with truncation have a full-value read/copy alternative. |
| Textarea | Minimum 120px height, vertical growth within editor bounds. Plain text by default. Long Arabic text wraps without clipping marks. |
| Money/quantity/percentage input | Text editing with explicit units/currency; locale-aware normalization preview. Preserve partial input while typing. Validate scale/range on blur or submission. No silent rounding or wheel-induced value changes. Negative input only in supported domain workflows. |
| Duration input | Label accepted syntax such as `1h 30m` or `01:30:00`; show normalized duration and units. Decimal hours require explicit mode. Never interpret `1.30` ambiguously. |
| Date/date-range picker | Display locale format with a typed-input alternative. Work date is distinct from timestamp/timezone. Range includes start/end and clear/reset. Arrow-key calendar navigation; typed invalid dates retain input. |
| Timezone picker | Search canonical zones and localized names; show current UTC offset and an example date where useful. Daylight-saving ambiguities get an explicit offset choice. |
| Select | Short fixed choices. Trigger shows selected label; arrow navigation, type-ahead and Escape work. No placeholder option counted as a real value. |
| Combobox | Searchable large datasets; separate searching, no matches, not loaded, permission-limited and read error. Query and selection remain distinct. Virtualization must retain screen-reader access. Create-new appears only with permission. |
| Multiselect | Selected tokens with accessible removal, count and summary when long; full selection editor always available. Backspace removal never surprises a user editing a query. |
| Checkbox | 20px visual control inside a 44px label target; checked/unchecked/mixed. Bulk checkbox describes selected scope. Mixed means partial selection, not an unknown state. |
| Radio group | Mutually exclusive options with visible descriptions; arrow keys move inside group. Use for consequential policy alternatives where seeing all choices matters. |
| Switch | Immediate reversible setting; named on/off state. If change needs a multi-field Save action, a checkbox may communicate pending choice more clearly. |
| File input/upload | Browse is equal to drag/drop. Show allowed type/size policy, encrypted local staging, upload progress, verifying, failed/retry, canceled and complete. Attached locally is distinct from available to teammates. |
| Rich-text editor | Explicit toolbar names, headings/lists/links/code, undo/redo and keyboard access. Sanitize previews. Preserve local unsynced draft; no accidental external embeds or script execution. |
| Custom-field editor | Type, label, required/default options and permission implications. Changing type previews existing-value impact and migration errors. |

Form sections group related decisions. Use one column for main task entry and at most two columns for short independent fields on wide windows. Long descriptions and Arabic names get full width. Suggested maximum field measure: 640px; long-form prose: 70ch. Required-field validation occurs after interaction or submit, not before the user starts. On failed submit, focus an error summary linking to each field; preserve every valid input. Server rejection maps to the relevant field where possible.

Autosave editors display **Unsaved → Saving on this device… → Saved on this device → Waiting to sync → Synced** as distinct stages. A local write failure leaves unsaved data visible. Navigation with undurable changes offers Save, Discard, or Continue editing. Native close follows the same data-preservation rule and the timer policy. Financial posting uses an explicit review/commit action rather than autosave.

## Navigation and workspace context

| Component | Contract |
| --- | --- |
| App titlebar | OS-owned minimize/maximize/close conventions; reserve native overlay insets. Interactive renderer controls are outside draggable regions. Double-click/drag behavior follows OS expectations. Arabic never flips OS control placement. |
| Workspace switcher | Current workspace name/avatar, membership scope and account. Pending local changes remain associated with their original tenant. Switch cannot show prior workspace records during loading. |
| Sidebar | Text labels and icons, active item via tint + text weight + `aria-current`. Collapse has a named control; icon mode retains tooltips and names. Unavailable modules are omitted unless a permitted setup action is useful. |
| Breadcrumb | Real hierarchy and workspace context, final item non-link. Long middle ancestors collapse into accessible menu; final record name can wrap. |
| Tabs | Related views of one entity, roving focus and arrow keys; do not use tabs for unrelated global modules. URL/deep-link state is preserved where supported. Overflow uses scrolling or explicit menu. |
| Command palette | Search and actions grouped separately; show workspace scope, cached-subset notice and keyboard hints. Unavailable finance records/actions never appear in counts or suggestions. |
| Back navigation | Returns to list with filters/scroll/selection preserved. Deep-linked detail without history offers a named parent destination. |
| Notification center | Unread/read/snoozed, source links, channel state, dates and quiet-hours control. Old inaccessible source becomes a generic unavailable notice, not a leaked title. |

Default shortcut proposals: Mod+K search, Mod+Shift+T open timer, Escape close the top transient layer. `Mod` is Command on macOS and Control elsewhere. Register only after checking Electron/OS conflicts; every shortcut has a visible menu/button alternative. Single-letter shortcuts are optional and disabled while typing. No shortcut can bypass financial review.

## Data display and work views

| Component | Contract |
| --- | --- |
| Data table | Caption/name, sortable headers with direction announcement, stable row key, 64px default row minimum, 14px minimum text, 16px cell padding. Align text to inline start, numeric amounts to inline end; isolate number strings. Keep header on vertical scroll only when it does not obscure focus. |
| Row actions | A visible primary navigation target and named overflow menu. Checkbox selection is independent from opening detail. Hover reveals may supplement persistent alternatives. |
| Table selection | Explain “20 selected on this page” versus “all 840 matching records”. Show selection count, scope and clear. Bulk preview includes exclusions and per-item failures. Selection cannot survive tenant changes. |
| Pagination | Cursor-backed next/previous, page size if supported, honest loaded counts. Never imply exact totals from an incomplete offline cache. Restore previous position after detail navigation. |
| Filter bar | Search, high-value filters, filter count, clear and saved-view control. Active filters are removable with keyboard. Query, sorting and visible columns form a saved view, not new data. |
| Status badge | 12–14px text, icon or shape plus label, 24–28px visual height; actionable badge target is 44px. Do not encode permission, sync and financial settlement in one overloaded badge. |
| Avatar/person chip | Image or initials and actual person name; status never communicated by initials/color alone. Fallback does not fabricate a profile photo. |
| Empty state | State what this area is for and one eligible next action. Distinguish no records, no matches, inaccessible records, unavailable cache and failure. No fake client/revenue cards. |
| Skeleton | Match final structure and reserve dimensions. Start after a short latency threshold; never imply a record count. Reduced motion disables shimmer. |
| Kanban column/card | Header name/count, task title, assignee, due date and real blockers. Card move has keyboard menu and explicit destination. Drag feedback announces position; failed local save restores prior position. |
| Calendar | Day/week/month view, named dates and timezone, keyboard agenda equivalent. Overlap and all-day/work-date items are distinct. Resize/move has form equivalent and confirmation for consequential recurrence changes. |
| Timeline/dependency view | Stable time axis, zoom and fit controls, accessible task list, dependencies with labels and cycle errors. Pan/drag are optional accelerators. Expose schedule changes before saving. |
| Capacity grid | Person/workweek totals, leave/calendar assumptions, over-allocation text. Do not infer actual availability from tracking telemetry. Keyboard opens cell details. |
| Chart | Title, formula/basis, period/timezone, currency/units, legend, axis labels, data timestamp and table alternative. Tooltip supports focus. Missing is distinct from zero; forecasts use dashed lines and assumption text. |
| Metric | Value + unit + date basis + permitted comparison. Percentage changes from zero are explicitly undefined. No global mixed-currency total without an explicit conversion basis. |
| Activity/audit timeline | Actor, timestamp, event, reason and permitted diff. System events are named. Audit is read-only; comment deletion cannot remove audit evidence. |
| Diff viewer | Base/local/server columns or stacked sections, changed fields with text labels, winner choice and resulting preview. Mask inaccessible values even if present in an older local candidate. |
| File/document preview | Filename, version, publication/access state, download/open action, safe failure state. Active formats do not execute. Missing attachment never deletes its parent financial record. |

## Overlays and feedback

| Component | Use and behavior |
| --- | --- |
| Popover | Small contextual choice; escape/close and focus return. Render outside clipping ancestors. Maximum height follows available viewport; never cover its focused trigger without recovery. |
| Tooltip | Brief supplementary label, keyboard + hover, dismissible. No essential form instruction or rich multi-action content. |
| Sheet/detail inspector | Short secondary inspection/editing beside a list; 440–560px preferred width. At narrow effective width use a full page. Unsaved content protection applies. |
| Dialog | Focused short decision, MFA prompt or review requiring interruption; 480px default, 640px wide. Fit available height with internal scroll and reachable footer. Title, description and focus trap; restore origin. |
| Alert dialog | Exact target/amount/recipient and irreversible consequence. Initial focus on safe action where deletion is irreversible. Never use for ordinary every-edit confirmation. |
| Toast | Reversible short outcome or background progress, 4–6s informational timeout; pause on focus/hover. Errors persist elsewhere too. Financial receipts and recovery instructions never live only in toast. |
| Inline banner | Persistent state affecting the area: offline, rejected sync, incompatible client or quota. Include explanation + next action. Text/icon communicate severity without a colored stripe. |
| Progress/job row | Queued/running stage, count or bytes if measured, cancel boundary, outcome and result link. Unknown duration uses a named stage rather than fabricated percent. |
| Error boundary | Preserve shell, safe context and recovery. Retry cannot replay an unknown financial command. Redacted diagnostic reference is copyable; no raw tokens/stack dumps in normal UI. |

Avoid nested dialogs. A dialog needing a long editor becomes a page or sheet. Escape closes only the top dismissible surface and cannot silently discard undurable work. Returning focus to a deleted row falls back to the next row or list heading.

## Business composites

### Delivery trail

The shared **Scope → Work → Time → Billing** trail is SoloDesk's contextual signature. It summarizes the current project's lifecycle with ordinary labeled links and evidence counts, not a decorative progress meter. States are independent: accepted scope does not mark work finished; recorded time does not imply approved billing; issued does not mean paid. Only show permitted stages. Each stage links to the exact filtered record set. RTL reverses reading flow and directional arrows, never the logo or currency strings.

### Persistent timer

Global indicator shows project/task, `HH:MM:SS`, running/paused/recovery state, and accessible controls. A running icon changes shape/text, not only color. Start is shown only after persistence. Stop remains pending on storage failure. Switching previews the old/new project and atomically changes capture. Recovery shows the last durable checkpoint, uncertain gap and retain/discard/revise choices. No tick-by-tick live-region announcements. Tray failure leaves working in-app controls. Cross-device concurrent capture creates review, not an assurance of global exclusivity.

### Save/sync indicator

Expose independent **device durability**, **cloud acknowledgment**, **access lease**, and **conflict** states. “Saved on this device · 3 changes pending” is valid; “Saved” alone is insufficient when synchronization matters. Indicator opens Sync center with queued/rejected/conflicted operations and authorized recovery. Connectivity returning does not itself mean synchronization succeeded. Expired access leads to unlock/reauthentication without discarding encrypted local work.

### Financial review panel

Always identify active workspace/seller, client, document type and currency, selected sources, dated rate/calculation profile, source reservation status, document date/due date, exact line totals/taxes/discounts, payment terms and online requirement. Draft displays “Number assigned when issued”. Issue review has one explicit **Issue invoice** action. On timeout display **Checking issuance result** using the existing operation identity; block duplicate issue until receipt is known. Success shows permanent number and immutable snapshot. Delivery and payment remain separate actions.

### Payment/allocation editor

Separate received amount from invoice allocations and unapplied credit. Show allocation sum, remaining amount and currency; prohibit silently consuming an overpayment. Record payment differs from Send payment/Refund through provider. Read-only ledger explains corrections through compensating events. Cost/rate/finance fields are absent for unauthorized users in menus, exports and tooltips as well as the main body.

### Review/approval panel

Show source version, requester, submission period/date, evidence and policy. Approve/reject captures revision; rejection requires reason. Editing approved evidence produces a new review state. Client portal acceptance states exact published version and guest identity; it is distinct from internal review and provider-backed legal signature.

### Rule builder and execution receipt

Trigger → conditions → actions with plain-language summary, affected scope, recipients, dry run and sample matching records. Provide select/input alternatives to dragging nodes. Enabling a rule requires permission and online confirmation of policy. Job history shows attempts, external receipt, unknown outcome, deduplication identity, retry eligibility and stop. No arbitrary scripts or AI actions.

## Content and localization

Use sentence case, direct action labels and consistent domain terminology. Prefer “Issue invoice”, “Record payment”, “Save draft”, “Review conflict”, “Reconnect account”. Never call an invoice “Paid” because an email was sent or a provider link was created. Use “No recorded time” for zero versus “Time not available offline” for missing data. “You do not have access” must not reveal hidden record names.

Arabic content has a fluent-review gate. Use complete translation messages and plural rules, no concatenated fragments. Root direction is RTL; layout uses inline/block start/end. Email, code, URLs, identifiers and mixed-direction amounts are bidi-isolated. Arabic form labels can wrap; no fixed label widths. Font metrics/line-height permit diacritics. Numbers/currency formatting follow personal display preferences; financial parsing and issued snapshots follow their documented contracts. Dates do not silently change calendar systems.

## Component acceptance and ownership

For every new primitive/composite, record visual variants, state matrix, keyboard paths, RTL differences and screenshots in the feature PR. Verify high-contrast, 200% zoom, reduced motion, long values, empty values, mixed-language data, denied actions and failed persistence. Use meaningful behavior tests for focus, mutation and error recovery; visual snapshots supplement them. Do not claim the static reference proves native Electron accessibility or financial correctness.

The foundation lives in F005, domain composites arrive in their feature phases, and F144 is a regression gate. Every later feature must reuse this contract and document intentional changes to it; do not postpone all accessibility or Arabic verification to F144.
