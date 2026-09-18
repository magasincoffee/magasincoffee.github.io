# MAGASIN — TASK-036 Schedule-first Closure Regression + Recovery Gate V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-036  
**Date:** 2026-09-18  
**Status:** IN_PROGRESS

## Five-Step

### QUESTION

The schedule-first operating loop is implemented through durable in-app notification/outbox. The only open TASK-035 dependency is external Gmail production activation, which Owner explicitly deferred.

The remaining critical-path question is therefore:

> Can the canonical weekly schedule loop be proven stable, fail-closed and recoverable without external email?

### DELETE

Do not add:

- new business modules;
- Gmail production activation;
- external calendar;
- new scheduling rules;
- SOP/Task write automation;
- dashboard expansion;
- speculative schema changes.

TASK-035 remains deferred and email remains fail-closed/not deployed.

### SIMPLIFY

Reuse the already verified canonical chain:

```text
Employee availability
→ Manager review/allocation
→ Robot DRAFT proposal
→ Manager publish
→ Employee published schedule
→ attendance
→ Swap / Give
→ durable notification outbox
→ Employee in-app notification
```

External email is not required to close this V1 operating loop.

### ACCELERATE

Run one bounded regression gate over existing deterministic contracts:

- Five-Step schedule-first state/queue contract;
- canonical schedule-first flow;
- Employee availability;
- published-schedule feedback loop;
- schedule-linked attendance;
- Swap regression;
- Give Shift V1;
- Notification Outbox V1;
- email adapter fail-closed behavior with no runtime secrets;
- Supervisor recovery/continuation regression relevant to resume after interruption.

No production fixtures, destructive writes or new credentials.

### AUTOMATE

If the regression/recovery gate passes:

1. mark TASK-036 DONE;
2. mark schedule-first critical path STABLE;
3. preserve TASK-035 as non-blocking deferred activation debt;
4. keep `autonomy=AUTO_CONTINUE`;
5. select the next critical value stream only through a new Five-Step gate.

If any regression fails, set `FIXING` and repair only the verified failure before continuing.

## Definition of Done

- all selected deterministic regressions pass;
- email provider remains fail-closed with no secrets/deploy;
- no Owner boundary is pending;
- recovery/resume contract passes;
- source-of-truth docs/state/queue/change log are updated;
- no module outside the schedule-first critical path is expanded.
