# MAGASIN Project Structure

## Active architecture

The repository is organized around one Shared Core and independent engines per business module.

```text
MAGASIN
├── core/
│   └── shared/
│       └── shared-core-v1.js
├── owner/
│   └── Workforce/
│       ├── index.html
│       ├── runtime/
│       │   └── owner-workforce-runtime.html
│       ├── 01-demand/
│       │   └── engine-v1.js
│       ├── 02-review/
│       │   └── engine-v1.js
│       └── 03-publish/
│           └── engine-v1.js
├── employee/
│   ├── index.html
│   ├── runtime/
│   │   └── employee-runtime-v1.html
│   ├── app/
│   │   └── employee-v40.html
│   ├── dashboard/
│   │   └── engine-v1.js
│   ├── schedule/
│   │   └── engine-v1.js
│   ├── availability/
│   │   └── engine-v1.js
│   ├── attendance/
│   │   └── engine-v1.js
│   └── swap/
│       └── engine-v1.js
├── manager/
├── supabase/
│   └── migrations/
├── docs/
└── legacy/
```

## Ownership rule

A module owns its own state, rendering, events, validation and RPC calls. Shared Core provides only cross-portal primitives such as authentication, roles, Supabase access, date/week utilities, time utilities, security helpers and generic UI helpers.

## Workforce modules

`owner/Workforce/01-demand/` owns staffing demand.

`owner/Workforce/02-review/` owns employee availability review and branch-transfer workflow.

`owner/Workforce/03-publish/` owns schedule generation, review and publication.

Legacy Workforce patch files must never be loaded by the active Owner Workforce runtime.
