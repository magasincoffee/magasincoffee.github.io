# MAGASIN Project Structure

## Canonical production tree

- `core/` — shared cross-portal primitives.
- `owner/` — Owner portal and business modules.
- `employee/` — Employee portal and business modules.
- `manager/` — Manager portal. Its remaining legacy implementation is isolated under `manager/runtime/compat/` until the Manager engine refactor is completed.
- `supabase/migrations/` — database migrations and RPC definitions.
- `legacy/` — archived versions and obsolete implementations; canonical entry points must not load files from here.

## Owner Workforce

`owner/Workforce/` is the canonical Workforce area:

- `01-demand/engine-v1.js` — staffing demand.
- `02-review/engine-v1.js` — employee availability review and branch transfer workflow.
- `03-publish/engine-v1.js` — schedule generation, review and publication.
- `runtime/owner-workforce-runtime.html` — runtime composition only.

## Employee

Each major employee capability has one engine under its own module directory. Legacy root-level implementations are archived under `legacy/employee/`.

## Rules

Do not create new root-level `v2`, `v3`, `fix`, `cleanup`, `time-color`, or duplicate engine files. One business capability owns one canonical engine. Shared behavior belongs in `core/`; module behavior belongs in its module folder.
