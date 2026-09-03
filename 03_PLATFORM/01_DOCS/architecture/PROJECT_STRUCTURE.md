# MAGASIN — PROJECT STRUCTURE

**Status:** ACTIVE / FOUNDATION
**Version:** 1.0

## Root policy

The repository root contains only unavoidable GitHub Pages infrastructure: `index.html`, `.nojekyll`, and `.github/`.

All documentation, business rules, application code, UI, database migrations and integrations live inside numbered directories.

## Numbered top-level architecture

```text
01_DOCS/          Documentation, business rules, operating model and AI contracts
02_CORE/          Shared technical primitives
03_PLATFORM/      Authentication, common entry points and shared assets
04_OWNER/         Owner portal and enterprise management
05_MANAGER/       Manager portal and compatibility runtime
06_EMPLOYEE/      Employee portal and employee capabilities
07_DATABASE/      Supabase migrations and database contracts
08_INTEGRATIONS/  External system connectors when introduced
99_LEGACY/        Archived/quarantined historical implementations
```

## Canonical sources

`01_DOCS` defines approved business/system intent. `02_CORE` defines genuinely shared technical primitives. Each business module owns its own engine. `07_DATABASE` owns schema/migration changes. `99_LEGACY` is reference only and must never be loaded by production runtime.

## No patch sprawl

Do not create root-level feature files or chains such as `v2`, `v3`, `fix`, `cleanup`, `time-color`, or `transfer-fix`. Modify the canonical owner or create a properly scoped module.

## Current migration state

Owner Workforce is divided into Demand, Review and Publish engines. Employee capabilities are divided into module engines. Manager remains in compatibility form under `05_MANAGER/runtime/compat/` until its separate refactor.

## New-session read order

Read `01_DOCS/enterprise/MAGASIN_MASTER_OBJECTIVE.md`, `MAGASIN_AI_CONTEXT.md`, `MAGASIN_BOS_FRAMEWORK.md`, `MAGASIN_WORKING_METHOD.md`, `MAGASIN_WORK_CONTROL.md`, then the relevant domain document and current module implementation.

## URL rule

Production runtimes must use numbered canonical paths. Nothing under `99_LEGACY` is a production dependency.
