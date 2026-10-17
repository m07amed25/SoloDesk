# UX, accessibility, English and Arabic

Status: proposed interaction specification. English and Arabic with full RTL are confirmed first-release requirements. This defines behavior and content contracts, not an approved visual theme. Tailwind CSS and shadcn/ui remain mandatory.

## Locale and direction contract

UI locale is personal and may differ between members of the same workspace. Document locale is explicitly selected per proposal/invoice/contract and frozen in the issued snapshot. Workspace defaults and client preferences suggest values; they never silently rewrite a saved document. Switching UI language does not translate user-entered legal names or alter invoice numbers/amounts.

Store ISO instants/calendar dates, stable enum IDs, currency codes and exact numeric strings independently of translated labels. Display dates/numbers using chosen locale/timezone and an explicit digit preference. Parse supported Arabic/Latin digits and decimal/group separators without silently changing an ambiguous financial input; show normalized preview before commit. Calendar system is proposed Gregorian initially; alternative calendar display requires separate conversion fixtures and never changes statutory dates implicitly.

Use root direction, logical CSS properties, appropriate text alignment and bidirectional isolation. Mirror navigation/flow arrows where semantic; do not mirror logos, code, charts' numeric meaning or OS-owned window controls indiscriminately. Emails, URLs, code, invoice identifiers and mixed-language names remain readable inside RTL paragraphs. Tables keep stable semantic column order with localized visual order. Cursor movement, text selection, shortcuts, dialogs and scroll behavior require native testing.

All shipped strings include validation, notifications, errors, empty states, menu/tray items, emails, PDFs, dates, onboarding and updater messages. Translation keys use stable IDs and parameterized plural/gender-safe messages; no concatenated sentence fragments. Arabic review requires a fluent reviewer, not machine-only sign-off. Fonts must have approved redistribution rights and Arabic shaping support; PDF fonts are embedded/subset as needed and tested offline.

## Editor and status rules

Every editor distinguishes unsaved, saved locally, queued, synchronized, conflict, rejected and failed. Unsaved navigation offers save/discard/continue. Autosave announces only after durable local commit. Financial finalization displays an online preview of exact parties, currency, policy, totals and consequences; keyboard focus moves predictably on success/failure.

Every list covers loading, genuine empty workspace, no filter matches, stale offline cache, partial permissions, read failure and populated state. Error messages name the next recovery action and preserve valid inputs. Error summaries link to fields; status is conveyed by text/icon as well as color. No fictional earnings or clients appear as real data; demo workspace is isolated and removable.

## Navigation and interaction

Workspace switcher, search/command palette, timer, notifications, sync status and language control remain discoverable. Breadcrumbs/deep links open the correct workspace after authentication. Provide app-menu and button alternatives for global shortcuts, tray, right-click, hover and drag. Undo is scoped to reversible revisions, not final financial issuance. Dangerous operations preview effects and require explicit confirmation; ownership transfer/deletion/credential changes require reauthentication where specified.

## Accessibility acceptance

Target WCAG 2.2 AA principles for renderer/portal plus native desktop checks. Verify keyboard-only navigation, visible unobscured focus, screen-reader names/roles/states, correct reading order in both directions, contrast, reduced motion, 200% zoom, large text, high contrast, pointer target size and usable drag alternatives. Automated checks supplement manual NVDA/VoiceOver/Linux screen-reader testing; they do not prove conformance. Use semantic elements in shadcn wrappers rather than removing their accessible behavior.

The 640×520 shell minimum is current bootstrap behavior, not the approved full-product minimum. Proposed supported test sizes: 1024×768, 1280×800, 1920×1080 plus 200% scaling; final minimum is Q-11. Tables may scroll horizontally with labels/actions preserved. Modals must fit a reduced viewport; focus restores to the invoking control. Timer updates do not flood live regions; announce state changes and user-requested elapsed time.

## Acceptance fixtures

English/Arabic long legal names; mixed-direction email and invoice IDs; Arabic digits in a price; combining marks; 10-line task title; emoji; blank/unknown tax identifier; three-page bilingual invoice; screen reader on Kanban movement; canceled native save dialog; a failed sync while editor stays open; and an offline invoice draft that clearly cannot yet be issued. Exported PDFs must show correct Arabic shaping, selectable text, consistent totals and no clipped continuation rows.

Primary accessibility reference: [WCAG 2.2](https://www.w3.org/TR/WCAG22/). This is the verification target, not a current compliance claim.
