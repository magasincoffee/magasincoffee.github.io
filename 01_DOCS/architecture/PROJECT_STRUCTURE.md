# MAGASIN — PROJECT STRUCTURE

**Status:** ACTIVE / FOUNDATION
**Version:** 1.0

## Root policy

GitHub Pages infrastructure files are the only files permitted at repository root:

- `index.html` — unavoidable GitHub Pages entry redirect.
- `.nojekyll` — GitHub Pages configuration.
- `.github/` — CI/deployment configuration.

All business, application, documentation and database assets belong inside numbered directories.

## Numbered top-level architecture

```text
01_DOCS/        Documentation, business rules, operating model and AI contracts
02_CORE/        Shared technical primitives
03_PLATFORM/    Authentication, common entry points and shared assets
04_OWNER/       Owner portal and enterprise management
05_MANAGER/     Manager portal and compatibility runtime
06_EMPLOYEE/    Employee portal and employee capabilities
07_DATABASE/    Supabase migrations and database contracts
08_INTEGRATIONS/ Reserved for external system connectors
99_LEGACY/      Historical/quarantined implementations
```

## Read order for new work

1. Master objective and AI context in `01_DOCS/enterprise/`.
2. Working method and work-control rules.
3. Relevant domain rules under `01_DOCS/`.
4. Current architecture.
5. Canonical production module.
6. Legacy only for historical reference.

## Source of truth

`01_DOCS` defines approved business/system intent. `02_CORE` defines shared technical primitives. `04_OWNER`, `05_MANAGER`, `06_EMPLOYEE` own application capabilities. `07_DATABASE` owns database changes. `99_LEGACY` is not a production source.

## No patch sprawl

Do not create new root-level feature files or patch chains such as `v2`, `v3`, `fix`, `cleanup`, `time-color` or `transfer-fix`. Update the canonical owning module or create a properly scoped module.

## Authentication

`03_PLATFORM/01_AUTH/` is the canonical authentication entry point. The repository root `index.html` only redirects there.

## Manager

`05_MANAGER/runtime/` contains the current Manager runtime wrapper and shell. Existing old implementation pieces remain under `runtime/compat/` until the Manager refactor is completed.

## URL policy

The numbered repository structure is authoritative. Entry pages and runtimes must reference canonical numbered paths and must never load from `99_LEGACY`.
