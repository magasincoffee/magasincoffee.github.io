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
- Status: FIXING


## BUG-SUP-002 — Google rejects Playwright-launched Chrome during OAuth

- Date: 2026-09-18
- Component: Supervisor profile setup
- Reproduction: open ChatGPT from a Playwright `launchPersistentContext`, choose Google/email sign-in.
- Observed: Google displays "Không thể đăng nhập cho bạn" and indicates the browser/app may not be secure. Chrome also shows that it is controlled by automated test software.
- Impact: Owner cannot complete one-time ChatGPT authentication in the automation-launched browser.
- Root cause: authentication is being attempted inside a browser instance launched under browser-automation control.
- Corrective direction: use a real installed Chrome process launched normally with a dedicated local profile and remote-debugging endpoint; Supervisor attaches to that browser over CDP instead of launching the login browser itself.
- Safety boundary: the Owner enters credentials directly into the real browser. Supervisor does not request, capture, log, or store credentials, cookies, tokens, MFA, or message bodies.
- Status: FIXING


## BUG-SUP-003 — Authenticated conversation not captured when composer is not visible

- Date: 2026-09-18
- Component: Supervisor profile setup
- Reproduction: Owner is authenticated and opens a valid ChatGPT conversation URL, but the prompt composer is not currently rendered/visible in the captured viewport.
- Observed: setup remains waiting because target capture required both `conversationPath` and `composerReady`.
- Impact: successful authentication is not recognized promptly.
- Root cause: one-time target capture used a UI visibility condition that is unnecessary for identifying a valid authenticated conversation.
- Fix: capture the local conversation target when a ChatGPT conversation path is detected; runtime send eligibility remains separately gated by composer/state checks.
- Status: FIXED — pending local verification
