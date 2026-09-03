# MAGASIN Coffee System

This repository is a GitHub Pages application backed by Supabase.

## Active routes

- `/owner/Workforce/` — Owner Workforce
- `/employee/` — Employee
- `/manager/` — Manager (legacy runtime until its refactor)

## Canonical architecture

```text
core/
└── shared/
    └── shared-core-v1.js

owner/Workforce/
├── 01-demand/
│   └── engine-v1.js
├── 02-review/
│   └── engine-v1.js
├── 03-publish/
│   └── engine-v1.js
└── runtime/
    └── owner-workforce-runtime.html

employee/
├── dashboard/
├── schedule/
├── availability/
├── attendance/
├── swap/
├── inventory/
├── app/
└── runtime/

manager/
└── README.md

supabase/migrations/

docs/
└── architecture/

legacy/
```

## Development rule

Do not create another `v2`, `v3`, `fix`, `cleanup`, `transfer-fix` or `time-color` patch for an active module. Update the owning engine instead.

Legacy files are retained only while an active route still depends on them. They must not be loaded by the canonical Owner Workforce or Employee runtimes.

## Workforce

Workforce is currently the main development focus and is split into three modules: Demand, Review and Publish. See `docs/modules/WORKFORCE.md`.
