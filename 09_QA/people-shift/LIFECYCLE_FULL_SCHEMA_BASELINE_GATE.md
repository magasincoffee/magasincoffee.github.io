# ID78 — fresh full-schema baseline gate (non-production QA)

**Finding (2026-10-18):** `07_DATABASE/BASELINE_MIGRATION_PLAN_V1.md` expressly documents that checked-in migrations do not contain a reproducible core baseline for `public.profiles`, `public.stores`, `public.work_schedules`, and other pre-existing tables. The 42 files in `07_DATABASE/migrations` are incremental and cannot be assumed to initialize an empty PostgreSQL instance. The synthetic QA in PR #439 models 46 direct existing `profiles` foreign keys and 2 candidate audit FKs. It is **not** a full-schema clone or permission parity proof.

## Safe path without restoring any old data backup

1. In a **trusted runner** with an explicitly authenticated **read-only schema extraction** account for **MAGASIN-NOIBO** (`menvbzlsncmpuvnaifxa`), capture a **fresh schema-only** snapshot of the current database (`pg_dump --schema-only`). Include extension definitions, function definitions, triggers, RLS policies, owners, roles/grants/default privileges. Do not collect table rows, Auth identities, secrets, or business data. PostgreSQL `pg_dump` does not itself export global roles; capture only role-name/role-attribute metadata needed for matching owners and ACL and construct the necessary isolated role stubs. Review any SECURITY DEFINER functions/triggers before execution.
2. Treat even schema SQL as potentially sensitive. Keep it in short-lived, access-controlled CI storage or encrypted artifacts. Never commit connection strings, credentials, JWT, data dumps, production role passwords, or the unrestricted dump directly to public GitHub.
3. Restore schema into a **disposable network-isolated PostgreSQL 17** instance. Recreate restricted role stubs and relevant extension prerequisites, but never configure outgoing network callbacks, FDWs, cron jobs or remote destinations from the original schema. Restrict privileges and verify isolated DB identity prior to executing any SQL.
4. Replay only the exact PR #394 lifecycle migration there. Assert all `profiles` foreign keys, column types, unique/check constraints, indexes, triggers, policy definitions, owner, grants and function EXECUTE privileges against read-only live catalog metadata. Re-run synthetic fixtures inside rollback-only transactions; use no Production employee rows.
5. Run scoped Owner, Manager ALL, partial Manager and Staff tests with **real QA signed-JWT/auth semantics**, not only `qa.actor_id` GUC simulation; negative tests must include unauthorized user and inactive actor. Verify no lifecycle write mutates schedule, attendance, Auth or payroll.
6. Record exact dump timestamp, hash, catalog inventory counts, isolated restore log, exact SQL/PR SHA and GitHub Actions run in the SOT. A green synthetic fixture alone does not satisfy ID78. Production release separately requires disaster-recovery backup restore with owner/ACL/RLS parity and Owner go/no-go.

## Automated fail-closed preflight

Run `node 09_QA/people-shift/lifecycle-full-schema-preflight.mjs` from repository root. Until a verifiable full baseline manifest exists and is expressly authorized, this preflight must fail, rather than silently present synthetic tests as full-schema parity.

**Do not run `pg_dump` through the public CI without explicit review of network access, credentials, database role permissions and artifact handling.** This is a design and preflight gate, not an executed full schema restore.
