# Supervisor Bug Log

## BUG-SUP-001 — OAuth/login navigation closes setup browser

- Date: 2026-09-18
- Component: Supervisor profile setup
- Reproduction: during one-time ChatGPT profile setup, click the email/Google login path while the setup loop is probing the page.
- Observed: Playwright throws `Execution context was destroyed, most likely because of a navigation`; the uncaught exception exits the script and the `finally` block closes the persistent Chrome context.
- Impact: setup browser closes before the Owner can finish authentication.
- Root cause: navigation races were treated as fatal instead of an expected authentication transition.
- Safety impact: none. No credential/message text was captured and no message/control action was sent.
- Fix plan:
  1. treat navigation/context-destroyed errors as transient during setup;
  2. follow the active page across same-tab navigation/popups;
  3. avoid probing third-party authentication pages;
  4. resume detection only when a ChatGPT page is available;
  5. regression-test navigation race behavior.
- Status: VERIFIED — fixed by real Chrome + CDP attach; local setup run 35298993647 PASS


## BUG-SUP-002 — Google rejects Playwright-launched Chrome during OAuth

- Date: 2026-09-18
- Component: Supervisor profile setup
- Reproduction: open ChatGPT from a Playwright `launchPersistentContext`, choose Google/email sign-in.
- Observed: Google displays "Không thể đăng nhập cho bạn" and indicates the browser/app may not be secure. Chrome also shows that it is controlled by automated test software.
- Impact: Owner cannot complete one-time ChatGPT authentication in the automation-launched browser.
- Root cause: authentication is being attempted inside a browser instance launched under browser-automation control.
- Corrective direction: use a real installed Chrome process launched normally with a dedicated local profile and remote-debugging endpoint; Supervisor attaches to that browser over CDP instead of launching the login browser itself.
- Safety boundary: the Owner enters credentials directly into the real browser. Supervisor does not request, capture, log, or store credentials, cookies, tokens, MFA, or message bodies.
- Status: VERIFIED — real Chrome authenticated setup run 35298993647 PASS


## BUG-SUP-003 — Authenticated conversation not captured when composer is not visible

- Date: 2026-09-18
- Component: Supervisor profile setup
- Reproduction: Owner is authenticated and opens a valid ChatGPT conversation URL, but the prompt composer is not currently rendered/visible in the captured viewport.
- Observed: setup remains waiting because target capture required both `conversationPath` and `composerReady`.
- Impact: successful authentication is not recognized promptly.
- Root cause: one-time target capture used a UI visibility condition that is unnecessary for identifying a valid authenticated conversation.
- Fix: capture the local conversation target when a ChatGPT conversation path is detected; runtime send eligibility remains separately gated by composer/state checks.
- Status: VERIFIED — local setup run 35298993647 reached READY_IDLE and stored target locally


## BUG-SUP-004 — Short-lived CDP CLI does not exit after successful result

- Date: 2026-09-18
- Component: Supervisor dry-run / one-shot CLI
- Reproduction: connect to real Chrome through Playwright `connectOverCDP`, perform a successful read-only step, logically detach without closing the real browser.
- Observed: CLI prints a valid PASS result but Node remains alive because the CDP websocket handle stays on the event loop; GitHub job remains in-progress until cancellation/timeout.
- Evidence: dry-run run `35300174869` printed PASS at 02:48:34Z but stayed active until concurrency cancellation.
- Impact: self-hosted runner remains occupied and later Supervisor jobs queue unnecessarily.
- Root cause: logical session detach did not close the Playwright CDP socket handle, and calling Browser.close() would undesirably close the owner's real Chrome.
- Fix: short-lived CI CLIs explicitly terminate the Node process after their finally/disconnect path. The continuous Supervisor loop does not use this forced-exit path.
- Status: VERIFIED — short-lived CLI regression + live retry smoke completed without lingering CLI


## BUG-SUP-005 — STOP sentinel does not guarantee prompt kill-switch termination

- Date: 2026-09-18
- Component: Windows Supervisor launcher/kill switch
- Reproduction: install runtime, start Supervisor in dry-run mode, create the STOP sentinel and wait for the wrapper PID file to disappear.
- Observed: installer smoke run `35300984151` passed install/start but failed the STOP step because the wrapper PID file remained beyond the smoke grace period.
- Impact: a STOP request can be delayed while the runtime is blocked in browser/network work; this is not strong enough for the required local kill switch.
- Root cause: stop script only wrote a sentinel and relied on the cooperative loop to return to its next sentinel check.
- Fix: keep cooperative STOP first, then after a short grace period force-terminate the Supervisor process tree and remove the PID file. This applies only to the dedicated Supervisor process, not the GitHub runner.
- Status: VERIFIED — installer/START/STOP smoke run 35301449363 PASS


## BUG-SUP-006 — Installer cannot replace runtime while previous Supervisor process is alive

- Date: 2026-09-18
- Component: Windows Supervisor installer
- Reproduction: a previous persistent/dry-run Supervisor process survives Actions cleanup and still has the runtime directory open; installer attempts `Remove-Item -Recurse`.
- Observed: installer smoke run `35301290507` fails with "process cannot access ... runtime because it is being used by another process."
- Impact: upgrades/reinstalls cannot proceed deterministically.
- Root cause: installer assumed the runtime directory was idle and did not stop an already-running Supervisor before replacement.
- Fix: installer first reads the local Supervisor PID, force-stops only that dedicated process tree when present, removes stale PID/STOP files, then retries runtime replacement with a bounded loop.
- Status: VERIFIED — installer/START/STOP smoke run 35301449363 PASS


## BUG-SUP-007 — Fixed CDP port can attach to the wrong/stale listener

- Date: 2026-09-18
- Component: Windows Supervisor launcher / Playwright CDP attach
- Reproduction: port `9222` is already occupied or its HTTP `/json/version` endpoint is reachable while the listener is not the dedicated Supervisor Chrome process.
- Observed: the wrapper treats the port as ready, but Playwright cannot establish a valid CDP session and eventually reports `RetryBudgetExhaustedError`.
- Impact: automatic Chrome restart can repeat without recovering because the wrapper keeps trusting the same fixed port.
- Root cause: readiness checked only HTTP reachability on a hard-coded port; it did not verify listener ownership, and Playwright consumed the HTTP endpoint instead of the normalized browser websocket URL.
- Fix:
  1. validate that the listening PID is Chrome launched with the dedicated Supervisor profile and matching remote-debugging port;
  2. choose the first free port in the bounded range 9222–9232 when the default is occupied;
  3. pass the selected port to the Node Supervisor;
  4. resolve `/json/version` and normalize `webSocketDebuggerUrl` to the explicit loopback host before `connectOverCDP`;
  5. keep nested `fetch failed / ECONNREFUSED` errors inside the bounded retry/restart policy.
- Regression coverage: Windows port-ownership contract, websocket normalization, nested fetch retry.
- Status: FIXED IN CODE — pending field verification on MAGASIN-BUSINESS-PC.


## BUG-SUP-008 — PID file is not a process lock; orphaned Supervisor loops can survive reinstall

- Date: 2026-09-18
- Component: Windows Supervisor START/STOP/install/runtime wrapper
- Field symptom: dedicated ChatGPT Chrome repeatedly leaves a newly created conversation and returns to target recovery/rollover even after a clean runtime reinstall.
- Code defect: `supervisor.pid` records only the most recently started wrapper. A second or orphaned `run-supervisor.ps1` can survive with its own Node loop, and another START can overwrite the PID file. Multiple loops can then drive the same dedicated Chrome target independently.
- Fix:
  1. add a named Windows singleton mutex to `run-supervisor.ps1`;
  2. START scans for an existing installed wrapper before spawning another;
  3. STOP/install/repair clean every matching orphaned wrapper and `supervisor-loop-cli.mjs` process, not only the PID-file process.
- Safety: process matching is restricted to the MAGASIN Supervisor wrapper/runtime or its unique loop script. Normal Chrome remains outside this cleanup.
- Regression coverage: singleton mutex, orphan cleanup on STOP/install/repair, Windows PowerShell syntax gate.
- Status: FIXED IN CODE — pending field verification.

## BUG-SUP-009 — Healthy active conversation loses to stale target navigation

- Date: 2026-09-18
- Component: continuous Supervisor target recovery
- Field symptom: after a successful rollover creates a new ChatGPT conversation, the panel returns to `WAIT_TARGET` / `ROLLOVER_TARGET_MISSING` and the browser can land back on the ChatGPT home composer.
- Code defect: when the dedicated browser is already on a valid usable conversation path that differs from local `target.json`, the loop navigates to the old target before considering the active conversation.
- Fix: before stale-target navigation, probe and atomically adopt the active usable ChatGPT conversation; reset target-recovery counters after adoption.
- Regression coverage: source-order gate requires active target adoption before `page.goto(wanted)`.
- Status: FIXED IN CODE — pending field verification.


## BUG-SUP-010 — Advisory "thử lại" text falsely classified as transient error

- Date: 2026-09-18
- Component: ChatGPT UI snapshot / transient-error classifier
- Field symptom: a completed assistant response is visible, but Control Panel reports `RETRYING`, `UI=TRANSIENT_ERROR`, `OBS=TRANSIENT_ERROR`, and repeatedly logs `executed=false | reason=awaiting observable assistant progress`.
- Reproduction: ChatGPT displays a non-error advisory such as "Bạn có thể thử lại với mô hình nhanh hơn..." while the response itself is complete.
- Root cause: snapshot detection treated any visible control text containing `try again`, `thử lại`, or `retry` as a retry/error signal.
- Fix:
  1. retry controls now require an exact semantic label: `Try again`, `Retry`, or `Thử lại`;
  2. generic transient-error text is accepted only from an actual `role=alert` surface containing a recognized error phrase;
  3. advisory/help copy containing retry wording no longer changes the UI classification.
- Regression coverage: advisory wording false-positive and explicit retry/error positive cases.
- Runtime: `2026-09-18.4`.
- Status: FIXED IN CODE — pending field verification.


## BUG-SUP-011 — Real send timeout retry is blocked by the continuation progress latch

- Date: 2026-09-18
- Component: Supervisor loop controller / bounded Retry action
- Field symptom: ChatGPT shows an actual send-timeout surface with the safe `Thử lại` button, while Control Panel reports `RETRYING` and repeatedly logs `executed=false | reason=awaiting observable assistant progress`; the browser never clicks Retry.
- Root cause: after every successful CONTINUE send, the controller disarms until observable assistant progress. The same `armed` gate was also applied to RETRY, so a send that failed before any assistant progress could never execute its recovery action.
- Fix:
  1. the progress latch remains mandatory for another CONTINUE;
  2. an explicit safe RETRY may execute while the controller is disarmed;
  3. the existing action cooldown still prevents rapid duplicate Retry clicks;
  4. the existing retry budget still stops after bounded attempts.
- Regression coverage: CONTINUE -> no assistant progress -> TRANSIENT_ERROR -> safe Retry executes; immediate duplicate is cooldown-blocked; exhausted retry budget fail-closes.
- Runtime: `2026-09-18.5`.
- Status: FIXED IN CODE — pending field verification.


## BUG-SUP-012 — ChatGPT Work activity can leave the standard last-message role stuck on Owner

- Date: 2026-09-18
- Component: conversation-aware handoff / ChatGPT Work UI observation
- Field symptom: Control Panel stays `ONLINE • CHỜ CHATGPT` with `UI=USER_PENDING` / `OBS=USER_PENDING` even though the visible ChatGPT Work surface has already completed a long sequence of repository/tool activity.
- Root cause: the handoff observer relied on `[data-message-author-role]`. ChatGPT Work can render tool/activity traces outside the standard assistant message container, so the last standard message can remain `user` indefinitely.
- Fix:
  1. observe privacy-safe Work UI activity metadata (`aria-busy`, loading/progress surfaces, main text character count and element count);
  2. while startup handoff is pending, `USER_PENDING` remains WAIT if Work is busy or the safe UI signature is changing;
  3. if the safe UI signature is unchanged for 20 seconds, treat the surface as idle and execute exactly one `HANDOFF_RECONCILE`;
  4. normal post-send duplicate protection remains armed after that handoff message.
- Privacy boundary: no message body or Work activity text is logged; only counts/roles/busy flags participate in the local decision.
- Runtime: `2026-09-18.8`.
- Status: FIXED IN CODE — pending field verification.


## BUG-SUP-013 — Work UI can deadlock again after HANDOFF_RECONCILE is sent

- Date: 2026-09-18
- Component: loop rearm / ChatGPT Work completion
- Field evidence: runtime v8 successfully emitted exactly one `HANDOFF_IDLE_CONFIRMED` and `HANDOFF_RECONCILED`, but the next live runtime status returned to `UI=USER_PENDING / OBS=USER_PENDING`.
- Root cause: v8 solved only the first startup handoff. After the Supervisor sends HANDOFF_RECONCILE, the loop disarms until observable assistant progress; Work can again render that progress outside standard assistant-message containers, so the loop cannot rearm from standard message counts alone.
- Fix:
  1. track privacy-safe Work activity while USER_PENDING;
  2. require actual busy/running or structural change as post-send progress evidence;
  3. after progress, require a 20-second stable idle window before treating Work as complete;
  4. feed the synthetic effective `RESPONSE_COMPLETE` through the existing rearm gate;
  5. stable USER_PENDING with no post-send progress evidence remains WAIT, preventing duplicate sends.
- Runtime: `2026-09-18.9`.
- Status: FIXED IN CODE — pending field verification.


## BUG-SUP-014 — WAIT_USER becomes a permanent dead-end after Owner has decided

- Date: 2026-09-18
- Component: runtime project-state gate / Owner handoff
- Field symptom: Control Panel shows `WAIT_USER • CẦN OWNER`. Owner resolves the requested business rule directly with ChatGPT, then presses START ROBOT, but the Supervisor never inspects the live conversation and continues to report `WAIT_USER`.
- Root cause: `supervisor-loop-cli.mjs` short-circuited before connecting to ChatGPT whenever repository state was `WAIT_USER` / `requires_user=true`. Therefore the robot had no path to observe that the human decision had already occurred and no path to ask ChatGPT to reconcile it back into source-of-truth.
- Fix:
  1. `BLOCKED` remains a hard stop;
  2. `WAIT_USER` remains fail-closed for business execution but no longer skips live-chat observation;
  3. one constrained Owner-decision reconciliation may run after the chat is safely idle;
  4. the reconciliation instruction updates repository only for an explicit Owner decision matching the pending boundary; otherwise it must preserve `WAIT_USER`;
  5. after a reconciliation response settles, no duplicate reconcile is sent until a newer conversation turn appears;
  6. ChatGPT Work `data-testid=stop-button` is a semantic running signal;
  7. completion stability uses conversation-turn metadata and ignores noisy whole-DOM size churn.
- Runtime: `2026-09-18.10`.
- Status: FIXED IN CODE — pending CI + field deployment.


## BUG-SUP-015 — Owner needs an explicit recheck control after resolving a WAIT_USER boundary

- Date: 2026-09-18
- Component: Control Panel / Owner-boundary reconciliation
- Field symptom: Owner resolves the requested decision or setup with ChatGPT, but Control Panel can remain on `WAIT_USER` while repository/runtime synchronization catches up; repeated START does not provide an explicit handoff signal.
- Root cause:
  1. there was no explicit Owner intent signal for “I handled the requested boundary; verify again now”;
  2. after an Owner reconciliation had been sent, runtime could set `awaitingResponse=true` but then pass `ownerReconcile=false` on subsequent polls, causing `STOP_WAIT_USER` while ChatGPT was visibly still running.
- Fix:
  1. add `✓ ĐÃ XỬ LÝ — KIỂM TRA LẠI` in the Control Panel;
  2. write only a local non-secret `OWNER_RESOLVED.request.json` marker;
  3. marker arms one fail-closed reconciliation when `WAIT_USER` is active and not `BLOCKED`;
  4. keep owner reconciliation active while its ChatGPT response is running;
  5. consume marker only after the reconciliation message is actually sent;
  6. the button never writes `READY` itself and never bypasses security/secret/approval boundaries.
- Runtime: `2026-09-18.11`.
- Status: FIXED IN CODE — pending CI + field deployment.


## BUG-SUP-016 — Explicit Owner recheck can remain blocked by a stale assistant-progress latch

- Date: 2026-09-18
- Component: Owner recheck / continuation latch / diagnostics
- Field symptom: after Owner presses `ĐÃ XỬ LÝ — KIỂM TRA LẠI`, Control Panel shows `CONTINUE`, `UI=READY_IDLE`, `OBS=RESPONSE_COMPLETE`, but every step remains `executed=false | reason=awaiting observable assistant progress`. The local marker remains at `ĐÃ NHẬN — ĐANG KIỂM TRA`.
- Root cause: the explicit Owner recheck armed reconciliation but did not release the controller's previous continuation-progress latch. If the prior ChatGPT response completed without a detectable assistant-count/running transition, the controller stayed `armed=false` forever and could not send the newly authorized recheck.
- Fix:
  1. explicit Owner recheck may release only the stale progress latch for one Owner-reconciliation send;
  2. normal AUTO_CONTINUE cannot use this path;
  3. repository/business/security gates remain unchanged and fail-closed;
  4. add persistent privacy-safe diagnostics under the local `diagnostics` folder;
  5. capture repeated latch stalls as incident JSON after a bounded threshold;
  6. add Control Panel `MỞ LOG LỖI` and a diagnostic collector script.
- Runtime: `2026-09-18.12`.
- Status: FIXED IN CODE — pending CI + field deployment.


## BUG-SUP-017 — ChatGPT Work virtualization hides assistant-count progress after reconcile

- Date: 2026-09-18
- Component: continuation rearm / persistent diagnostics
- Evidence captured automatically by runtime v12:
  - project `TASK-035 / WAIT_USER`;
  - UI `READY_IDLE / RESPONSE_COMPLETE`;
  - `execution_reason=awaiting observable assistant progress`;
  - controller `armed=false`;
  - Owner reconcile `awaiting_response=true`;
  - visible assistant count changed from the send-time surface instead of monotonically increasing;
  - semantic conversation turn advanced from the prior surface to a later assistant turn.
- Root cause: ChatGPT Work virtualizes visible conversation DOM. `assistantMessageCount` is not monotonic and therefore cannot be the sole progress latch. A completed response can have fewer currently rendered assistant nodes than existed at send time.
- Fix:
  1. capture `maxConversationTurnOrdinal` when a Supervisor action is sent;
  2. on `RESPONSE_COMPLETE`, accept semantic progress when the turn ordinal advanced and the latest visible message role is `assistant`;
  3. retain assistant-count/running/Work-idle progress as additional signals;
  4. log `turn_ordinal_at_action` in privacy-safe diagnostics.
- Runtime: `2026-09-18.13`.
- Status: FIXED IN CODE — pending CI + field deployment.


## BUG-SUP-018 — Assistant response turn can retrigger Owner reconciliation

- Date: 2026-09-18
- Component: Owner reconciliation lifecycle
- Field evidence from v13 verification: one reconciliation response settled successfully, but the subsequent assistant turn advanced the conversation ordinal and was interpreted as a new trigger, causing another `OWNER_RECONCILE_SENT`.
- Root cause: the post-settlement re-arm condition compared only conversation-turn ordinal. Assistant responses also advance that ordinal.
- Fix:
  1. after a reconciliation settles, only a newer turn whose latest role is `user` may automatically re-arm Owner reconciliation;
  2. explicit `ĐÃ XỬ LÝ — KIỂM TRA LẠI` remains a manual override for one bounded recheck;
  3. assistant turns never trigger another Owner reconcile by themselves;
  4. Control Panel distinguishes `CẦN QUYẾT ĐỊNH` from `CẦN CẤU HÌNH` using canonical boundary metadata.
- Runtime: `2026-09-18.14`.
- Status: FIXED IN CODE — pending CI + field deployment.


## BUG-SUP-019 — Valid technical WAIT_USER was logged as a reconciliation stall

- Date: 2026-09-18
- Component: diagnostics / Control Panel boundary display
- Field evidence from v14: Owner reconciliation sent exactly once and settled; controller ended `armed=true`, `awaiting_response=false`, while canonical TASK-035 correctly remained `WAIT_USER` because Gmail OAuth activation secrets are still pending.
- Root causes:
  1. diagnostics classified every `WAIT_USER + RESPONSE_COMPLETE + STOP_WAIT_USER` as a stall, even after reconciliation had correctly settled;
  2. live `runtime-status.json` omitted nested owner/activation boundary metadata, so Control Panel could not reliably distinguish a business decision from technical configuration while the robot was online.
- Fix:
  1. preserve safe `owner_boundary_pending`, `activation_boundary_reason`, and `activation_boundary_pending` in runtime status;
  2. include the same safe key names in persistent diagnostics;
  3. only classify `WAIT_USER_RECONCILE_STALL` when a reconciliation is actually awaiting a response or a manual recheck marker is still pending;
  4. Control Panel uses flattened live boundary metadata to show `CẦN QUYẾT ĐỊNH` vs `CẦN CẤU HÌNH`.
- Runtime: `2026-09-18.15`.
- Status: FIXED IN CODE — pending CI + field deployment.
