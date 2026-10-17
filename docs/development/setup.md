# Development Stack Setup

This document records the **existing shell and installed tooling**, not the expanded product implementation. The new cloud/team/offline/encryption/bilingual plan is in [architecture](../architecture/overview.md), [backend selection](../architecture/backend-stack.md), and [roadmap](../planning/roadmap.md). No new backend/encryption dependencies or services were installed for the documentation task.

Scope: a minimal runnable Electron shell, explicitly authorized after dependency setup. The user requires Tailwind CSS and shadcn/ui. A welcome screen exists; no freelance-management domain feature or database behavior is implemented.

## Stack

| Package/tool                                               | Responsibility                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Electron                                                   | Desktop runtime and native window                                                             |
| React and React DOM                                        | Welcome-screen renderer                                                                       |
| TypeScript and type packages                               | Type checking                                                                                 |
| Vite and React plugin                                      | Renderer tooling                                                                              |
| Tailwind CSS and @tailwindcss/vite                         | Utility CSS compilation through Vite                                                          |
| shadcn/ui source                                           | Generated components and retained licensed styles; generator CLI removed after security audit |
| class-variance-authority, cn, lucide-react, tw-animate-css | Current shadcn manual-setup dependencies                                                      |
| @base-ui/react                                             | Primitive used by the generated shadcn Button                                                 |
| Electron Forge CLI and Vite plugin                         | Desktop development launcher and build integration                                            |
| better-sqlite3                                             | Native SQLite adapter, not a database service                                                 |
| @electron/rebuild                                          | Rebuild native adapters against the Electron runtime when needed                              |

Package versions are pinned in package.json; package-lock.json records transitive versions. Retained shadcn styles are pinned by source/archive/file hashes in [the vendor manifest](../../vendor/shadcn-ui/manifest.json). The setup targets the installed Node 24 LTS line and npm. No global npm packages are needed.

The React Vite plugin is pinned to 5.2.0: it declares Vite 8 support while remaining compatible with the Babel 7 tooling used by shadcn. Recheck peer dependencies before changing this pin.

## Tooling files

- components.json: shadcn metadata, renderer aliases, and stylesheet location. base-nova/neutral are replaceable setup defaults, not an approved interface design.
- tsconfig.json: strict TypeScript across main/renderer/config files, JSX support, and @/_ mapped to app/renderer/_.
- vite.config.mts: renderer React and Tailwind plugins, matching alias, and relative asset URLs for future Electron file loading.
- vite.main.config.mts: builds the main process; Forge supplies development URL definitions while standalone builds use local files.
- forge.config.mjs: connects the main-process entry and Vite renderer; native-module rebuilding is deferred while no native adapter is loaded.
- app/main/main.ts: creates the native window, handles lifecycle, blocks unexpected navigation/windows/permissions, and uses sandboxing/context isolation without renderer Node access.
- app/renderer/styles/globals.css: Tailwind and retained shadcn stylesheet imports and a provisional welcome-screen theme.
- app/renderer/shell/App.tsx: welcome screen and informational planned-features toggle.
- app/renderer/components/ui/button.tsx: generated official shadcn Button; app/renderer/lib/utils.ts provides the shared helper export.
- .gitignore: excludes dependencies, generated outputs, environment secrets, and local databases.
- tooling/start.mjs: removes VS Code Snap's bundled GTK/schema paths on Linux before launching Forge, even if the terminal has removed SNAP_NAME; preserves unrelated paths and other platforms.
- tooling/start.test.mjs: regression checks for inherited Snap paths, absent SNAP_NAME, and preservation of unrelated environment settings.

## Tooling commands

After installation, use npm run typecheck to check the tooling configuration, npm run test:launcher for launcher regression checks, and npm run ui:info to inspect shadcn configuration. npm ls --depth=0 lists direct installed versions. npm run setup:electron downloads Electron's platform binary if it is missing; it does not launch an app.

On a new checkout, npm ci restores the locked packages, then npm run setup:electron installs the platform runtime. Native builds require Python and a C/C++ toolchain. The manifest approves install scripts specifically for better-sqlite3@13.0.3; no blanket script approval is enabled.

## Run the shell

```bash
cd ~/Desktop/SoloDesk
npm start
```

Keep the terminal open during development. Close the app window or press Ctrl+C to stop it. Vite serves the renderer on a loopback address and selects another port if its preferred port is occupied. Renderer changes reload; main-process changes restart the app.

On Linux, VS Code installed as a Snap can pass its bundled GNOME schemas and GTK paths to the integrated terminal while removing SNAP_NAME. Those schemas caused a reproducible SIGSEGV in this Electron runtime, accompanied by a missing font-antialiasing schema-key error. The npm start launcher matches Code-Snap paths directly rather than relying on SNAP_NAME. It removes those entries from schema/module paths and XDG_DATA_DIRS before launching Forge/Electron. Cleanup affects only the child environment; host/custom paths and the original terminal environment are preserved. Windows, macOS, and Linux environments without these paths pass through unchanged. No --no-sandbox, GPU-disabling flag, or system-wide setting change is used.

The window includes an explicit 36-pixel draggable title bar. Electron's native Window Controls Overlay supplies minimize, maximize, and close on Linux/Windows; macOS retains its native traffic-light controls. The renderer reserves space for those controls, and no privileged IPC is needed. If an older instance lacks the title bar, stop its terminal process with Ctrl+C and run npm start again.

npm run build compiles the main and renderer into ignored .vite outputs without creating installers. No packaging/maker command is configured. Typecheck verifies code types; it does not prove feature behavior or release readiness.

## shadcn boundary

Setup follows the [official shadcn instructions](https://ui.shadcn.com/docs/installation/manual). The Button component was generated for the authorized shell and its Base UI dependency is installed. The shared helper and provisional theme exist. Further components and business screens remain deferred. Do not run init with a template over this project; add individual components as their features are authorized.

Tailwind uses the [official Vite plugin](https://tailwindcss.com/docs/installation/using-vite), not the older Tailwind v3 initialization workflow.

## Native modules and future packaging

better-sqlite3 contains native code. A host Node build is not automatically compatible with Electron's Node ABI. When database integration is added, use the installed @electron/rebuild or Forge's rebuild step for the target Electron version and platform. Keep SQLite outside the renderer and external to the main-process Vite bundle.

The current shell never imports SQLite. forge.config.mjs uses rebuildConfig.types = [] so launching this shell does not rebuild unused native adapters. When database work is authorized, enable the appropriate native rebuilds and verify better-sqlite3 under Electron before using it. Its host-Node load check is not an Electron compatibility claim.

[Forge's Vite plugin](https://www.electronforge.io/config/plugins/vite) is experimental. Pin its version and recheck migration notes before upgrades. Platform makers, signing, and installer verification are deferred until release requirements are agreed.

## Still deferred

Privileged preload/IPC APIs, business navigation/screens, local database creation, schemas/migrations, client/project/task/time/invoice logic, feature test implementations, full visual design, and release configuration.

## Initial dependency verification — 17 October 2026

- npm ls --depth=0 reported the installed direct dependencies without resolution errors.
- npm run typecheck passed for the tooling configuration.
- Tailwind compiled globals.css, including the animation and shadcn CSS imports, with sample utilities.
- npm run ui:info identified Vite, TypeScript, Tailwind v4, and the intended renderer aliases; it confirmed no installed UI components.
- better-sqlite3 loaded under host Node and completed an in-memory SELECT 1 query. Electron ABI rebuilding remains deferred as described above.
- The Electron runtime archive matched the SHA-256 checksum bundled with the official Electron package; extraction succeeded.
- Electron loaded in Node mode and reported version 44.8.0. No application window was created.
- Dependency pins, lockfile consistency, scoped install-script approval, and local documentation links were checked.

These initial checks verified installation and tooling before the runnable shell was authorized.

## Runnable-shell verification — 17 October 2026

- npm run typecheck and npm run build passed after main/renderer entry points and the shadcn Button were added.
- A real Electron window loaded the built renderer; the planned-features button expanded/collapsed its section.
- The renderer had no window.require, with sandbox and context isolation enabled and Node integration disabled.
- Screenshots were inspected at desktop and minimum window sizes; the smaller window allowed vertical scrolling without horizontal overflow.
- npm start launched the actual Forge development app. Its compiled main process loaded Vite's loopback URL on the next available port, and the same window/interaction checks passed in development mode.
- No freelance-management workflow, database integration, packaged installer, Windows build, or macOS build has been implemented or verified.

Title-bar correction: type checking and builds passed; an isolated production window reported a visible controls overlay with a 36-pixel title area and reserved native-control space. The drag region and minimize/maximize/close capabilities were checked, and the existing planned-features toggle still worked. The corrected development window was reopened through npm start. Native overlay controls are outside web-content screenshots, so a renderer screenshot alone does not show their buttons.

VS Code Snap startup regression: the first correction relied on SNAP_NAME=code and was tested with the Code parent process's GTK settings. The actual integrated bash terminal retained Snap GTK/schema paths but had removed SNAP_NAME, so that correction skipped cleanup. Launching with the terminal's GTK settings reproduced SIGSEGV and the missing font-antialiasing schema-key error. Cleanup now matches the bundled paths directly, without requiring SNAP_NAME.

After the correction, npm run test:launcher passed all five tests, including the missing-SNAP_NAME regression, preservation of host paths/display variables, source immutability, and unchanged Windows/macOS inputs. npm run typecheck passed. An actual npm start launch using the integrated terminal's inherited GTK/display settings with SNAP_NAME absent rendered the welcome screen, displayed the native controls overlay, exercised the planned-features button, and retained its native window through a 15-second observation. The test temporarily hid and then restored the window to avoid manual closure during observation. No sandbox-disabling flags were used. Native Windows/macOS startup was not tested.

F002 implementation is authorized by the current user request. Its [verification commands, native/security scope and recovery](../features/F002.md) and actual QA remain distinct from business-feature implementation, owner approval, merge, protection activation and release.

## Security repair — 18 October 2026

The shadcn generator CLI dependency is removed because its transitive braces chain has no patched release. The required shadcn/ui components and styles remain: the existing generated Button/Base UI dependency is unchanged, and the official 4.22.0 stylesheet and MIT license are retained in [vendor/shadcn-ui](../../vendor/shadcn-ui/README.md). `npm run ui:info` now validates local metadata/component inventory and those source hashes; it does not contact registries or generate components. New components can be reviewed as source; generator installation remains deferred until its full dependency graph passes audit. The original setup observations below/above remain historical rather than being rewritten as current CLI execution.
