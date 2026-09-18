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
| TASK-026 | SOP/Task rule decision pack + data/migration plan | 20m | traceability/contract + Owner boundary | WAIT_USER |

Queue Day 8–10 đã hoàn tất. TASK-023 xác nhận Day 11–13 hiện có SOP registry skeleton, Manager/Employee Task placeholders, Control Tower Task/SOP chưa có verified source, không có verified persistence/API contract, và exception/corrective/overdue/verify-close rules chưa được chốt. Live schema check chỉ đọc structural metadata và không tìm thấy public object name khớp Task/SOP/Checklist/Exception/Corrective. TASK-024–025 chỉ sửa route/UI fail-closed; TASK-026 là Owner/business-rule boundary trước mọi write-capable SOP/Task workflow.

## Execution rule

Task tiếp theo chỉ chạy khi task hiện tại đạt Definition of Done hoặc được chuyển rõ sang `WAIT_USER` / `BLOCKED`.

Supervisor chỉ auto-continue khi `00_PROJECT_STATE.json` cho phép.
