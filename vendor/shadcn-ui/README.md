# Retained shadcn/ui styles

The stylesheet is from the previously locked `shadcn@4.22.0` npm distribution. Its MIT license is retained alongside it. `manifest.json` records the exact npm archive integrity, original stylesheet hash and current file hashes; Prettier may normalize whitespace without changing the CSS rules.

SoloDesk keeps its official generated shadcn Button, Base UI primitives, Tailwind configuration and shared utilities. The npm generator CLI is removed because its only dependency chain introduced the unpatched braces advisory GHSA-vfj7-8cjw-p6xm. No vulnerable dependency is hidden in a separate workspace or excluded from audit.

`npm run ui:info` inspects the local components configuration, component inventory and stylesheet/license integrity. It performs no registry request and does not add components. Review future upstream component/style updates as source changes; restore a generator dependency only after its full dependency graph passes the same security policy. Do not use an unpinned transient generator to bypass this repair.

The license inventory includes this retained source in addition to every locked production/development/optional dependency. Missing or changed vendored files fail verification. The current component behavior and appearance are preserved.
