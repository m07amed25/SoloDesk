# SoloDesk

A desktop workspace for freelance software engineers and small teams: clients, delivery, time, invoices, payments and business operations.

**Current implementation: a minimal runnable Electron welcome shell. Current work: full phased documentation only.** Business features, backend, encryption, sync and portal are specified but unimplemented.

## Documentation

Start with the [documentation index](docs/README.md), [product brief](PRODUCT.md), [ten-phase roadmap](docs/planning/roadmap.md), [requirement coverage](docs/planning/coverage.md), and [decision register](docs/planning/decisions.md). Detailed specs describe fields, states, permissions, offline behavior, validation, recovery and acceptance.

Confirmed direction: Windows/macOS/Linux; Electron/React/TypeScript; Tailwind CSS and shadcn/ui; cloud accounts and teams from first release; offline support; online invoice finalization; encrypted device/cloud storage; configurable financial capabilities; English/Arabic with full RTL; no AI for now. Prefer low-cost/free efficient services where suitable. Recommended initial backend is Supabase Auth/Postgres/private Storage/TypeScript Edge Functions with bounded scheduled jobs; free-tier limits and upgrade gates are documented, not a promise of free uninterrupted production.

## Run the existing shell

```bash
cd ~/Desktop/SoloDesk
npm start
```

Keep the terminal open. Close the window or press Ctrl+C to stop. Renderer changes reload through Vite. For a fresh checkout run npm ci and npm run setup:electron first.

```bash
npm run typecheck
npm run test:launcher
npm run ui:info
npm run build
```

npm start cleans inherited VS Code Snap GTK/schema paths on Linux even when SNAP_NAME is absent. The launcher regression tests cover this case and host/platform preservation. npm run build compiles the shell without an installer. [Setup](docs/development/setup.md) records installed packages/current checks; those checks do not verify future cloud/business functionality.

## Current files and future structure

app/main/main.ts and app/renderer contain the welcome shell; tooling/start.mjs and tooling/start.test.mjs handle startup; Forge/Vite/TypeScript/shadcn configs and dependency locks exist. docs contains specifications and phases. [Proposed source structure](docs/architecture/project-structure.md) separates future desktop, shared domain, encrypted local storage, managed backend and portal; it has not been generated.

SoloDesk is a working name, not a verified registered brand. No dependency installation, cloud signup, deployment, feature implementation or external message is authorized by the documentation task.
