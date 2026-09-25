# MAGASIN Supervisor — Lightweight Resource Guard Architecture

Status: **LOCKED DESIGN / POST-RBT-009 IMPLEMENTATION**

Owner decision: optimize MAGASIN Supervisor for long-running operation on the current Windows machine by reducing physical browser pressure while preserving the existing Three-Lane logical model and exact-once guarantees.

This document is architecture only. It must not change the active RBT-009 soaked candidate or its runtime behavior while the final 8-hour release soak is running.

## 1. Locked operating model

MAGASIN keeps the current logical topology:

```text
3 lanes
x (1 Brain + 1 Work)
= 6 logical ChatGPT conversations
```

All lanes continue to share exactly one dedicated Robot Chrome profile/process.

Target physical-browser policy after release:

```text
6 logical conversations
-> 1 dedicated Robot Chrome
-> default resident ChatGPT page budget = 2
-> global destructive UI mutation concurrency = 1
```

A logical Brain/Work target does not require a permanently resident tab. URLs and lane registry state remain authoritative; tabs are transient execution resources.

## 2. Primary optimization objective

Reduce:

- Chrome RAM usage;
- resident renderer/process count;
- idle tab memory;
- unnecessary page reconstruction;
- browser pressure during long-running Robot operation.

Do not trade memory savings for semantic corruption.

The optimizer must preserve:

- exact Brain/Work target identity;
- exact-once dispatch/relay;
- active task and result latches;
- pending Work target semantics;
- Work-full rollover;
- stale-target quarantine;
- watchdog state;
- Owner STOP;
- Owner-selected Brain authority.

## 3. Default page budget

Current released scheduler uses global page budget 3.

Post-release target default:

```text
DEFAULT_PAGE_BUDGET = 2
```

This means at most two resident ChatGPT pages are retained by the Robot under normal conditions.

The six logical conversations remain available by persisted canonical URL and are reopened only when the scheduler needs them.

The page budget is a maximum, not a target. If only one page is needed, the scheduler should keep one.

## 4. Safe page residency rules

Priority order for retaining pages:

1. page performing ACTIVE_MUTATION;
2. page with a verified incomplete/running assistant response that cannot yet be safely released;
3. page needed for immediate exact-once reconciliation;
4. active observation page;
5. PARKED page;
6. EVICTABLE page.

The Resource Guard may only evict a page that the scheduler already considers safe to evict.

It must never:

- close an ACTIVE_MUTATION page;
- close a page with an unpersisted composer artifact;
- kill a task merely because RAM is high;
- clear dispatch/relay state to free memory;
- change Brain/Work targets;
- treat a memory event as Work-full;
- create a replacement Brain.

## 5. Memory pressure states

Use system physical-memory utilization, sampled at a bounded cadence.

Initial thresholds:

```text
RAM < 75%        -> NORMAL
75% to <85%      -> MEMORY_PRESSURE
85% to <90%      -> MEMORY_HIGH
>=90% sustained  -> MEMORY_CRITICAL
```

Thresholds are operational defaults and may later be tuned from soak evidence.

A single transient sample must not trigger destructive behavior. Use a short sustained window for HIGH/CRITICAL transitions.

### NORMAL

- page budget = 2;
- normal scheduler fairness;
- normal observation cadence.

### MEMORY_PRESSURE

- keep page budget <=2;
- aggressively evict safe EVICTABLE pages;
- avoid speculative/preload navigation;
- reduce nonessential observation frequency;
- do not create extra browser pages merely for convenience.

### MEMORY_HIGH

- dynamic effective page budget may reduce from 2 to 1 when safe;
- do not evict guarded active-response or mutation pages;
- defer opening a second page until memory returns below hysteresis threshold or the existing page reaches a safe release boundary;
- continue persisted scheduling state without reset.

### MEMORY_CRITICAL

- stop starting new browser mutations/navigation that would allocate another heavy page;
- preserve currently active guarded page(s);
- allow only bounded actions necessary to reach a safe persisted state;
- surface `MEMORY_CRITICAL / WAIT_RESOURCE` in status/Control Panel;
- do not kill Chrome automatically as the first response;
- do not kill Windows processes outside the dedicated Supervisor Chrome;
- do not clear task/latch state.

If memory remains critical for a configured sustained interval and no safe progress is possible, fail closed and require Owner attention rather than forcing a destructive restart.

## 6. Hysteresis

Avoid oscillating between budgets 1 and 2.

Recommended initial hysteresis:

```text
enter MEMORY_PRESSURE at >=75%
leave MEMORY_PRESSURE only below 70%

enter MEMORY_HIGH at >=85%
leave MEMORY_HIGH only below 80%

enter MEMORY_CRITICAL at >=90%
leave MEMORY_CRITICAL only below 85%
```

The scheduler must not repeatedly open/close the same page around a threshold.

## 7. CPU guard

RAM is the primary guard for browser pressure, but sustained CPU pressure should also reduce nonessential polling.

Initial policy:

```text
CPU < 75% sustained   -> normal cadence
75% to <90% sustained -> reduce optional observation/poll work
>=90% sustained       -> defer nonessential browser mutations until pressure drops
```

CPU pressure alone must not reset a task or kill an active response.

Thermal shutdown cannot be inferred reliably from CPU percentage alone. Hardware temperature/power diagnostics remain separate from Supervisor orchestration.

## 8. Scheduler behavior with six logical chats

The scheduler continues round-robin across three lanes.

Typical path:

```text
Lane 1 Brain -> Work
release/park safe Brain page

Lane 2 Brain -> Work
release/park safe Brain page

Lane 3 Brain -> Work
release/park safe Brain page

observe/reconcile Work pages according to fairness and safety
```

The scheduler must not require six resident tabs.

With physical page budget 2, it may keep two Work pages resident when useful and reopen the third exact target later.

If two pages are guarded as non-evictable, the third lane waits for a safe browser resource boundary. This is preferable to exceeding memory protection or corrupting state.

## 9. No second Robot Chrome

The architecture explicitly forbids one Robot Chrome per lane.

Required topology:

```text
ONE dedicated Robot Chrome/profile
-> ONE CDP endpoint
-> shared browser scheduler
-> three independent lane registries
```

No resource optimization may spawn parallel dedicated Robot Chrome instances as a shortcut.

## 10. Control Panel observability

Add resource-safe status fields after implementation:

- system RAM percent;
- system CPU percent;
- Resource Guard state: NORMAL / MEMORY_PRESSURE / MEMORY_HIGH / MEMORY_CRITICAL;
- configured page budget;
- effective page budget;
- current resident ChatGPT pages;
- EVICTABLE / PARKED / guarded page counts;
- reason when a lane is waiting for browser resources.

Do not expose private URLs, message text, cookies, tokens, or browser-profile secrets.

## 11. Resource events

Add privacy-safe events only:

- `RESOURCE_PRESSURE_ENTERED`
- `RESOURCE_PRESSURE_CLEARED`
- `EFFECTIVE_PAGE_BUDGET_CHANGED`
- `LANE_WAITING_FOR_RESOURCE`

Allowlisted metadata:

- timestamp;
- resource state enum;
- RAM/CPU percentage rounded to bounded precision;
- configured/effective page budget;
- resident page count;
- lane_id when applicable;
- reason enum.

No page URL or conversation content.

## 12. Failure semantics

Resource pressure is not equivalent to:

- Work full;
- target missing;
- task stalled;
- Brain failure;
- network failure.

It must therefore have its own state/reason codes.

A resource-pressure transition must never:

- increment Work generation;
- alter Work revision;
- clear quarantine;
- rearm relay;
- resend a confirmed dispatch;
- duplicate a result relay;
- auto-create a Brain.

## 13. Windows safety

The Supervisor should not attempt to solve memory pressure by force-closing arbitrary Owner applications.

Allowed automatic process authority remains limited to the dedicated Supervisor Chrome/runtime processes already owned by MAGASIN lifecycle logic.

The Resource Guard may optimize its own page residency and scheduling but must not terminate:

- Owner's normal Chrome;
- Task Manager;
- Excel;
- other unrelated Windows applications.

## 14. Implementation sequence

Apply only after RBT-009 Tier B soak and release closure.

Recommended sequence:

```text
RBT-009 PASS
-> release closure
-> Legacy Runtime Decommission Audit
-> Resource Guard implementation
-> default page budget 3 -> 2
-> dynamic budget 2/1 under memory pressure
-> Control Panel resource status
-> regression + lifecycle/integrity/autostart gates
-> dedicated long-run resource soak
```

Resource Guard implementation may be combined with post-release cleanup only if the changes remain reviewable and acceptance evidence isolates both behaviors.

## 15. Required tests

Minimum deterministic tests:

1. six logical Brain/Work targets remain intact with only two physical pages;
2. default page budget never exceeds 2 after the new policy is active;
3. fair turns continue across three lanes;
4. active mutation page is never evicted;
5. active/incomplete Work page is not evicted when unsafe;
6. EVICTABLE page is chosen before PARKED/guarded page;
7. RAM pressure lowers effective budget only after threshold/sustained rule;
8. hysteresis prevents page-budget flapping;
9. MEMORY_CRITICAL blocks new heavy page opens without clearing task state;
10. recovery after memory drops resumes scheduling without duplicate dispatch/relay;
11. Owner STOP remains authoritative;
12. Owner normal Chrome is never targeted;
13. exact-one wrapper and dedicated Robot Chrome remain true;
14. Work hot-swap/pending target semantics remain intact;
15. stale-target quarantine remains intact;
16. watchdog/reload budgets remain intact;
17. Work-full rollover remains intact;
18. Brain planning ACCEPT/REJECT remains intact;
19. timeline events remain privacy-safe;
20. Control Panel process truth remains authoritative.

## 16. Acceptance target

Resource optimization is accepted only when a long-running 1/2/3-lane test proves:

- one dedicated Robot Chrome;
- six logical conversations preserved;
- resident ChatGPT pages <=2 in normal operation;
- effective budget can safely fall to 1 under simulated memory pressure;
- no duplicate dispatch;
- no duplicate relay;
- no target drift;
- no Owner STOP bypass;
- no navigation storm;
- no unsafe page eviction;
- no arbitrary Owner-process termination;
- lower or bounded Chrome memory pressure compared with the current page-budget-3 baseline.

## 17. Locked final statement

The agreed lightweight architecture is:

**3 independent lanes / 6 logical chats / 1 dedicated Robot Chrome / default physical page budget 2 / mutation concurrency 1 / dynamic memory-aware effective budget / fail-closed resource protection.**

The goal is smooth long-running operation with less browser memory pressure without weakening exact-once, target authority, or recovery safety.
