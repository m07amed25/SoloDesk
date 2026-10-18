# Proposed application/repository structure

Structure design only. Existing paths remain app/main, app/renderer, tooling and Vite/Forge configs. No folders below are an instruction to generate implementation during this task. A package-workspace layout is recommended as desktop/server share pure rules; exact migration is a P00/P01 engineering decision.

```text
SoloDesk/
├── PRODUCT.md
├── docs/                         # Specs, phases, architecture, quality and operations
├── app/
│   ├── main/                     # Native lifecycle/windows/IPC/local composition
│   ├── preload/                  # Narrow typed renderer bridge (future)
│   └── renderer/                 # English/Arabic shell, screens, shared shadcn UI
├── packages/                     # Future pure shared packages
│   ├── domain/                   # Workspace, commercial, delivery, time, finance policies
│   ├── application/              # Use cases, transaction orchestration, adapter ports
│   ├── contracts/                # Versioned API/IPC/sync shapes and errors
│   └── localization/             # Translation keys/glossary/date/number contracts
├── infrastructure/
│   ├── local-store/              # Encrypted cache/outbox/keys/attachments/migrations
│   ├── cloud-client/             # Auth/native callback, sync transport, enrollment
│   ├── exports/                  # Safe bilingual PDF/CSV/archive rendering
│   └── providers/                # Client-side permitted adapter boundaries
├── supabase/                     # Future managed-backend definition
│   ├── migrations/               # PostgreSQL tables, constraints, policies, commands
│   ├── functions/                # TypeScript authenticated domain API/callback/job batches
│   └── tests/                    # Tenant/RLS/command/transaction tests
├── services/                     # Future optional dedicated worker only if justified
│   └── worker/                   # Long jobs beyond measured edge limits
├── web/                          # Hosted bilingual sign-in/recovery (P01), portal (P08)
├── tests/
│   ├── domain/                   # Money/time/state properties and approved fixtures
│   ├── integration/              # Local/server, auth/IPC, files and migrations
│   ├── sync/                     # Partitions/reorder/revocation/conflict model tests
│   ├── desktop/                  # Native OS journeys and crash recovery
│   ├── portal/                   # Guest authorization/accessibility/RTL
│   └── fixtures/                 # Synthetic English/Arabic data and documents
├── assets/                       # Licensed fonts/icons/templates and source metadata
└── tooling/                      # Current launch fix; future build/release/document checks
```

Pure domain/contracts must run in Electron Node and the selected TypeScript edge runtime without native/Node-only assumptions. Infrastructure implements ports; main/server are composition roots. Secrets live in vault/key store, never shared packages. Local/cloud schema histories are separate and protocol compatible. There is one repository and modular services, not a required fleet of microservices.

Future configuration includes environment schema, allowed callback/endpoints, local/profile paths, feature/profile limits, signing/update trust roots and test/provider sandbox identities. Do not commit secret values. Installed dependencies do not imply future encrypted storage, backend or portal is implemented.


## F003 implementation — 18 October 2026

Implemented F003 paths: `packages/domain/src`, `packages/contracts/src`, `packages/localization/src`, `tests/f003` and `tooling/f003`. Private package markers have no dependencies. Root TypeScript includes shared sources; `tsconfig.shared.json` excludes Node/DOM globals. Application/infrastructure/Supabase/web folders above remain proposed. See [F003](../features/F003.md).
