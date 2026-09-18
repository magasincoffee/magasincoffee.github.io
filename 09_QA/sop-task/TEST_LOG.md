# SOP / Task QA Test Log

## 2026-09-18 — TASK-024 Manager Task route canonicalization

- Branch: `fix/task-024-manager-task-route`
- Workflow: `SOP Task Tests`
- Verified run: `35321868757`
- Static route regression: **PASS**
- Canonical Shared Core auth path: PASS.
- Canonical Manager runtime path: PASS.
- Employee/Staff role routing to `/06_EMPLOYEE/`: PASS.
- Legacy `/manager-v13-runtime.html` request count: 0.
- Route-state prefix `/05_MANAGER`: PASS.
- Browser top URL: `/05_MANAGER/Cong-viec/`.
- Browser active view: `view-tasks`.
- Browser console errors: 0.
- Browser page errors: 0.
- Browser request failures: 0.
- Browser HTTP 5xx: 0.
- Task write RPC/schema/production mutation: none.
- Gate: TASK-024 **DONE**; TASK-025 may proceed.
