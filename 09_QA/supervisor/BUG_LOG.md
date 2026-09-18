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
