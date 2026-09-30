# MAGASIN — Employee Live Readiness V1 — Acceptance Evidence

**Track:** `MAGASIN_EMPLOYEE_LIVE_READINESS_V1`  
**Task:** `EMLIVE-004`  
**Status:** `CLOSED / ACCEPTED`  
**Date:** 2026-09-30  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Starting exact main:** `544c028db1c27b97390a551e9653018630f4fb7a`

## 1. Scope

This permanent record replaces the temporary Employee Live Readiness execution Source of Truth after EMLIVE-004.

The track owns the ACTIVE Employee post-login app only:

- Hôm nay;
- next-week Availability;
- published Schedule;
- Swap / Give;
- Attendance;
- Notification;
- Profile;
- Payroll self-check.

It does not reopen Employee registration/Auth hardening, Manager scheduling architecture, or cross-store business configuration.

## 2. Canonical Employee authority preserved

The accepted Employee app remains on the existing canonical server authority.

Read paths verified by the live acceptance:

- `get_my_availability(date)`;
- `list_my_approved_schedules_v2(date)`;
- `get_my_attendance_v2(date,date)`;
- `list_my_notifications_v1(integer)`;
- `get_my_employee_workforce_profile_v1()`;
- `get_my_payroll_self_check_v1()`.

EMLIVE-004 introduces no new RPC, browser table access, writer, credential path, role/status mutation, payroll calculation, or parallel data truth.

## 3. Production project and safety boundary

Production project used for read-only acceptance:

- project: `MAGASIN-NOIBO`;
- ref: `menvbzlsncmpuvnaifxa`;
- status at acceptance: `ACTIVE_HEALTHY`.

The acceptance used existing ACTIVE Employee identities that already had real sign-in history.

No Employee password or secret was read by this acceptance. No credential was changed. No profile role/status/scope was changed. No production Availability, Schedule, Attendance, Notification, Profile, Payroll, Store Priority, or Staffing Requirement row was inserted, updated, deleted, relabelled, or fabricated.

The authenticated production RPC smoke was executed under the canonical authenticated/JWT database context for existing ACTIVE Employee identities and was read-only.

## 4. Real production precondition

Read-only reconciliation established:

- ACTIVE Employee profiles: **4**;
- ACTIVE Employee profiles with existing sign-in history: **3**;
- production Employee Availability rows: **17**;
- approved `work_schedules`: **0**;
- Attendance rows: **0**;
- Payroll entries: **0**.

The absence of downstream Schedule / Attendance / Payroll truth is accepted as real production state. EMLIVE-004 does not fabricate those business events merely to make the acceptance non-empty.

## 5. Bounded real Employee acceptance

Three existing ACTIVE Employee identities with historical sign-in evidence were exercised independently under authenticated server context.

For all three identities:

- `get_my_employee_workforce_profile_v1()` returned exactly one self row;
- returned `employee_id` matched `auth.uid()`;
- no cross-user profile projection was returned;
- Schedule, Attendance, Notification and Payroll readers executed without production path errors;
- empty results remained valid empty truth rather than synthetic data.

Next-week Availability for week beginning **2026-10-05** reflected existing production rows:

- Employee acceptance identity 1: **7 rows**;
- Employee acceptance identity 2: **3 rows**;
- Employee acceptance identity 3: **0 rows**.

No private employee identity value is preserved in this evidence.

## 6. UI / browser acceptance inherited from exact implementation main

EMLIVE-001 through EMLIVE-003 established the production Employee presentation and authority boundary.

Exact implementation main for EMLIVE-003:

`d09510a9ee1036ccb9e9e1b05e888ca70e5a8af7`

Green exact-main gates:

- People Shift Day-10 Tests — run `36722347804` — SUCCESS;
- UI2 Cross Role Acceptance — run `36722348035` — SUCCESS;
- AUTH-PROD Regression Contract — run `36722347941` — SUCCESS;
- SOP Task Tests — run `36722348283` — SUCCESS;
- Validate MAGASIN GitHub Pages source — run `36722347929` — SUCCESS;
- pages build and deployment — run `36722345413` — SUCCESS.

The EMLIVE-003 runtime remains the accepted Employee runtime:

- Profile: plain Employee language, read-only self projection, fail-closed;
- Payroll: plain Employee language, read-only self-check, no invented monetary value;
- Notification: loading / empty / unavailable / retry semantics without backend error leakage;
- no direct browser DML;
- no `service_role` in Employee runtime;
- no fake writable Profile or Payroll controls.

## 7. EMLIVE-004 closure gate

The EMLIVE-004 closure PR must:

1. remove the temporary `EMPLOYEE_LIVE_READINESS_TEMP_SOURCE_OF_TRUTH.md`;
2. keep this permanent evidence file;
3. keep EMLIVE-001 → EMLIVE-003 regressions green;
4. run People Shift and UI2 Cross Role on the final PR head;
5. merge only after those gates are GREEN;
6. verify exact post-merge main with the same executable gates plus GitHub Pages;
7. then update this record to `CLOSED / ACCEPTED` with final closure evidence.

## 8. Permanent invariants

- Employee Profile = self-only read.
- Employee Payroll = self-only read; no client state transition authority.
- Employee Notification = self feed only.
- Availability is Employee input; it is not an official Schedule.
- `work_schedules` remains official Schedule truth.
- Attendance authority follows current official Schedule ownership.
- No legacy amount/rate field becomes Payroll truth.
- Backend failures fail closed and are not rendered as implementation language.
- Empty production state is never replaced with fake acceptance data.

## 9. Current closure state

`EMLIVE-001` = DONE / PR #346 / EXACT-MAIN GREEN  
`EMLIVE-002` = DONE / PR #347 / EXACT-MAIN GREEN  
`EMLIVE-003` = DONE / PR #348 / EXACT-MAIN GREEN  
`EMLIVE-004` = DONE / PR #350 / EXACT-MAIN GREEN / TEMP REMOVED

The temporary execution Source of Truth is removed by the EMLIVE-004 closure change and must not be recreated after this track closes.

## 10. Final closure evidence

Implementation closure PR:

- PR: **#350**;
- final PR head: `5113e961db6d671dbb81c198d0b04b4b4ced9d73`;
- PR-head UI2 Cross Role Acceptance: run `36724952347` — SUCCESS;
- PR-head People Shift Day-10 Tests: run `36724952300` — SUCCESS.

Implementation closure merge / exact main:

`bb46ac04c6e99aa756cf8d2dec8b90e6821a822a`

Exact-main gates:

- UI2 Cross Role Acceptance: run `36725402959` — SUCCESS;
- People Shift Day-10 Tests: run `36725402814` — SUCCESS;
- Validate MAGASIN GitHub Pages source: run `36725402809` — SUCCESS;
- pages build and deployment: run `36725401926` — SUCCESS.

The EMLIVE-004 merge removed the TEMP Source of Truth, preserved all Employee runtime authority, and introduced no production data mutation.

## 11. Canonical closure

`MAGASIN_EMPLOYEE_LIVE_READINESS_V1` is **CLOSED / ACCEPTED**.

There is no next EMLIVE task. Any future Employee work must be introduced through a new authoritative track rather than recreating the deleted TEMP Source of Truth.
