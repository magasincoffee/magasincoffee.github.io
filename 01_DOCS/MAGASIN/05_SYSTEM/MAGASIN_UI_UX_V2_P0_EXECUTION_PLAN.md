# MAGASIN UI/UX V2 — P0 EXECUTION PLAN

**Status:** OWNER PRIORITY LOCKED / P0 READY / RELEASED  
**Priority:** P0 — highest implementation priority until UI/UX V2 closure  
**Architecture:** `MAGASIN_OPERATIONS_UI_V2`  
**Canonical UI SoT:** `01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_UI_UX_V2_SOURCE_OF_TRUTH.md`  
**Execution model:** PLAN → one WORK task → RESULT → VERIFY → ACCEPT/REJECT → next task

## 1. Priority rule

Owner decision dated 2026-09-25:

TASK-108 Gate A/B/C is Brain-ACCEPTED and TASK-108 is canonically DONE/CLOSED. Therefore MAGASIN UI/UX V2 is now the **P0 implementation track**, READY/RELEASED for Brain dispatch, and remains the default next-work priority until the full UI/UX V2 closure gate is ACCEPTED.

Release basis: TASK-108 qualified executable SHA `8fd8a446d6722871af0be4171b5e129d2f6eea40`, People Shift run `36123096106`, job `108032943733`, with Gate C cold/reload evidence accepted. The current documentation/state `main` lineage is not a replacement for that executable qualification SHA.

Next dependency-correct UI work item: **UI2-001**. This plan does not auto-start UI2-001; Brain must dispatch it explicitly.

While this P0 track is active:
- do not start unrelated feature-expansion work ahead of UI V2;
- security, production incident, data-integrity, or Owner-intervention emergencies may interrupt;
- an already-dispatched Work task must finish/stop at its own safety boundary before UI work begins;
- every UI task is dispatched one at a time by Brain;
- Work never advances itself to the next UI task.

## 2. Product outcome

Deliver one professional MAGASIN webapp from Login through Employee, Manager and Owner, while preserving canonical business logic and server authority.

The Employee experience is the strongest acceptance constraint:
- 100% phone-primary real-world usage;
- mobile-first;
- 360 / 390 / 430 px browser acceptance;
- no core Employee flow requires desktop;
- primary touch targets >=44×44 CSS px;
- no horizontal page overflow.

## 3. Bounded execution queue

Tasks below are planning items only. Brain must dispatch exactly one at a time and VERIFY before moving forward.

| Order | Task ID | Primary outcome | Target active work |
|---:|---|---|---:|
| 1 | UI2-001 | Audit current Login/Employee/Manager/Owner presentation surfaces and lock shared token/component migration map | <=20m |
| 2 | UI2-002 | Implement shared MAGASIN design tokens + foundational UI primitives without changing domain behavior | <=20m |
| 3 | UI2-003 | Redesign Login/register/recovery/reset surfaces using shared design system | <=20m |
| 4 | UI2-004 | Implement shared authenticated shell primitives and role-aware navigation structure | <=20m |
| 5 | UI2-005 | Build Employee mobile app shell + bottom navigation + responsive safe-area behavior | <=20m |
| 6 | UI2-006 | Redesign Employee Today/Home mobile-first | <=20m |
| 7 | UI2-007 | Redesign Employee Schedule + week view mobile-first | <=20m |
| 8 | UI2-008 | Redesign Employee Availability + Swap/Give mobile interactions | <=20m |
| 9 | UI2-009 | Redesign Employee Attendance + Payroll + Profile mobile surfaces | <=20m |
| 10 | UI2-010 | Employee mobile acceptance gate at 360/390/430px + core regression | <=20m |
| 11 | UI2-011 | Redesign Manager shell + Today Action Center | <=20m |
| 12 | UI2-012 | Redesign Manager weekly scheduling board interactions | <=20m |
| 13 | UI2-013 | Unify Manager Swap/Give, Attendance, Employees, Payroll presentation | <=20m |
| 14 | UI2-014 | Redesign Owner shell + Overview + Attention Center | <=20m |
| 15 | UI2-015 | Unify Owner Workforce / Procurement / Finance / Access entry and drill-down presentation | <=20m |
| 16 | UI2-016 | Cross-role responsive/accessibility/visual consistency pass | <=20m |
| 17 | UI2-017 | Full UI V2 exact-main regression + cold/reload + closure evidence | <=20m |

If any item cannot safely fit the target active-work window, Brain must split it before dispatch. The time target is not a runtime timeout.

## 4. Required gate discipline

Each task must explicitly preserve:
- canonical RPC semantics;
- RLS;
- role/store scope;
- canonical Workforce schedule truth;
- existing accepted business flows;
- no protected browser direct DML;
- no parallel writer/state machine.

Each implementation task must return:
- changed files;
- exact commit/head SHA;
- targeted tests;
- browser evidence where visual behavior changed;
- regression result;
- explicit statement of no intentional business-logic change.

Employee tasks additionally require phone evidence.

## 5. Employee acceptance contract

For every Employee UI task that changes a core surface:
- browser viewport evidence at 390px is mandatory;
- 360px and 430px must be covered by the Employee acceptance gate and should be used earlier where risk exists;
- no page-level horizontal overflow;
- no clipped fixed bottom navigation;
- no primary action below inaccessible viewport chrome;
- mobile-safe drawer/dialog behavior;
- touch controls >=44px when primary;
- no hover-only action;
- loading/error/empty/retry states remain usable;
- back/reload must not present stale canonical truth.

UI2-010 cannot PASS unless the complete Employee core flow is usable phone-only.

## 6. Manager acceptance contract

Manager is desktop/tablet operations-first:
- clear Action Center;
- schedule board optimized for operational review/edit/publish;
- phone remains usable for monitoring and bounded quick actions;
- no change to Manager canonical scheduling authority.

## 7. Owner acceptance contract

Owner is enterprise oversight-first:
- Overview and Attention Center precede disconnected module-card selection;
- cross-store context is explicit;
- exception/drill-down flow is clear;
- no Owner-only parallel daily scheduling truth.

## 8. Closure definition

MAGASIN UI/UX V2 is CLOSED only when:
1. UI2-001 → UI2-017 are ACCEPTED or formally superseded by an Owner-approved equivalent;
2. Login and all three role workspaces share the canonical design system;
3. Employee core flows pass phone-only acceptance at 360/390/430px;
4. Manager and Owner responsive targets pass;
5. business/domain regression remains green;
6. exact-main cold/reload verification passes;
7. canonical project state and evidence docs are reconciled.

Until then, UI/UX V2 remains P0 and the next dependency-correct UI task is preferred over unrelated feature expansion.

## 9. Stop boundaries

Work must STOP after each task evidence submission.

Only Brain may:
- ACCEPT/REJECT;
- issue correction;
- dispatch the next task;
- declare the P0 UI track CLOSED.
