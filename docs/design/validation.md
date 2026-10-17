# UI design validation evidence

Checked 17 October 2026. Scope: documentation, token pairs and separate reference only; not app functionality or a conformance certificate.

## Reproducible artifact checks

Run `python3 docs/design/validate.py --write` from the repository root. Uses Python standard library and the installed Node parser; no packages or services are installed.

88 declared contrast pairs pass; 25 component size recipes and 9 appearance recipes consistent; 73 screen families; 151 phases; 139 requirements covered by their phase plan; 267 local links; reference JavaScript syntax valid.

The phase map covers the whole development plan, including nonvisual foundations/release gates. Screen contracts inherit domain requirements; counts alone do not prove screen or feature implementation. Both themes expose the same semantic roles.

## Observed reference interactions

- Theme and English/Arabic controls change appearance/direction; Arabic work dates localize (for example `١٩ أكتوبر`).
- Task search shows filtered-empty and reset; selection announces its count.
- Specimen dialog opens, Escape closes, and focus returns to New task.
- Reference navigation controls open the narrow reference menu and switch sample views.
- Invoice specimen totals USD 62.07 under the documented example; document paper stays white inside the dark shell.
- Online/offline/conflict examples use distinct text; no false cloud save when offline.
- Narrow 640px CSS viewport has document width 625px excluding scrollbar, with table-level scrolling; the hidden-label overflow found during QA was corrected.
- Browser console error check returned no errors during the exercised paths.

## Visual evidence and limits

Final representative viewport captures are stored under [previews](previews/). Wide captures use nominal 1440×900 CSS viewports and narrow captures 640×900; native screenshot pixel area excludes browser/scrollbar chrome. English light/dark, Arabic dark work, Arabic light finance and narrow reflow are included. Full-page RTL capture was defective in the browser harness, so final RTL evidence uses visible viewport captures. These are reference screenshots, not native app or portal release evidence.

The original reference review outcome and the documentation-only component-detail follow-up scope are recorded in [review](review.md). The reference was not changed in that follow-up; its new token recipes received source/consistency checks. The mechanical design detector ran once for the reference. Explicit titlebar block padding and selected-color documentation addressed its relevant findings. Its generic Inter-familiarity warning is accepted under the user-selected familiar productivity direction; system fallbacks are labeled.

Not verified here: installed/bundled custom fonts, fluent Arabic sign-off, real screen readers, actual 200% browser zoom, Windows/macOS/Linux native controls, native database/IPC/sync/permission behavior, legal finance profiles, cloud integration, PDF shaping/pagination, packaged release performance or business tests. These remain per-feature PR gates. The reference is illustrative and cannot prove them. Original logos and running app source were not modified.

## Declared contrast pairs

Thresholds apply to the named roles/pairs only. Ratios use the WCAG relative-luminance formula and full-precision comparison; displayed ratios are rounded after acceptance. Decorative dividers are not claimed as valid control outlines.

| Theme | Foreground role | Background role | Ratio | Required |
| --- | --- | --- | --- | --- |
| light | `foreground` | `background` | 15.08:1 | 4.5:1 |
| light | `foreground` | `surface` | 16.19:1 | 4.5:1 |
| light | `foreground` | `surface-subtle` | 14.40:1 | 4.5:1 |
| light | `muted-foreground` | `background` | 5.88:1 | 4.5:1 |
| light | `muted-foreground` | `surface` | 6.32:1 | 4.5:1 |
| light | `muted-foreground` | `muted` | 5.42:1 | 4.5:1 |
| light | `primary-foreground` | `primary` | 6.09:1 | 4.5:1 |
| light | `primary-foreground` | `primary-hover` | 7.57:1 | 4.5:1 |
| light | `primary-foreground` | `primary-pressed` | 9.39:1 | 4.5:1 |
| light | `secondary-foreground` | `secondary` | 10.49:1 | 4.5:1 |
| light | `accent-foreground` | `accent` | 6.19:1 | 4.5:1 |
| light | `link` | `surface` | 7.20:1 | 4.5:1 |
| light | `link` | `background` | 6.71:1 | 4.5:1 |
| light | `destructive-foreground` | `destructive` | 6.45:1 | 4.5:1 |
| light | `destructive-foreground` | `destructive-hover` | 8.17:1 | 4.5:1 |
| light | `success` | `success-bg` | 6.02:1 | 4.5:1 |
| light | `warning` | `warning-bg` | 6.14:1 | 4.5:1 |
| light | `danger` | `danger-bg` | 5.77:1 | 4.5:1 |
| light | `info` | `info-bg` | 6.03:1 | 4.5:1 |
| light | `neutral-status` | `neutral-status-bg` | 5.83:1 | 4.5:1 |
| light | `sidebar-foreground` | `sidebar` | 10.49:1 | 4.5:1 |
| light | `sidebar-accent-foreground` | `sidebar-accent` | 5.68:1 | 4.5:1 |
| light | `selection-foreground` | `selection` | 12.88:1 | 4.5:1 |
| light | `input-border` | `surface` | 3.71:1 | 3:1 |
| light | `input-border` | `background` | 3.46:1 | 3:1 |
| light | `ring` | `surface` | 6.09:1 | 3:1 |
| light | `ring` | `background` | 5.67:1 | 3:1 |
| light | `ring` | `muted` | 5.22:1 | 3:1 |
| light | `ring` | `sidebar` | 5.22:1 | 3:1 |
| light | `chart-1` | `surface` | 6.09:1 | 3:1 |
| light | `chart-2` | `surface` | 4.91:1 | 3:1 |
| light | `chart-3` | `surface` | 5.37:1 | 3:1 |
| light | `chart-4` | `surface` | 5.23:1 | 3:1 |
| light | `chart-5` | `surface` | 5.74:1 | 3:1 |
| light | `chart-6` | `surface` | 5.42:1 | 3:1 |
| light | `foreground` | `surface-hover` | 13.63:1 | 4.5:1 |
| light | `foreground` | `muted` | 13.88:1 | 4.5:1 |
| light | `secondary-foreground` | `surface-hover` | 10.30:1 | 4.5:1 |
| light | `danger` | `surface` | 6.69:1 | 4.5:1 |
| light | `danger` | `background` | 6.23:1 | 4.5:1 |
| light | `ring` | `accent` | 5.24:1 | 3:1 |
| light | `input-border` | `surface-hover` | 3.12:1 | 3:1 |
| light | `input-border` | `muted` | 3.18:1 | 3:1 |
| light | `input-border` | `accent` | 3.19:1 | 3:1 |
| dark | `foreground` | `background` | 16.27:1 | 4.5:1 |
| dark | `foreground` | `surface` | 14.89:1 | 4.5:1 |
| dark | `foreground` | `surface-subtle` | 13.55:1 | 4.5:1 |
| dark | `muted-foreground` | `background` | 9.72:1 | 4.5:1 |
| dark | `muted-foreground` | `surface` | 8.90:1 | 4.5:1 |
| dark | `muted-foreground` | `muted` | 6.97:1 | 4.5:1 |
| dark | `primary-foreground` | `primary` | 9.36:1 | 4.5:1 |
| dark | `primary-foreground` | `primary-hover` | 11.04:1 | 4.5:1 |
| dark | `primary-foreground` | `primary-pressed` | 7.40:1 | 4.5:1 |
| dark | `secondary-foreground` | `secondary` | 10.64:1 | 4.5:1 |
| dark | `accent-foreground` | `accent` | 7.60:1 | 4.5:1 |
| dark | `link` | `surface` | 10.61:1 | 4.5:1 |
| dark | `link` | `background` | 11.58:1 | 4.5:1 |
| dark | `destructive-foreground` | `destructive` | 9.55:1 | 4.5:1 |
| dark | `destructive-foreground` | `destructive-hover` | 11.07:1 | 4.5:1 |
| dark | `success` | `success-bg` | 8.07:1 | 4.5:1 |
| dark | `warning` | `warning-bg` | 8.31:1 | 4.5:1 |
| dark | `danger` | `danger-bg` | 7.90:1 | 4.5:1 |
| dark | `info` | `info-bg` | 7.40:1 | 4.5:1 |
| dark | `neutral-status` | `neutral-status-bg` | 7.61:1 | 4.5:1 |
| dark | `sidebar-foreground` | `sidebar` | 13.05:1 | 4.5:1 |
| dark | `sidebar-accent-foreground` | `sidebar-accent` | 7.60:1 | 4.5:1 |
| dark | `selection-foreground` | `selection` | 7.63:1 | 4.5:1 |
| dark | `input-border` | `surface` | 4.71:1 | 3:1 |
| dark | `input-border` | `background` | 5.15:1 | 3:1 |
| dark | `ring` | `surface` | 8.99:1 | 3:1 |
| dark | `ring` | `background` | 9.82:1 | 3:1 |
| dark | `ring` | `muted` | 7.04:1 | 3:1 |
| dark | `ring` | `sidebar` | 9.08:1 | 3:1 |
| dark | `chart-1` | `surface` | 8.99:1 | 3:1 |
| dark | `chart-2` | `surface` | 9.61:1 | 3:1 |
| dark | `chart-3` | `surface` | 7.89:1 | 3:1 |
| dark | `chart-4` | `surface` | 9.55:1 | 3:1 |
| dark | `chart-5` | `surface` | 8.45:1 | 3:1 |
| dark | `chart-6` | `surface` | 8.91:1 | 3:1 |
| dark | `foreground` | `surface-hover` | 11.50:1 | 4.5:1 |
| dark | `foreground` | `muted` | 11.67:1 | 4.5:1 |
| dark | `secondary-foreground` | `surface-hover` | 10.49:1 | 4.5:1 |
| dark | `danger` | `surface` | 9.52:1 | 4.5:1 |
| dark | `danger` | `background` | 10.39:1 | 4.5:1 |
| dark | `ring` | `accent` | 5.85:1 | 3:1 |
| dark | `input-border` | `surface-hover` | 3.64:1 | 3:1 |
| dark | `input-border` | `muted` | 3.69:1 | 3:1 |
| dark | `input-border` | `accent` | 3.07:1 | 3:1 |
