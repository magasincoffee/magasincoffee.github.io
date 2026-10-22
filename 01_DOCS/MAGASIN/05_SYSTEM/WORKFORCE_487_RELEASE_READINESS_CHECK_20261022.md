# Workforce #487 — independent release readiness checkpoint
**As checked 2026-10-22 (Asia/Ho_Chi_Minh)**. GitHub/Supabase evidence, read-only. Do not present as production approval.

## Gate inventory
| Gate | Current evidence | Status |
|---|---|---|
| PR #503 FT/PT registration order | exact-head `229ccea4`, 18/18 isolated signed-JWT, 4/4 CI SUCCESS | SOURCE QA PASS; PROD HOLD |
| PR #499 deadline / Swap guard | exact-head `91f419db`, 20/20 isolated signed-JWT, 4/4 CI SUCCESS | SOURCE QA PASS; PROD HOLD |
| MAGASIN-NOIBO database | active PG17, four stores, existing availability & swap RPCs | READ ONLY VERIFIED |
| Migration applied in production | New registration RPC absent; the availability and swap trigger functions absent | NOT APPLIED (expected) |
| Fresh encrypted database backup | 14 Oct successful [run 38577798740](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38577798740), `retention-days: 7`, **0 retained artifacts** returned by GitHub on 22 Oct | **HOLD — EXPIRED/UNAVAILABLE** |
| Isolated restore | [schema rehearsal 38585692401](https://github.com/magasincoffee/magasincoffee.github.io/actions/runs/38585692401) SUCCESS for old backup; NOT a current backup | HISTORICAL, NOT ROLLOUT PROOF |
| Owners / ACL / RLS full restored parity | Cloud backup uses `pg_restore --no-owner --no-acl`; separate XSTORE Owner ACL restore workflow exists, but no qualifying **fresh proof for #487** | HOLD |
| Hosted real three-role signed JWT read-only | No new proven #487 session-local/hosted positive and negative evidence on target build | HOLD |
| Authenticated mutation and publication | Requires explicitly approved test cohort and rollback; do not write real staff data | HOLD |
| Owner visual and production release acceptance | Not yet documented for these two migrations | HOLD |

## Safe preparation that may be completed without prod DB modifications
1. Open [XSTORE-019O Cloud Backup and Restore Gate](https://github.com/magasincoffee/magasincoffee.github.io/actions/workflows/xstore-019o-cloud-backup.yml). Via **Run workflow**, select `main`, enter the workflow's explicit confirmation value `XSTORE-019O`. This launches an existing read-only production `pg_dump`, encrypts via repository Secrets, verifies decrypt and **isolated restore**, and uploads encrypted-only artifact. Do NOT share secrets or DB URL in chat. It may fail; do not infer success from merely starting it.
2. Confirm a *new* completed-success run on trusted `main` and a non-expired, non-empty encrypted artifact `xstore-019o-noibo-encrypted-RUN_ID`. Its retention is **7 days**. This is a necessary but insufficient gate.
3. Use the read-only [Workforce 487 Backup Admission](https://github.com/magasincoffee/magasincoffee.github.io/actions/workflows/workforce-487-backup-admission-qa.yml) `workflow_dispatch` on the branch containing it, supplying only that numeric backup run ID. It fails closed if not successful, not on `main`, older than 24 hours, archive absent/expired or missing isolated restore step. The 24-hour window is a conservative technical preflight, **not** a newly decided business rule. No backup content/JWT/PII is downloaded.
4. Separately prove full restored PostgreSQL owners/ACL/RLS catalog parity with the actual new archive (existing XSTORE-019O Owner ACL workflow on trusted `main` or approved equivalent). `--no-owner --no-acl` is insufficient. Verify backup access/decryption owner, recovery documentation and that the artifact can be restored by an authorized maintainer.
5. Re-check production function signatures, existing triggers, role privileges, `pg_get_functiondef` and cross-store authorization against exact source. Existing Supabase advisor baseline includes anon SECURITY DEFINER warnings unrelated to these new API grants; triage separately, do not blindly revoke functions and break login.
6. Obtain explicit approval for **each specific** SQL migration and rollout timing (PR #503 additive read-only RPC, PR #499 two BEFORE triggers), with reversible DDL instructions below. The Owner's prior “continue five steps” is approval for safe preparation, not proof of DB rollback readiness.
7. After the controlled migration, test **read-only** actual signed-in Owner, Manager authorized CN1/CN2 and employee/anon scope denials. Allow only authorized synthetic fixtures for UPDATE/DELETE/Swap/publish E2E. Do not create live shifts or attendance without a separate Owner-approved pilot.
8. Only merge source/UI against reviewed exact-head after API verification and run exact-main Pages + desktop/mobile role QA. The 24/10 QA remains **read-only** pending live availability.

## Proposed rollback (requires backup and explicit approval, not executable authorization)
1. Freeze new writes/publishing for only the affected Workforce slice; capture logs and exact SHA first.
2. If #499 fails, remove **both new triggers** from employee_availability and shift_swaps only after documenting the resulting loss of server deadline enforcement. Keep old RPC and all employee rows intact. New functions may be dropped later only after independent dependency checks.
3. If #503 fails, remove/revert the frontend change. Existing client supports the missing-RPC unverified-warning path. Drop the additive registration RPC only after checking no dependents and preserving source/rollback evidence.
4. Confirm old read paths, branch isolation, draft/published schedule count invariants, logged-in role QA; restore database from verified backup ONLY if a real restore incident requires it and the Owner approves that plan.
5. Track every timestamp/run ID/SHA/approver/result in [Issue #487](https://github.com/magasincoffee/magasincoffee.github.io/issues/487); keep issue OPEN until human acceptance.

## Scope remains unchanged
The *four-branch* rollout and attendance/payroll are NOT authorized merely by green isolated CI. Attendance's OPEN business decisions (in/out mechanism, overnight, late/early, breaks, adjustments, duplicate attendance) require Owner decisions before M2. No automatic publishing of a draft.
