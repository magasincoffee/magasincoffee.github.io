# MAGASIN — PROJECT STRUCTURE

**Status:** ACTIVE / FOUNDATION
**Version:** 1.0

## Root policy

Only GitHub Pages infrastructure remains at repository root: `index.html`, `.nojekyll`, and `.github/`.

All business, application, documentation and database assets belong inside numbered directories.

## Numbered top-level architecture

```text
01_DOCS/          Documentation, business rules, operating model and AI contracts
02_CORE/          Shared technical primitives
03_PLATFORM/      Authentication, common entry points and shared assets
04_OWNER/         Owner portal and enterprise management
05_MANAGER/       Manager portal and compatibility runtime
06_EMPLOYEE/      Employee portal and employee capabilities
07_DATABASE/      Supabase migrations and database contracts
08_INTEGRATIONS/  Reserved for external system connectors
99_LEGACY/        Historical/quarantined implementations
```

## Source of truth

`01_DOCS` defines approved business/system intent. `02_CORE` defines shared technical primitives. `04_OWNER`, `05_MANAGER`, and `06_EMPLOYEE` own application capabilities. `07_DATABASE` owns database changes. `99_LEGACY` is not production source.

## No patch sprawl

Do not create root-level feature files or patch chains such as `v2`, `v3`, `fix`, `cleanup`, `time-color`, or `transfer-fix`. Update the canonical owning module or create a properly scoped module.

## Authentication

`03_PLATFORM/01_AUTH/` is the canonical authentication entry point. The root `index.html` is only the GitHub Pages redirect.

## Current development state

Owner Workforce is already partitioned into Demand, Review, and Publish engines. Employee capabilities have separate owning engines. Manager remains a compatibility implementation under `05_MANAGER/runtime/compat/` and will be refactored separately.

## URL policy

The numbered repository structure is authoritative. Entry pages and runtimes must reference canonical numbered paths and must never load from `99_LEGACY`.
