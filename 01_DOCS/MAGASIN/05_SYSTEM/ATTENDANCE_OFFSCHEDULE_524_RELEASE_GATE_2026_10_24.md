# Issue #524 — Chấm công hoàn toàn ngoài lịch: release gate (24/10/2026 ICT)

**Release state: HOLD. PR #525 remains Draft.** The source in `09_QA/people-shift/attendance-offschedule-524-candidate.sql` is **disposable QA SQL, not a production migration**. Do not paste it into production or merge the UI alone. MAGASIN #487/#506 and #523 still have independent acceptance gates.

## Confirmed decisions and security boundaries

- An **ACTIVE Staff member** may submit a *claim* of worked time for an ACTIVE store where intake has been explicitly enabled. This **does not authorize a shift**, and priority/preference rows are not access grants. Branch-specific Manager checks and approves/adjusts/rejects a claim; Owner is read-only.
- No official schedule: create a separate `attendance_offschedule_requests_v1` request, status `NEEDS_REVIEW`, with a reason. Neither `attendance`, `work_schedules` nor `payroll_entries` receives a row automatically.
- Status `APPROVED/ADJUSTED` is **reviewed raw time**, not yet a canonical payroll source. The current `build_payroll_estimate_v1` does not include these rows. **A compensated off-schedule-work payroll bridge with source revisions and idempotency must be designed and accepted before using this as payroll evidence.**
- All four stores default to **OFF** because `attendance_offschedule_policy_v1` has no enabled row on deployment. Only a service-role operator with Owner approval can enable ONE verified store; never expose secret/service key to browser.
- Entire request and review surface is server-authorized via JWT auth UID + authoritative profile + branch-scoped helper; direct table SELECT/DML revoked for `anon` and `authenticated`, RLS enabled.
- Request overlaps with official shifts or other unrejected requests are rejected. Review rechecks new official schedules. No overnight or future work claims in v1.
- Staff/Manager/Owner UI must remain compatible with the existing one weekly roster; do not add 238-slot coverage UI, a second staffing table, or job-position restrictions.

## CI proof currently required

- [x] Disposable PostgreSQL 16, PostgREST 12.2.3, HS256-signed Employee/Manager/Owner API tests, RLS-direct-DML rejection.
- [x] Real Employee module at 390px + real Manager module at desktop browser using signed JWT against disposable PostgREST, Employee sees approved state after Manager click. Owner browser proof is a test-only audit view, **not production Owner UX**.
- [x] No Schedule/Attendance/Payroll mutation in disposable CI; no paid staging project.
- [ ] Exact-head same-sha UI2, People Shift, AUTH-PROD and isolated offschedule QA **all green** after every UI change; check any stale `queued` run.
- [ ] Full hosted schema/RPC/ACL/RLS preflight **read only**, including migration ordering (PR #523 may be a predecessor), indexes and default ACL; compare source against actual production functions.
- [ ] Real Owner audit UI integrated and accepted; Phone 360/390/430, Manager 1024/1440, navigation/back/reload/unsaved states.
- [ ] Versioned migration generated via Supabase CLI; dry-run on isolated *full schema*, DBA reviewed, security advisors; backend deployed first, default OFF.
- [ ] Backup/recovery test and reversible *write-disable* rollback; never delete approved audit history in production.
- [ ] Separate approved-payroll-source design, confirmed-minutes reconciliation, non-duplication (off schedule + official schedule), and payroll source hash/revision test.
- [ ] Owner selects a single pilot store and explicitly approves release. Pilot before any rollout to four stores.

## Safe rollout procedure — NOT AUTHORIZATION TO RUN IT

1. Review exact-head CI and source diff, confirm a real backup restore path and schema fingerprint.
2. Apply versioned backend migration on authorized Supabase only after Owner approval, default OFF; check `enabled=true` row count is 0 and API RLS. Keep UI unavailable until backend is verified.
3. Ship UI guarded by backend's scoped `list_my_offschedule_stores_v1` function; if API is missing or policy disabled, Employee submission controls are hidden.
4. Enable **one selected store only**, verify Employee submit→Manager review→Owner audit and exact status, cross-store isolation, missed-shift collision, and payroll source reconciliation.
5. On discrepancy, disable just that store's intake policy with authorized server-side SQL; preserve all audit rows. Stop rollouts until owner confirms.

**No production SQL, JWT, employee rows, payroll records or schedules are used by these QA workflows.**
