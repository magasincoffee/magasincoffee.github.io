# MAGASIN — Employee Live Readiness — TEMP SOURCE OF TRUTH

**Search key:** `EMPLOYEE-LIVE`  
**Track ID:** `MAGASIN_EMPLOYEE_LIVE_READINESS_V1`  
**Status:** `ACTIVE / TEMPORARY EXECUTION AUTHORITY`  
**Created:** 2026-09-30  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Baseline:** `main @ d09510a9ee1036ccb9e9e1b05e888ca70e5a8af7`  
**TEMP lifecycle rule:** **DELETE THIS FILE after EMLIVE-004 closes.**

## Boundary

This track starts **after** an employee account is ACTIVE.

- `EMPREG-HARDENING` owns signup / email verification / activation / Auth hardening.
- `EMPLOYEE-LIVE` owns the post-login Employee app used to collect real Workforce data.
- Workforce canonical business rules remain governed by `WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`.

## Target live loop

```text
ACTIVE EMPLOYEE
→ Hôm nay
→ đăng ký thời gian có thể làm tuần sau
→ Manager xếp + publish lịch
→ Employee xem lịch
→ Đổi/Cho ca khi cần
→ Employee gửi giờ làm thực tế
→ Manager review ngoại lệ
→ Employee xem giờ công/lương
→ Cá nhân / thông báo
```

## EMLIVE-001 — Employee surface + availability data capture

**Status:** `DONE / PR #346 / EXACT-MAIN GREEN`

- remove/hide unfinished legacy Employee surfaces from the active UI;
- remove local-only avatar edit affordance;
- remove fake/non-functional password-settings form;
- keep canonical navigation: Hôm nay / Lịch / Công / Lương / Tôi; Đổi/Cho ca remains a secondary schedule action;
- make next-week availability Vietnamese and explicit;
- make each saved interval immediately authoritative; no fake final-submit semantics;
- Today must show whether next-week availability is missing or already saved from canonical rows;
- refresh Today immediately after availability changes.

## EMLIVE-002 — Schedule / Swap-Give / Attendance live UX reconciliation

**Status:** `DONE / PR #347 / EXACT-MAIN GREEN`

- verify published schedule, swap/give, attendance empty/error/success states against production truth;
- remove remaining stale/deprecated presentation;
- ensure every mutation re-reads canonical server truth.

## EMLIVE-003 — Employee notification/profile/payroll live UX

**Status:** `DONE / PR #348 / EXACT-MAIN GREEN`

- verify notification feed, canonical profile, payroll self-check;
- no fake writable profile/payroll controls;
- explicit unavailable/empty semantics.

## EMLIVE-004 — Exact-main + real employee acceptance + TEMP cleanup

**Status:** `READY / MUST_BE_LAST`

- exact-main People Shift / UI acceptance GREEN;
- bounded real Employee lifecycle acceptance;
- record permanent closure evidence;
- delete this TEMP file.

```text
CURRENT = EMLIVE-004
PREVIOUS = EMLIVE-003 DONE / PR #348 / exact main d09510a9ee1036ccb9e9e1b05e888ca70e5a8af7
NEXT    = exact-main + bounded real Employee acceptance + permanent closure evidence + TEMP cleanup
```
