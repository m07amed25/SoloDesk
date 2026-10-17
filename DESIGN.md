---
name: SoloDesk
description: Spacious, bilingual desktop workspace for freelance delivery and business operations.
colors:
  primary: "#285BCB"
  primary-hover: "#214EAF"
  primary-pressed: "#1B4195"
  primary-ink: "#FFFFFF"
  selected-ink: "#214FBD"
  canvas: "#F5F7FA"
  surface: "#FFFFFF"
  graphite: "#18212F"
  silver: "#E9EEF5"
  secondary-ink: "#536173"
  divider: "#D5DDE7"
  control-border: "#77869A"
  dark-canvas: "#10151D"
  dark-surface: "#171E28"
  dark-ink: "#EDF2F8"
  dark-primary: "#9EBEFF"
  dark-primary-ink: "#101A2A"
typography:
  title:
    fontFamily: "Inter, Noto Sans Arabic, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.357
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, Noto Sans Arabic, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, Noto Sans Arabic, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.571
    letterSpacing: "normal"
rounded:
  none: "0px"
  checkbox: "4px"
  keycap: "4px"
  progress: "3px"
  control: "8px"
  panel: "12px"
  dialog: "16px"
  badge: "6px"
  circle: "50%"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
---

# SoloDesk UI design system

## Overview

Version 1 proposal, 17 October 2026. **Design documentation and reference only; this system is not applied to the running app.** The supplied SoloDesk logo and confirmed product constraints are binding. The user selected a familiar productivity-app direction, with **Linear, Notion and GitHub** as quality references, **spacious controls**, **light and dark themes with System default**, and **English/Arabic with full RTL**. Exact token/font/geometry recommendations remain reviewable; no legal or financial policy is decided by visual design.

SoloDesk should feel calm, precise and dependable over a full working day. The graphite-and-silver identity comes from the logo. Blue identifies actions and selection; semantic colors communicate meaningful conditions. Familiar sidebar navigation, accessible forms, stable tables and readable documents carry the product. Avoid decorative chrome that competes with work. Borrow reference products' consistency and care, not their brand assets or layouts wholesale.

Read this file first when creating UI. [Full design index](docs/design/README.md) links the machine-readable [tokens](docs/design/tokens.json), [component behavior](docs/design/components-and-interactions.md), [73 screen families](docs/design/screens.md), [151-phase coverage](docs/design/phase-coverage.md), [QA/handoff](docs/design/quality-and-handoff.md), [direction brief](docs/design/brief.md) and [visual reference](docs/design/reference.html). Functional specs own domain behavior; tokens own exact visual values; components own shared interactions; screen contracts own composition. If these disagree, resolve the conflict and update the artifacts together rather than inventing a local exception.

### Brand assets

Preserve [full logo](public/solodesk_logo_transparent.png) and [symbol](public/solodesk_no_bg_no_text.png) as supplied. Do not stretch, recolor, crop, mirror, redraw or bake backgrounds into these originals. The folded metallic S remains a brand asset, not a motif to repeat in charts or backgrounds. Both supplied PNGs appear to have some colored edge pixels; clean vector/master artwork is a production asset gate, not authorization to edit them now.

Use the full lockup on a light solid surface when its black wordmark is legible. Suggested minimum full-lockup width: 160px; retain the original aspect ratio. Use the symbol at 28–40px in app chrome, 64–96px in access/setup, with clear space at least one quarter of the displayed symbol width. At small sizes, verify edge quality and silhouette; a dedicated approved simplified icon may be needed. Logo mark plus accessible text “SoloDesk” is an acceptable provisional chrome lockup. Decorative duplicates use empty alt; a brand link has an accessible destination name.

On dark surfaces, use the original symbol on a small light/silver plate with clear space and render the word “SoloDesk” as accessible theme-colored text, clearly a UI lockup. Do not invert the full PNG or pretend a light wordmark asset has been supplied. Installer/tray icons require separately approved per-OS exports and dark/light legibility checks. A full legal invoice uses the seller's identity/logo; SoloDesk branding must not replace the freelancer's business identity.

## Colors

Semantic roles are stable across themes; raw hex colors stay out of feature components. [tokens.json](docs/design/tokens.json) is the complete paired light/dark specification. Frontmatter above is a portable seed of key roles, not a second runtime theme. The table below repeats the central exact values for review; changes must stay synchronized.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Background | `#F5F7FA` | `#10151D` | Main canvas |
| Surface | `#FFFFFF` | `#171E28` | Working surfaces, dialogs and editors |
| Subtle surface | `#EEF2F7` | `#1D2633` | Secondary areas |
| Foreground | `#18212F` | `#EDF2F8` | Main text and important icons |
| Muted foreground | `#536173` | `#B1BED0` | Supporting text and placeholders |
| Divider | `#D5DDE7` | `#344156` | Decorative separators; not sufficient alone for meaningful control boundaries |
| Input border | `#77869A` | `#7889A3` | Meaningful input/control outline |
| Primary | `#285BCB` | `#9EBEFF` | Main action fill and focus ring |
| Primary foreground | `#FFFFFF` | `#101A2A` | Text/icons on primary action |
| Primary hover | `#214EAF` | `#B7CEFF` | Pointer hover |
| Primary pressed | `#1B4195` | `#83A9F0` | Pressed action |
| Selected surface | `#E7EEFE` | `#263D62` | Selected row/tab context |
| Selected foreground | `#214FBD` | `#C5D8FF` | Selected text/icon |
| Sidebar | `#E9EEF5` | `#141D2B` | Secondary shell plane |
| Sidebar foreground | `#26364D` | `#D8E3F2` | Shell text/icons |
| Link | `#214FBD` | `#B7CEFF` | Navigation in prose and details |

### Semantic status pairs

| Meaning | Light text / fill | Dark text / fill | Examples |
| --- | --- | --- | --- |
| Success | `#176843` / `#E6F5ED` | `#86DFB1` / `#17382B` | Acknowledged save, approved review, settled balance |
| Warning | `#815000` / `#FFF2D4` | `#F1C674` / `#3B2D16` | Overdue, needs review, quota approaching |
| Danger | `#A92E3A` / `#FCEAEC` | `#FFADB8` / `#42232C` | Failed write, rejected operation, destructive consequence |
| Information | `#2458AD` / `#EAF1FF` | `#ADCAFF` / `#203652` | Queued work, online requirement, informational context |
| Neutral | `#4E5C70` / `#E9EEF5` | `#C0CCDD` / `#293548` | Draft, archived, not sent |

State text and icon accompany color. Running timer uses explicit running/paused labels and controls, not a green dot alone. Invoice issue, delivery, settlement, dispute, overdue and sync are independent dimensions. Do not flatten them into one badge.

Data series use six named chart tokens with paired theme values. Keep category-to-color mapping stable within a report, include a legend, and vary marker/dash when necessary. Forecasts use dashed lines and an assumption label; negative or missing values are not simply colored red. Chart meaning, scales, currency and table alternative are mandatory. Never total different currencies without an explicit conversion basis.

### Theme, high contrast and focus

Persist personal preference as System/Light/Dark; system changes update the UI without losing editor state. Resolve before the first painted frame where possible. Print/export documents use their saved light document palette regardless of shell theme. Logo treatment is mode-aware; OS high-contrast/forced-colors retains visible boundaries and native system colors.

Use a 2px solid focus outline with 2px offset; the outline sits against the surface, including for a filled primary button. Focus never depends on shadow alone. Selection and caret are themed; preserve native scrollbar accessibility and use unobtrusive theme-compatible native scrollbars rather than a custom draggable imitation. Text contrast target is 4.5:1; meaningful boundaries and focus indicators 3:1, with documented exceptions and actual pair checks in [validation](docs/design/validation.md). These are design targets, not current app conformance.

## Typography

Recommend **Inter** for Latin and **Noto Sans Arabic** for Arabic, self-hosted after exact source/license/version review. Use 400/500/600 weights; avoid synthetic bold and decorative display faces. For mixed language, allow script-specific fallback without shifting layout. UI preview uses local system fonts until font files are deliberately added; no fonts or packages are installed by this design task.

| Role | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Access/setup title | 36 / 46px | 600 | Short onboarding headings only |
| Page title | 28 / 38px | 600 | Screen identity |
| Section | 20 / 30px | 600 | Major content groups |
| Body | 16 / 26px | 400 | Explanations, editors and roomy content |
| Label/control | 14 / 22px | 500 | Form labels, buttons, navigation |
| Table | 14 / 22px | 400 or 500 | Dense data within spacious rows |
| Caption | 12 / 20px | 400 | Supplementary metadata, never primary tasks or errors |

Use rem equivalents based on a 16px root that respects user zoom. Arabic uses natural script spacing and approximately 1.12× the Latin line height where shaping needs it; verify actual glyph metrics rather than forcing a fixed clipped box. Never apply uppercase or negative tracking to Arabic. Latin titles may use -0.02em; body tracking is normal. Prose measure is at most 70ch. Tabular lining numbers are used for amounts, time and aligned report values; monospace is limited to code, identifiers and appropriate measurements.

Use sentence case. Main labels are short verbs with objects. Dates, currency and digits use explicit locale/timezone preferences; text direction never changes stored numbers or issued document language. User names/business names remain their actual content. Isolate email, code, URLs and invoice IDs with bidi-aware markup. Arabic translations, error messages, native menus and PDFs require fluent review; font coverage alone is not localization.

## Layout

### Desktop anatomy

- Native titlebar/overlay: proposed 40px reservation, measured for actual OS controls. App title/workspace context may appear there; renderer buttons stay outside drag regions. macOS traffic lights retain OS placement, as do Windows/Linux controls. Arabic does not mirror native controls.
- Sidebar: 248px expanded; 72px collapsed. Navigation rows at least 48px. Workspace/account/secondary destinations remain discoverable; active item uses tint and text weight, without a thick colored edge.
- Global utility bar: 64px with breadcrumb/context, search, timer, notifications and sync; wrap or move lesser utilities to a named menu at reduced width. No fake OS window controls in the renderer.
- Main area: 32px padding, 48px on wide screens; section gap 32px, related controls 8–12px. Working content max 1600px, centered within larger windows. Forms max 640px; prose max 70ch.
- Optional context column: 320px; inspector 440–560px with 480px nominal. Neither can force the main task below usable width. Collection header precedes filters; filters precede the scoped data.

Root layout uses one work canvas rather than nested decorative cards. Panels communicate a real grouping or elevation. Default table rows are at least 64px, controls at least 44px and primary actions 48px. Spaciousness comes from row/group spacing as well as larger fonts. Tables stay efficient through filtering, columns and detail views, rather than shrinking text below 14px.

### Scale and adaptive behavior

Spacing scale: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Use 4px increments for alignment; gaps communicate grouping. Proposed minimum normal desktop window: 1024×768 CSS px, subject to OS support approval. Verify 1280×800, 1440×900, 1920×1080 and 200% zoom.

Below 1400px effective width, stack the context column to keep spacious work tables readable. Below 1100px, collapse the sidebar unless explicitly expanded in a temporary overlay. Below 720px effective width, use accessible overlay navigation, full-page details, stacked field groups and overflow utility menu. These are reflow rules for zoom/small windows, not a native-mobile roadmap. Tables may scroll within a named region; keep the row identity and important actions reachable. Do not create horizontal scrolling for the entire app shell.

Portal uses a separate responsive guest shell with 390×844 and tablet checks, a 960px content maximum and a 70ch reading column where appropriate. Signed documents retain their selected page format and snapshot facts. Three-page bilingual invoice QA is required; dark app mode never produces an unreadable dark invoice by accident.

### Navigation, direction and focus

Use logical start/end padding, inset and text alignment. RTL places the sidebar at inline start, reverses directional breadcrumb/flow arrows and retains semantic DOM reading order. Logos, code, numeric chart semantics and OS controls do not mirror. Lists and tables have explicit bidi isolation; numbers align consistently. Moving a task has a keyboard form/menu alternative. On route change, focus the meaningful page heading; returning to a list restores the user's position. No hover-only essential action.

### Motion and layering

Motion communicates a state change, never delays a routine task. Fast feedback 120ms, standard reveal 180ms, larger panel 240ms, exit 120ms; easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. No repeated page entrance choreography, blinking timer, animated financial total or decorative pulse. Reduced motion removes translation/scale and skeleton shimmer while preserving immediate feedback. Timer ticks do not animate or announce every second.

Layer contract: base 0, sticky toolbar 10, dropdown 30, modal backdrop 40, dialog 50, toast 60, tooltip 70. Use portals where needed to escape clipping; z-index is not a substitute for correct focus/inert behavior. Only the top applicable overlay handles Escape. Inline messages carry persistent recovery state; a toast never becomes the only receipt for issued money.

## Elevation & Depth

Use flat tonal surfaces and a single 1px boundary for working panels; reserve shadows for floating menus/dialogs. Do not combine a heavy border and a large shadow around ordinary tables. Light popover: `0 8px 24px rgba(24,33,47,0.14)`; light dialog: `0 20px 64px rgba(24,33,47,0.20)`. Dark popover: `0 8px 24px rgba(0,0,0,0.32)`; dark dialog: `0 20px 64px rgba(0,0,0,0.48)`. Backdrop is a simple dimming layer, not decorative frosted glass. No metal textures across the workspace; the supplied metallic logo carries that material.

## Shapes

Control radius 8px; grouping panel 12px; dialog 16px; status badge 6px; checkbox/keycap 4px; progress track 3px. Joined inner corners and table cells use0px. Avatars/radios use50%; switch tracks or explicitly named pill variants use999px. Never turn every panel and button into capsules. Icons use the installed Lucide family at consistent stroke/size, usually 18–20px in controls and 16px in metadata. Do not use emoji/Unicode stand-ins as interface icons. Decorative artwork is unnecessary for core operations.

Controls have accessible names, real state semantics and generous hit areas. Checkbox visual size may be 20px inside a 44px label target; navigation/action targets remain large. The spacious 44px design target exceeds the WCAG 2.2 AA minimum criterion rather than being mislabeled as its exact threshold.

## Components

[Component and interaction contracts](docs/design/components-and-interactions.md) and the [exact visual catalogue](docs/design/component-visual-specs.md) are normative for every feature. Together they specify actions; fields/numeric/date/file/rich text; navigation; tables/boards/calendar/timeline/capacity; charts; overlays; feedback; and specialized timer, sync, allocation, review and rule-builder composites. The visual catalogue supplies explicit button variants/states, border widths/styles/colors, radii, dimensions, padding, gaps and icon anatomy; each new component must satisfy its completeness checklist.

Primary buttons use primary/foreground tokens and 48px height. Secondary/ghost actions share shape and focus behavior. Inputs have persistent labels, 44px minimum height, meaningful border and associated hints/errors. Table rows are 64px minimum with stable IDs, explicit sorting/selection scope, full-value access and independent overflow menus. Dialogs use focus trapping/return and fit the available viewport. Data charts expose units, formulas, as-of/currency and an accessible table.

### Tailwind/shadcn adoption contract

At implementation, expose semantic CSS variables and map them through Tailwind's theme layer; the reference JSON is not currently imported by the app. Preserve the installed Base UI/shadcn variant behavior. Resolve every wrapper's token needs instead of relying on an unrelated generated palette.

| Wrapper token(s) | Design token source |
| --- | --- |
| `background`, `foreground` | Same-named paired roles |
| `card`, `popover` | `surface` |
| `card-foreground`, `popover-foreground` | `foreground` |
| `primary`, `primary-foreground` | Same-named paired roles; hover/pressed use dedicated roles |
| `secondary`, `secondary-foreground` | Same-named paired roles |
| `muted`, `muted-foreground`, `accent`, `accent-foreground` | Same-named paired roles |
| `border` | Decorative `border`; input/checkbox boundaries use the meaningful control outline |
| `input` | `input-border` |
| `ring` | `ring`; visible outline with offset, including forced-colors fallback |
| `destructive`, `destructive-foreground` | Same-named paired roles; ordinary error text uses `danger` |
| `chart-1`–`chart-6` | Same-named series roles, legend/marker/table required |
| `sidebar`, `sidebar-foreground`, `sidebar-accent`, `sidebar-accent-foreground` | Same-named paired roles |
| `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-border`, `sidebar-ring` | `primary`, `primary-foreground`, `border`, `ring` respectively |
| Radius variables | Control8px, panel12px, dialog16px, badge6px; do not derive every component from an arbitrary global capsule radius |

Semantic business aliases such as `status-warning` reference the paired warning text/fill rather than introducing new hex values. Component variants centralize size, focus, dirty/busy/invalid/read-only behavior; feature screens compose those variants. Verify exact installed primitive APIs and Tailwind mappings when F005 adopts the system.

Required reusable business composites: workspace context, persistent timer, save/sync status, conflict diff, source reservation/allocation, financial review/receipt, document preview, versioned review/acceptance, job progress/unknown outcome and scoped automation preview. These prevent every feature from inventing a different meaning for “saved”, “approved” or “paid”.

Every screen uses the [shared state contract](docs/design/components-and-interactions.md) and [screen inventory](docs/design/screens.md). Inspectors/pages contain real data and recoverable forms, not static mock panels. Disabled actions explain why; restricted finance fields disappear across main content, search/counts/tooltips and exports. Offline-capable drafts show local persistence honestly; issuance, financial posting and external sending use authoritative online flows.

## Do's and Don'ts

- **Do** preserve the supplied logo and use accessible text plus a light plate when the original cannot read on dark chrome.
- **Do** keep spacious spacing, readable data and clear single primary actions; use shared Tailwind/shadcn tokens instead of feature-specific palettes.
- **Do** give English and Arabic equal behavior, focus, typography, validation and document quality.
- **Do** separate local durability, cloud acknowledgment, review, issuance, delivery and settlement states.
- **Do** show currency, exact source/version, formula and as-of context wherever interpretation depends on them.
- **Do** update tokens, component contracts, screen map, contrast evidence and relevant PR QA together.
- **Don't** invent revenue, compliance, availability, free-service capacity or pricing claims in the reference or empty state.
- **Don't** replace OS window controls with decorative renderer buttons, hide actions behind drag/hover alone, or let a custom titlebar block native interaction.
- **Don't** reinterpret immutable issued documents as editable forms or retry unknown financial outcomes as new commands.
- **Don't** add AI product features, install packages, provision services or implement the app as a side effect of this design specification.
- **Don't** treat a static/generated mockup as proof of accessibility, RTL, security, persistence or financial correctness.
