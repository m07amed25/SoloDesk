"""Read-only design checks; --write refreshes the documentation evidence report.
Run: python3 docs/design/validate.py --write
No application, cloud, or dependency changes. Python standard library only.
"""
from pathlib import Path
import argparse
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
DESIGN = ROOT / 'docs/design'

def luminance(color):
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
    return sum(a * b for a, b in zip(linear, [0.2126, 0.7152, 0.0722]))

def contrast(a, b):
    lower, upper = sorted([luminance(a), luminance(b)])
    return (upper + 0.05) / (lower + 0.05)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    tokens = json.loads((DESIGN / 'tokens.json').read_text())
    assert set(tokens['themes']['light']) == set(tokens['themes']['dark']), 'Theme roles differ'
    roles = set(tokens['themes']['light'])
    for stroke in tokens['strokes'].values():
        assert stroke['width'] in [0, 1, 2], 'Unknown stroke width'
        if stroke['width']:
            assert stroke['colorRole'] in roles and stroke['style'] in ['solid', 'dashed']
    assert tokens['focus']['colorRole'] in roles
    for name, size in tokens['componentSizes'].items():
        if 'radius' in size:
            assert size['radius'] in tokens['radii'], (name, 'unknown radius')
        if 'stroke' in size:
            assert size['stroke'] in tokens['strokes'], (name, 'unknown stroke')
        for target in ['hitHeight', 'hitWidth']:
            if target in size:
                assert size[target] >= 44, (name, 'undersized target')
    for name, recipe in tokens['componentPaints'].items():
        for state in ['default', 'hover', 'pressed']:
            if state not in recipe:
                continue
            paint = recipe[state]
            assert paint['backgroundRole'] in roles | {'transparent'}, (name, state)
            assert paint['foregroundRole'] in roles, (name, state)
            assert paint['stroke'] in tokens['strokes'], (name, state)
    assert tokens['componentSizes']['buttonStandard']['minHeight'] == tokens['geometry']['primaryControlHeight']
    assert tokens['componentSizes']['input']['minHeight'] == tokens['geometry']['controlHeight']
    assert tokens['componentSizes']['table']['rowMinHeight'] == tokens['geometry']['tableRowMin']
    pairs = []
    for mode, colors in tokens['themes'].items():
        for role, value in colors.items():
            assert re.fullmatch(r'#[0-9A-Fa-f]{6}', value), (role, value)
        for p in tokens['contrastPairs']:
            value = contrast(colors[p['foreground']], colors[p['background']])
            assert value >= p['minimum'], (mode, p, value)
            pairs.append((mode, p['foreground'], p['background'], value, p['minimum']))
    screen_doc = (DESIGN / 'screens.md').read_text()
    screen_ids = re.findall(r'^\| (UI-\d{3}) ', screen_doc, re.M)
    assert screen_ids == [f'UI-{i:03}' for i in range(1, 74)], 'Screen inventory missing/duplicate ID'
    phase_doc = (DESIGN / 'phase-coverage.md').read_text()
    phase_ids = re.findall(r'^\| \[(F\d{3})\]', phase_doc, re.M)
    expected = [f'F{i:03}' for i in range(1, 152)]
    assert phase_ids == expected, 'Phase coverage missing/duplicate ID'
    assert re.findall(r'^### (F\d{3}) —', (ROOT / 'plan.md').read_text(), re.M) == expected
    canonical = set(re.findall(r'^\| ((?:PLT|CRM|WRK|TIM|FIN|INS|INT|NFR)-\d{3}) ', (ROOT / 'docs/planning/coverage.md').read_text(), re.M))
    planned = set(re.findall(r'\b(?:PLT|CRM|WRK|TIM|FIN|INS|INT|NFR)-\d{3}\b', (ROOT / 'plan.md').read_text()))
    assert len(canonical) == 139 and canonical <= planned, 'Requirement coverage differs'
    assert set(re.findall(r'UI-\d{3}', phase_doc)) <= set(screen_ids), 'Unknown UI-ID in phase map'
    checked_links = 0
    for path in [ROOT / 'DESIGN.md', *DESIGN.rglob('*.md'), ROOT / 'docs/README.md', ROOT / 'docs/product/screens.md', ROOT / 'docs/product/ux-and-localization.md']:
        for link in re.findall(r'\]\(([^)]+)\)', path.read_text()):
            if '://' in link or link.startswith('#'):
                continue
            target = (path.parent / link.split('#')[0]).resolve()
            if target == DESIGN / 'validation.md' and args.write:
                continue
            assert target.exists(), f'Broken link: {path.relative_to(ROOT)} -> {link}'
            checked_links += 1
    html = (DESIGN / 'reference.html').read_text()
    assert '__TOKENS__' not in html and '__JSON__' not in html
    match = re.search(r'<script>([\s\S]*?)</script>', html)
    assert match, 'Reference script missing'
    # Parse without executing browser logic or installing a tool.
    subprocess.run(['node', '-e', "new (require('node:vm').Script)(require('node:fs').readFileSync(0,'utf8'));"], input=match[1], text=True, check=True, cwd=ROOT)
    assert (ROOT / 'public/solodesk_no_bg_no_text.png').exists()
    summary = f'{len(pairs)} declared contrast pairs pass; {len(tokens["componentSizes"])} component size recipes and {len(tokens["componentPaints"])} appearance recipes consistent; 73 screen families; 151 phases; 139 requirements covered by their phase plan; {checked_links} local links; reference JavaScript syntax valid.'
    print(summary)
    if args.write:
        report = '# UI design validation evidence\n\nChecked 17 October 2026. Scope: documentation, token pairs and separate reference only; not app functionality or a conformance certificate.\n\n'
        report += '## Reproducible artifact checks\n\nRun `python3 docs/design/validate.py --write` from the repository root. Uses Python standard library and the installed Node parser; no packages or services are installed.\n\n' + summary + '\n\n'
        report += 'The phase map covers the whole development plan, including nonvisual foundations/release gates. Screen contracts inherit domain requirements; counts alone do not prove screen or feature implementation. Both themes expose the same semantic roles.\n\n'
        report += '## Observed reference interactions\n\n'
        report += '- Theme and English/Arabic controls change appearance/direction; Arabic work dates localize (for example `١٩ أكتوبر`).\n- Task search shows filtered-empty and reset; selection announces its count.\n- Specimen dialog opens, Escape closes, and focus returns to New task.\n- Reference navigation controls open the narrow reference menu and switch sample views.\n- Invoice specimen totals USD 62.07 under the documented example; document paper stays white inside the dark shell.\n- Online/offline/conflict examples use distinct text; no false cloud save when offline.\n- Narrow 640px CSS viewport has document width 625px excluding scrollbar, with table-level scrolling; the hidden-label overflow found during QA was corrected.\n- Browser console error check returned no errors during the exercised paths.\n\n'
        report += '## Visual evidence and limits\n\n'
        report += 'Final representative viewport captures are stored under [previews](previews/). Wide captures use nominal 1440×900 CSS viewports and narrow captures 640×900; native screenshot pixel area excludes browser/scrollbar chrome. English light/dark, Arabic dark work, Arabic light finance and narrow reflow are included. Full-page RTL capture was defective in the browser harness, so final RTL evidence uses visible viewport captures. These are reference screenshots, not native app or portal release evidence.\n\n'
        report += 'The original reference review outcome and the documentation-only component-detail follow-up scope are recorded in [review](review.md). The reference was not changed in that follow-up; its new token recipes received source/consistency checks. The mechanical design detector ran once for the reference. Explicit titlebar block padding and selected-color documentation addressed its relevant findings. Its generic Inter-familiarity warning is accepted under the user-selected familiar productivity direction; system fallbacks are labeled.\n\n'
        report += 'Not verified here: installed/bundled custom fonts, fluent Arabic sign-off, real screen readers, actual 200% browser zoom, Windows/macOS/Linux native controls, native database/IPC/sync/permission behavior, legal finance profiles, cloud integration, PDF shaping/pagination, packaged release performance or business tests. These remain per-feature PR gates. The reference is illustrative and cannot prove them. Original logos and running app source were not modified.\n\n'
        report += '## Declared contrast pairs\n\nThresholds apply to the named roles/pairs only. Ratios use the WCAG relative-luminance formula and full-precision comparison; displayed ratios are rounded after acceptance. Decorative dividers are not claimed as valid control outlines.\n\n| Theme | Foreground role | Background role | Ratio | Required |\n| --- | --- | --- | --- | --- |\n'
        report += ''.join(f'| {m} | `{fg}` | `{bg}` | {value:.2f}:1 | {minimum}:1 |\n' for m, fg, bg, value, minimum in pairs)
        (DESIGN / 'validation.md').write_text(report)

if __name__ == '__main__':
    main()
