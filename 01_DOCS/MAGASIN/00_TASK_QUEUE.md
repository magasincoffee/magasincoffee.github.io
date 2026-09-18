# MAGASIN Business OS — Task Queue

**Plan:** BOS V1 / 21 days  
**Rule:** mỗi implementation task mục tiêu <= ~20 phút active work; lớn hơn phải chia.

| ID | Task | Est. | Gate | Status |
|---|---|---:|---|---|
| TASK-001 | Supervisor Robot discovery + bootstrap contract | 20m | spec + safe stop rules | DONE |
| TASK-002 | Supervisor project-state reader | 15m | unit tests | DONE |
| TASK-003 | Supervisor continuation decision engine | 20m | unit + regression | DONE |
| TASK-004 | Supervisor ChatGPT UI adapter spike | 20m | local non-destructive smoke | DONE |
| TASK-005 | Supervisor reconnect/retry policy | 15m | simulated failure tests | DONE |
| TASK-006 | Supervisor action executor: Continue / safe Retry | 20m | unit + local dry-run | DONE |
| TASK-007 | Supervisor START/STOP launcher + kill switch | 20m | local smoke | DONE |
| TASK-008 | Supervisor autonomy E2E loop | 20m | live bounded E2E | DONE |
| TASK-009 | Store/product canonical model review | 20m | discovery trace | DONE |
| TASK-010 | Database baseline/migration plan | 20m | schema review | DONE |
| TASK-011 | Owner Control Tower vertical-slice plan | 20m | acceptance defined | DONE |

| TASK-012 | Control Tower shell + normalized fixture contract | 20m | unit/fixture tests | DONE |
| TASK-013 | Owner home navigation + route/auth integration | 15m | integration test | DONE |
| TASK-014 | Procurement/payables read adapter | 20m | adapter tests | DONE |
| TASK-015 | Workforce attention read adapter | 20m | adapter tests | DONE |
| TASK-016 | Revenue read-adapter + reconciliation quality gate | 20m | contract tests | DONE |
| TASK-017 | Partial-source/error-state integration | 20m | regression tests | DONE |
| TASK-018 | Control Tower browser E2E + Day-7 usability gate | 20m | browser E2E | DONE |

| TASK-019 | People/Shift current-system gap review + acceptance contract | 20m | discovery/contract | DONE |

| TASK-020 | Staffing-gap read adapter + unit/regression contract | 20m | unit + forbidden-write regression | DONE |
| TASK-021 | Control Tower staffing-gap integration | 20m | adapter/integration + browser regression | DONE |
| TASK-022 | People/Shift browser E2E + Day-10 usability gate | 20m | browser E2E | DONE |

| TASK-023 | SOP/Task current-system gap review + acceptance contract | 20m | discovery/contract | DONE |
| TASK-024 | Manager Task route canonicalization + smoke regression | 15m | route/static + browser smoke | DONE |
| TASK-025 | SOP/Task fail-closed UI integrity gate | 20m | static/unit + browser regression | DONE |
| TASK-026 | SOP/Task rule decision pack + data/migration plan | 20m | traceability/contract + Owner boundary | DEFERRED |
| TASK-027 | Control Panel local GitHub Runner lifecycle + reboot recovery | 20m | PowerShell syntax + control regression | DONE |
| TASK-028 | Five-Step architecture reset + delete/defer map | 20m | architecture/source-of-truth review | DONE |
| TASK-029 | Schedule-first canonical flow contract | 20m | QUESTION/DELETE map + canonical ownership/data/RPC contract | DONE |
| TASK-030 | Employee weekly availability canonical slice | 20m | unit + browser regression | DONE |
| TASK-031 | Manager allocation + robot proposal + publish slice | 20m | integration + browser E2E | DONE |
| TASK-032 | Published schedule → attendance/swap/notification integration gate | 20m | end-to-end operating-loop gate + SFB-001/SFB-002 Owner boundary | DONE |
| TASK-033 | Give Shift production primitive | 20m | migration/RLS/RPC + browser E2E | DONE |
| TASK-034 | Notification event-outbox production | 20m | migration/RLS/triggers + SQL/integration tests | DONE |
| TASK-035 | MAGASIN email adapter/config | 20m | Gmail OAuth adapter + secret-store activation gate | DEFERRED |

| TASK-036 | Schedule-first closure regression + recovery gate | 20m | full canonical-flow regression + fail-closed external-email check + recovery/resume evidence | DONE |

TASK-026 remains a valid Owner decision pack but is deferred; it no longer blocks the enterprise queue. Architecture execution is now schedule-first under `00_ARCHITECTURE_5_STEP_RESET.md`. Every new task must pass QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE before implementation.

## Execution rule

Task tiếp theo chỉ chạy khi task hiện tại đạt Definition of Done hoặc được chuyển rõ sang `WAIT_USER` / `BLOCKED`.

Supervisor chỉ auto-continue khi `00_PROJECT_STATE.json` cho phép.
| TASK-037 | Windows auto-reboot/logon recovery | 75m | runner + Supervisor + Business Chrome autostart / Owner STOP latch | DONE |
| TASK-038 | Night-run persistence | 35m | deadline + cursor + lease + checkpoint + hard-stop contract | DONE |
| TASK-039 | Business OS Robot V2 project registry | 60m | two-project registry + project adapter contract | DONE |
| TASK-040 | Business OS Robot V2 portfolio scheduler | 55m | project isolation + WAIT_USER skip policy | DONE |
| TASK-041 | Business OS Robot V2 recovery engine | 45m | crash/reboot/reconnect/stale lease/duplicate suppression | DONE |
| TASK-042 | SaydiVoiceProvider production adapter offline | 90m | request/result + preflight + one-attempt + timeout/error/unit tests | DONE |
| TASK-043 | Cross-project handoff integration | 50m | Business OS → Media Robot → Business OS state isolation | DONE |
| TASK-044 | Portfolio-aware diagnostics | 45m | project/task/checkpoint/error privacy-safe logs | DONE |
| TASK-045 | Restart/resume simulation | 50m | kill/restart/reconcile/resume regression | IN_PROGRESS |
| TASK-046 | Night full QA | 35m | both-project regression + bounded fixes | READY |
| TASK-047 | Night docs / evidence / PR prep | 20m | changelog/test logs/reviewable PRs | READY |
| TASK-048 | Night final checkpoint | 10m | report + NIGHT_WINDOW_COMPLETE + WAIT_USER | READY |
