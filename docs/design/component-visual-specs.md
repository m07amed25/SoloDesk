# Exact component visual specifications

Updated 17 October 2026. This extends the [design system](../../DESIGN.md) and [interaction contracts](components-and-interactions.md) with implementation values for buttons, borders, radii and the rest of the component library. Status: design specification only. The app is unchanged, and the existing visual reference illustrates representative screens rather than every variant in this catalogue.

The user-selected spacious layout, paired themes and English/Arabic direction remain fixed. Values below are reviewable design defaults. Components must use the [machine-readable tokens](tokens.json); exceptions must be named variants with a documented purpose. Do not invent a different radius or border for each feature.

## Measurement and inheritance rules

- All measurements are CSS pixels at a 16px root, with `border-box` sizing. Implement scalable text/spacing with rem where appropriate; respect zoom and user text size. A stated height is a **minimum** whenever text wraps or Arabic glyph metrics require more space.
- Standard text action: 48px minimum height; input/select and toolbar/row action: 44px minimum. These are named contexts, not a compact workspace mode. Never make a smaller visible control shrink its accessible hit area below 44×44px.
- Inline padding means logical start/end padding. Mirror direction-dependent layout in Arabic; never mirror the brand mark, code, identifiers or OS-owned controls. Gaps/padding are part of the contract, not whatever an imported primitive happens to ship.
- Label typography is 14/22px, weight500. Primary body text is16/26px. Arabic has natural letter spacing and enough extra line height for its glyphs. Do not force a long translated button label into a clipped 48px box.
- Normal actions have no shadow and no positional movement when pressed. Reserve elevation for overlays. Default opacity is1, including disabled text; use explicit disabled tokens instead of reducing the opacity of the whole component.
- Component anatomy and accessible behavior come from installed shadcn/Base UI primitives. These values define their proposed SoloDesk variants; they do not change primitive APIs or authorize app implementation.

## Border, outline and radius primitives

| Primitive | Exact value | Use |
| --- | --- | --- |
| `stroke.none` | 0px | Filled actions and unbounded navigation |
| `stroke.divider` | 1px solid `border` | Table separators, panel outlines, toolbar dividers; decorative hierarchy |
| `stroke.control` | 1px solid `input-border` | Input, secondary/outline action, unchecked checkbox/radio and meaningful interactive boundary |
| `stroke.invalid` | 1px solid `danger` | Invalid input; error icon and message also required |
| `stroke.drop-target` | 2px dashed `input-border` | Upload/drop region; selected/receptive border becomes `ring` |
| `stroke.selected-control` | 1px solid `primary` | Checked checkbox/radio or segmented control boundary |
| `focus.width` | 2px solid `ring` | Keyboard focus; no shadow-only focus |
| `focus.offset` | 2px | Space between focused control and outline; surface-colored gap around filled controls |
| `focus.region-offset` | -2px | Inset outline for a keyboard-focusable scroll region where an exterior ring would clip |
| `radius.none` | 0px | Table cells, dividers, document page edge and joined inner corners |
| `radius.check` | 4px | Checkbox visual square and code/keycap corners |
| `radius.badge` | 6px | Status tags and small noninteractive tokens |
| `radius.control` | 8px | Buttons, fields, menus, tooltips, toasts and callouts |
| `radius.panel` | 12px | Grouping panels, cards, upload region and Kanban cards |
| `radius.dialog` | 16px | Dialog and inspector outer exposed corners |
| `radius.circle` | 50% | Avatar, radio and circular status marker only |
| `radius.pill` | 999px | Switch track or deliberately named chip variant; never the default for all actions |

Border colors are theme roles, not new per-component hex values. `border` is intentionally subtle and is **not** the meaningful control-outline token. Dividers are1px at normal and high display scale; do not turn them into thick gray rules. A panel may use a separator boundary, while an elevated menu uses its defined shadow; do not add both a heavy outline and a large shadow without a forced-colors/accessibility reason.

When a border appears/disappears between states, reserve its thickness with a transparent border or equivalent box sizing; control content must not shift. No thick colored side stripe marks selected navigation or errors. Selected fill + label/icon/semantic state communicates selection. High contrast uses system-colored outline/borders even when a visual variant normally has none.

## Button anatomy and sizes

| Variant/context | Minimum height × width | Padding block / inline | Radius | Text / icon / gap |
| --- | --- | --- | --- | --- |
| Primary, secondary, outline, soft, ghost, destructive text action | 48px ×88px | 12px /16px; allow intrinsic height growth | 8px |14/22 medium;20px icon;8px gap |
| Toolbar or table-row text action | 44px ×content | 10px /12px |8px |14/22 medium;18px icon;8px gap |
| Icon-only standard |44px ×44px |12px with20px icon |8px |Accessible label; no visible text |
| Icon-only main action |48px ×48px |14px with20px icon |8px |Same fill/focus rules as text variant |
| Full-width form action |48px ×available form width |12px /16px |8px |Label can wrap; do not stretch label letter spacing |
| Split action |48px ×content; menu trigger48px wide |Main12px /16px; trigger14px |8px outer corners,0px shared inner corners |Independent named buttons;1px shared separator |
| Link action |44px hit-area height for standalone controls |10px /0px, with sufficient surrounding hit area |0px visual radius |14/22; inline prose links inherit prose metrics |
| Toggle/segmented item |44px ×content |10px /12px |8px outer group,6px inner item |14/22; text + pressed state |

Width88px is a minimum for standard text buttons, not a requirement to make every label the same width. Never truncate a consequential label such as Issue invoice, Record refund, or Delete workspace. On a narrow dialog/form, stack actions and allow full-width labels. Icon-only actions require an accessible name and tooltip; a brand-new action also needs a visible text alternative.

Reserve the icon slot consistently when a leading icon changes to a busy indicator. Default loading indicator is16px with2px stroke; it uses the current foreground. Use a static busy icon/text under reduced motion. Spinner alone does not explain a long stage. Keep button width stable for transient labels such as Saving…; a persistent stage with a longer translated label can grow or wrap.

## Button appearance matrix

All roles below resolve separately for light and dark. `transparent` means the parent surface is visible, not white. Standard secondary and outline are the same bordered visual recipe in version1; secondary expresses supporting action priority, outline expresses its styling. Soft secondary is a separate named recipe using `secondary` tokens.

| Recipe | Default fill / text / border | Hover | Pressed | Keyboard focus |
| --- | --- | --- | --- | --- |
| Primary |`primary` /`primary-foreground` /0px |`primary-hover`; text unchanged |`primary-pressed`; text unchanged |2px ring,2px offset; no replacement of label or fill |
| Secondary / outline |`surface` /`foreground` /1px `input-border` |`surface-hover`; border unchanged |`muted`; border unchanged |Shared focus outline outside retained border |
| Soft secondary |`secondary` /`secondary-foreground` /0px |`surface-hover`; foreground retained |`muted`; foreground retained |Shared focus outline |
| Ghost |transparent /`foreground` /0px |`surface-hover` |`muted` |Shared focus outline; visible before hover |
| Destructive filled |`destructive` /`destructive-foreground` /0px |`destructive-hover` |`destructive-hover` plus pressed semantic state; no new unvalidated color |Shared ring; label names exact effect |
| Destructive text/menu |transparent /`danger` /0px |`danger-bg`, text remains `danger` |`danger-bg`, text remains `danger` |Shared ring; no full red fill for ordinary overflow item |
| Link |transparent /`link` /0px |Underline,1px thickness,3px offset |Underline retained; no layout movement |Shared ring on standalone link; prose link outline fits text fragment |
| Toggle / selected segment |`accent` /`accent-foreground` /1px `input-border` |Selected fill retained; label remains readable |Selected fill retained; changes only through actual selection |Ring plus `aria-pressed`/selected state; never color alone |

| State | Required visual/behavior change |
| --- | --- |
| Disabled |`disabled` fill, `disabled-foreground` text,1px `border` for bounded variants; no hover/pressed animation or pointer cursor. Ghost/link may remain transparent. Accessible nearby reason; disabled content is never the only explanation. |
| Busy |Keep action recipe and width, replace icon with indicator, truthful stage label and busy semantics. Block duplicate command; announce stage change politely. Busy is distinct from disabled or successful. |
| Success |Show persistent receipt/status outside the button where the outcome matters; do not change an Issue button to Paid. Transient Saved confirmation may return to ordinary action. |
| Failure |Retain user input; show inline recovery/error. Re-enable only safe retries. Unknown financial/provider outcome becomes Checking result, using the same operation, rather than a new attempt. |
| Focus + invalid/destructive |Keep visible ring and the semantic border/text. Focus identifies position; danger identifies consequence/problem. They can coexist. |

Focus has priority over hover styling. Disabled controls do not get active feedback. Busy state does not erase the action's context. A destructive confirmation starts focus on its safe alternative when required by the interaction contract. Button groups have12px gap; label/icon gap8px. Do not stack several primary actions in the same group.

## Fields and selectors: exact geometry

Unless overridden below, fields use `surface` fill, `foreground` text,1px `input-border`,8px radius,44px minimum height,12px inline padding,14/22 input text, and no shadow. Hover retains the meaningful boundary; focus adds the shared outline. Invalid changes border to `danger` and adds linked error text/icon; disabled uses explicit disabled colors. Read-only remains selectable/copyable and readable, with a lock/read-only label where needed, rather than looking broken.

| Component | Dimensions/padding | Internal detail |
| --- | --- | --- |
| Field group |8px label-to-control;8px control-to-help/error;24px between fields;32px between sections |Required/optional marker is textual and associated with label; error/hint12/20px |
| Text/email/URL/password field |44px min;10px block /12px inline |Trailing reveal/clear action44×44px hit area; reserve44px text inset when present |
| Search input |44px min;40px start inset with icon |20px search icon at12px start; clear action44px; named input even if visible label is outside toolbar |
| Number/money/percentage |44px min;12px inline |Unit/currency label has8px separation; whole numeric string bidi-isolated; no wheel changes or implicit precision loss |
| Duration input |44px min |Visible syntax hint; normalized preview below field; time measurement uses tabular figures |
| Textarea |120px min,12px padding,8px radius |Vertical resize/growth within editor;16/26 text for long body; no clipping Arabic marks |
| Rich-text editor |240px min editing region;16px content padding;44px toolbar actions |Outer12px radius,1px control border; toolbar divider1px `border`; code block8px radius/12px padding |
| Select/combobox trigger |44px min;12px start,40px end |16px chevron in44px end zone; don't count decorative chevron as a separate focusable button |
| Select/command result row |44px min;12px inline,8px block;8px icon gap |Selected mark16px; label can wrap; active fill `accent` and text `accent-foreground`; group heading12/20 |
| Multiselect tokens |28px min visible token,6px radius,8px inline |Removal is keyboard accessible; pointer remove target44px when exposed. If targets cannot fit, use summary + full selection editor. |
| Date picker popup |320px preferred width,16px padding,8px radius |44px day/navigation targets,8px month header gap; adapt to viewport; typed date alternative |
| Checkbox |20×20px visual,4px radius,1px control border within44px target |Checked fill `primary`,16px check `primary-foreground`; mixed uses a horizontal mark; label gap12px |
| Radio |20×20px circle,1px control border within44px target |Selected outer border `primary`,10px center dot `primary`; label gap12px |
| Switch |44×24px pill track inside at least44px tall label target |20px circular thumb,2px inset/travel clearance; off track `input-border`, on `primary`; thumb uses paired foreground; explicit on/off text |
| OTP/recovery code |44px min cells,8px radius,8px gap;44px minimum cell width |Single logical code input/group with paste support; do not break accessible reading order; codes isolated LTR |
| File browse/drop region |160px min height,24px padding,12px radius,2px dashed control border |Browse action48px;8px label/detail gap; progress/error list uses actual file state |
| Slider, if a bounded nonfinancial setting needs it |44px interaction height;4px visual track;20px circular thumb |Provide precise input/keyboard alternative. Never use a slider as the only way to enter money or a legal percentage. |

Input adornments remain within the field; clear/reveal buttons never overlap text. A placeholder uses `muted-foreground` at full opacity. Field widths follow the form:640px maximum for ordinary forms,160px suggested minimum for short independent fields, full width at narrow effective sizes. No fixed label width assumes English length.

## Navigation, collections and planning geometry

| Component | Height/spacing | Border/radius/fill detail |
| --- | --- | --- |
| OS titlebar reservation |40px proposed; measure actual overlay inset |1px bottom divider; no renderer imitation of OS-owned controls |
| Global utility bar |64px min;32px inline desktop /16px reflow;16px utility gaps |`surface`,1px bottom divider; actions44px; overflow menu instead of clipping |
| Sidebar |248px expanded /72px collapsed;16px panel padding |`sidebar`,1px inline-end divider; logo40px; no thick active stripe |
| Navigation row |48px min;16px inline;12px icon gap;6px between rows |8px radius; selected `sidebar-accent` + corresponding foreground; icon20px |
| Breadcrumb |44px control targets,8px gaps;14/22 text |No surrounding panel; chevron16px; current record can wrap |
| Tabs |48px min row;16px inline per tab;8px gap |1px baseline divider; selected2px bottom underline and label weight600, inset within row; no content-height jump |
| Segmented view group |44px min items,4px group inset/gap |8px outer radius;1px control border; selected inset uses6px radius |
| Filter toolbar |44px controls,12px gaps,20px below toolbar |No decorative card; removable filters28px visual and44px actionable targets |
| Table header |48px minimum;16px cells;14/22 medium |`surface-subtle`;1px bottom divider; sortable header control44px target |
| Table row |64px minimum;16px inline cells, at least12px block; multiline grows |1px row separator,0px cell radius; hover `surface-subtle`; selected `accent` with actual selection indicator |
| Table outer panel |12px radius;1px `border` |No shadow; scroll inside labeled focusable region; region focus ring inset2px |
| Pagination/footer |56px minimum;16px block/24px inline;12px action gaps |1px top divider; page controls44px; honest loaded/selected counts |
| List/activity item |64px minimum;16px padding;12px icon/avatar gap |1px separator where needed; optional12px list-panel outer radius; no nested cards |
| Kanban column |320px preferred width;16px gap between columns;12px card gap |`surface-subtle`;12px column grouping radius;44px column-header controls |
| Kanban task card |16px padding;12px title/metadata grouping |12px radius,1px `border`,`surface`; no permanent shadow; explicit move control44px |
| Calendar date header |44px min;day/week grid slot32px visual interval minimum |1px grid dividers; events8px radius and44px action target/agenda alternative |
| Timeline task bar |24px visual min within48px task lane |6px bar radius; labeled accessible list/44px controls; dependency1px connector plus readable relation text |
| Capacity grid cell |64px min row,96px min day/summary cell |1px separators; value/unit text + over-allocation label, never a color-only heatmap |
| Avatar |24px metadata,32px row,40px identity,64px profile |Circle; interactive avatar44px hit area; initials fallback and accessible full name |
| Status badge |28px visual min;4px block/8px inline;6px gap |6px radius; semantic fill/text, no border/shadow by default; icon14–16px; actionable badge44px hit area |
| Skeleton |Match final row/field boxes;8px control or12px panel radius |`muted` fill; reserve layout; no shimmer with reduced motion; no fake count or readable placeholder content |
| Empty state |48px block/24px inline;16px heading/body gap;24px action gap |No compulsory card or illustration; actual state and one next action |
| Chart/report |320px suggested chart height,24px content padding,16px legend gap |Plot markers/lines ≥2px where legibility requires; axis1px; readable units/table; no decorative progress ring |

Table row height is a minimum, never a fixed clip. Amounts keep full precision and currency; long record names can wrap or have an accessible full-value path. Horizontal scrolling belongs to an individual collection/plan region. The entire shell must not scroll sideways because a hidden label or min-content width escaped its container.

## Panels, menus, overlays and feedback

| Component | Exact dimensions/spacing | Border/radius/elevation |
| --- | --- | --- |
| Grouping panel/card |24px padding,24px content groups;32px separation from unrelated group |12px radius,1px `border`,`surface`,no shadow |
| Context panel |320px nominal width;24px top/section padding;16px fact gaps |Prefer a simple1px top/section divider; avoid nested card surfaces |
| Dropdown/context menu |240px preferred width;8px panel inset;44px rows;8px row radius |8px outer radius;`surface`,popover shadow; use system outline in forced colors |
| Popover |320px preferred width;16px padding;12px content gaps |8px radius;`surface`,popover shadow; fit viewport with16px minimum outer clearance |
| Tooltip |320px maximum width;8px block/12px inline;12/20 text |8px radius;surface/foreground pairing; popover shadow; no essential instruction hidden here |
| Command palette |640px preferred width;16px outer viewport clearance;44px search/result rows |16px radius;dialog shadow; max-height min(640px,available viewport minus32px); grouped results |
| Dialog |480px standard /640px wide;24px padding;16px body gaps;24px footer gap;12px action gap |16px radius;dialog shadow; no heavy border; viewport16px clearance on every side |
| Alert dialog |Same480px geometry; exact consequence prominent |Same16px radius; danger is in meaning/action, not a full red background |
| Inspector/sheet |480px nominal;440–560px preferred;24px content padding;64px header |16px exposed outer corners;0px attached edge;1px separator or appropriate overlay shadow, not both heavy treatments |
| Toast |360px preferred /viewport minus32px;16px padding;12px icon gap;44px actions |8px radius;surface or semantic fill/text;popover shadow; persistent recovery also exists elsewhere |
| Inline banner/callout |16px block/20px inline;12px icon gap;8px text/action gap |8px radius;semantic fill/text;0px border by default; no thick side stripe |
| Progress bar |6px visual height;track and fill radii3px;12px label gap |Track `muted`,fill `primary`; named stage/count; unknown duration never gets fabricated percentage |
| Separator |1px height or width;16px min surrounding group separation |`border`,0px radius; no semantic meaning conveyed only by separator |
| Keyboard keycap |24px visual height;4px block/6px inline |4px radius,1px `input-border`; supplementary shortcut text, not the only command path |
| Code block |12px padding,16px surrounding spacing;14/22 code text |8px radius,subtle surface;1px border only if grouping needs it; language/Copy action44px |

Use declared shadow tokens exactly; light and dark values differ. Overlay backdrop is `rgba(10,20,32,0.50)` for the standalone reference; use an opaque enough equivalent under high contrast and preserve active dialog contrast. Persistent sheets and ordinary content never depend on backdrop blur. Overlay footers remain reachable with long Arabic copy, small windows or a zoomed viewport.

Dialog opening focuses the proper initial control, trapping focus while the underlying page is inert. Escape closes only a dismissible top surface; undurable edits need their save/discard handling. The visual geometry does not override these behavioral rules. One tooltip cannot sit above and outside an unrelated active dialog.

## Business-component specifics

| Composite | Visual anatomy | State/border detail |
| --- | --- | --- |
| Timer indicator |44px min utility control;20px state icon;8px gaps;tabular14px duration;project label |8px radius;subtle surface;focus ring; explicit Running/Paused/Needs review text, no blinking |
| Save/sync status |44px accessible trigger,16px icon,8px gap,12/20 supporting label |Semantic icon/text; no border required in utility bar; opens durable state explanation |
| Financial review summary |24px grouped sections,16px total rows,20/30 final total |1px divider above total;12px panel radius;only one48px commit action; currency never clipped |
| Invoice/document page |White paper with dark ink;32px screen-preview padding;print geometry belongs to document template |0px actual paper radius;8px screen preview frame allowed;1px preview separator, no dark-theme document inversion |
| Conflict diff |24px section gaps;16px field rows;44px resolution choices |12px grouped panel;1px separators;changed labels/icons + semantic fill, not color-only highlighting |
| Approval/source allocation |64px source rows,16px cell padding,24px resulting-summary gap |Read-only evidence vs selectable source clearly separated;locked icon plus reason; exact units preserved |
| Job/connection row |64px minimum,20px icon,12px gap,44px repair action |1px separator;state label + receipt/stage;no fake percent or decorative activity pulse |
| Rule builder step |24px padding,16px condition gaps,44px controls,24px step gaps |12px grouping radius,1px border;logical sequence labels with form alternatives;no arbitrary script canvas |

Document-page padding above is a screen specimen value, not a statutory print margin. Issued invoice PDFs use the approved saved template, language, pagination and exact totals. Fonts, Arabic shaping, selectable text, page breaks and commercial/legal profiles remain independent QA gates.

## Composition details that must not be improvised

Page header to primary content32px; heading to supporting copy8px; section heading to its content16px; unrelated sections32px. Form labels/fields/messages stay visually grouped; do not apply the same32px gap everywhere. Global content padding32px,48px on wide screens,16px when reflowed. Tables, sidebars, dialog footers and editor actions use their named local values.

Native scrollbars remain usable. Do not replace them with a custom narrow hover-only thumb. Text selection uses `selection`/`selection-foreground`; caret uses `primary`; selected rows use `accent`; keyboard focus uses `ring`. These are four different states. A text cursor does not imply saved data, and selected text does not imply record selection.

Motion uses120ms fast,180ms standard,240ms panel and120ms exit with the declared easing. No animation changes border thickness, width or font size during ordinary hover/press. Avoid scaling controls away from their aligned hit area. Reduced motion removes spatial travel and shimmer; feedback still appears. Busy, skeleton and provider progress remain truthfully labeled.

Tooltip delay is500ms for a fresh pointer hover, immediate on keyboard focus, and100ms to close after leaving both trigger and tooltip; Escape dismisses it. Informational toasts default to5000ms, pause on focus/hover, and retain any necessary receipt/recovery elsewhere. Actionable failures persist in their source area. Show loading skeletons only after200ms of unresolved work to avoid a flash for a fast read; reserve dimensions from the start. These are proposed interaction timings, not network or autosave guarantees. A focus indicator appears immediately, and save/timer success appears only after the relevant durable result.

## Per-component completeness checklist

Each feature PR documents and verifies the applicable items below against its named variant. “Same as library default” is insufficient when that default has not been compared with this contract.

- Anatomy, text/icon roles, accessible name, min-height/width, padding, gap, stroke and radius.
- Light/dark default, hover, pressed, keyboard focus, selected, disabled, busy and invalid states; read-only/dirty/immutable where relevant.
- Color role pairing, visible non-color state cue, focus placement/clipping and forced-colors behavior.
- Pointer target, keyboard path, focus order/return, hover/context-menu/drag alternatives and screen-reader semantics.
- Arabic wrapping/shaping, bidi isolation, translated validation, logical positioning and correct nonmirrored assets/native controls.
- Narrow-window/zoom behavior, long and missing data, loading/empty/filtered-empty/offline/partial/error/recovery states.
- Save/durable-local/cloud acknowledgment, permission rejection, unknown transaction outcome and eligible retry behavior.
- Screenshot and behavioral evidence for the exact build; user final approval under the feature PR plan.

This is the component specification baseline for the current roadmap. A future component not represented here must receive an explicit specification and extension to the token catalogue before its feature PR is approved; “all things” is enforced by the completion contract rather than an unverifiable promise about future UI.
