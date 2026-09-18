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
- Status: FIXED — pending verification


## BUG-SUP-005 — STOP sentinel does not guarantee prompt kill-switch termination

- Date: 2026-09-18
- Component: Windows Supervisor launcher/kill switch
- Reproduction: install runtime, start Supervisor in dry-run mode, create the STOP sentinel and wait for the wrapper PID file to disappear.
- Observed: installer smoke run `35300984151` passed install/start but failed the STOP step because the wrapper PID file remained beyond the smoke grace period.
- Impact: a STOP request can be delayed while the runtime is blocked in browser/network work; this is not strong enough for the required local kill switch.
- Root cause: stop script only wrote a sentinel and relied on the cooperative loop to return to its next sentinel check.
- Fix: keep cooperative STOP first, then after a short grace period force-terminate the Supervisor process tree and remove the PID file. This applies only to the dedicated Supervisor process, not the GitHub runner.
- Status: FIXING


## BUG-SUP-006 — Installer cannot replace runtime while previous Supervisor process is alive

- Date: 2026-09-18
- Component: Windows Supervisor installer
- Reproduction: a previous persistent/dry-run Supervisor process survives Actions cleanup and still has the runtime directory open; installer attempts `Remove-Item -Recurse`.
- Observed: installer smoke run `35301290507` fails with "process cannot access ... runtime because it is being used by another process."
- Impact: upgrades/reinstalls cannot proceed deterministically.
- Root cause: installer assumed the runtime directory was idle and did not stop an already-running Supervisor before replacement.
- Fix: installer first reads the local Supervisor PID, force-stops only that dedicated process tree when present, removes stale PID/STOP files, then retries runtime replacement with a bounded loop.
- Status: FIXING
