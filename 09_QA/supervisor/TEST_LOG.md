# Supervisor QA Test Log

## 2026-09-18 — Foundation state + continuation policy

- Branch: `feat/supervisor-foundation`
- Workflow: `Supervisor Tests`
- Run: `35296275522`
- Runner: GitHub-hosted Windows
- Result: **PASS**
- Project-state reader/validation: PASS
- Continuation decision engine: PASS
- Hard-stop auth/MFA/CAPTCHA/destructive/admin/ambiguous policy: PASS
- Transient retry budget: PASS
- Unknown UI state fail-closed behavior: PASS
- No browser/login/live ChatGPT/self-hosted side effect in this foundation workflow: PASS

Next gate: TASK-004 UI adapter local **non-destructive** smoke.

## 2026-09-18 — TASK-004 UI adapter offline gate

- Privacy-safe UI classifier: PASS on GitHub-hosted Windows.
- Adapter captures only control/error state and message counts; message bodies are not captured.
- Conversation path/identifier is not emitted to public logs.
- Read-only local workflow run `35296619840` created.
- Local job status: **QUEUED**.
- No local UI action has executed yet.
- Required next action: register/start a self-hosted Windows X64 runner for `magasincoffee/magasincoffee.github.io`.
- Smoke workflow is guarded to owner actor and performs no send/click/credential read.

## 2026-09-18 — Real Chrome authenticated setup

- Workflow: `Supervisor Profile Setup`
- Run: `35298993647`
- Runner: `MAGASIN-BUSINESS-PC`
- Result: **PASS**
- Real installed Chrome launched by Windows `Start-Process`: PASS.
- Supervisor attached through local CDP endpoint: PASS.
- Google/email authentication completed by Owner in real Chrome: PASS.
- Navigation/auth redirects handled without closing the browser: PASS.
- ChatGPT state transitioned to `READY_IDLE`: PASS.
- Conversation target stored **local-only**: PASS.
- No credential, cookie, token, message body, or conversation identifier uploaded to GitHub: PASS.
- Temporary read-only smoke run `35296619840`: PASS.

## 2026-09-18 — Bounded reconnect/retry policy

- Branch: `feat/supervisor-recovery`
- Workflow: `Supervisor Tests`
- Run: `35299877934`
- Result: **PASS**
- Retryable CDP/network failures: bounded retry PASS.
- Non-retryable programming/business errors: fail immediately PASS.
- Retry budget exhaustion: typed terminal failure PASS.
- Probe failure: session disconnects and next probe can reconnect PASS.
- Disconnect idempotency: PASS.
- No browser live action or ChatGPT message side effect in this task.


## 2026-09-18 — Supervisor action executor / persistence gates

- Unit/regression tests on `feat/supervisor-actions`: **PASS**.
- Installer + START/STOP smoke run `35301449363`: **PASS**.
- Synthetic real-browser action E2E run `35301582550`: **PASS**.
  - canonical CONTINUE action semantics: PASS in isolated synthetic DOM.
  - safe RETRY action semantics: PASS in isolated synthetic DOM.
  - no ChatGPT/external side effect during synthetic action E2E.
- Vietnamese timeout / `Thử lại` path: unit regression PASS.
- Live retry-only smoke run `35301796025`: **PASS**.
  - observed live state at verification: `READY_IDLE`.
  - no safe Retry control remained at verification time, so no click was executed.
  - boundary confirmed: retry-only smoke cannot send Continue or arbitrary text.
- Short-lived CDP CLIs terminate deterministically after logical detach: regression PASS.
- Runtime-upgrade lock handling: PASS via installer smoke.
- Deterministic STOP kill switch: PASS via installer smoke.
- Anti-duplicate continuation controller: PASS.
- Public Git boundary retained: credentials/cookies/tokens/browser profile/conversation target remain local only.

Final gate: install/start persistent Supervisor and verify it survives GitHub Actions job cleanup.


## 2026-09-18 — Persistent Supervisor V1 acceptance

- Unit/regression suite latest Supervisor runs: **PASS**.
- Synthetic real-Chrome action E2E run `35301582550`: **PASS**.
  - canonical Continue composer fill/send semantics: PASS on isolated synthetic DOM;
  - safe Retry semantic click: PASS;
  - external/ChatGPT side effect: none.
- Bounded live one-shot run `35301293965`: executor classified Continue but returned `NO_SAFE_ACTION`; **fail-closed PASS**, no message sent.
- Live safe-Retry smoke run `35301796025`: **PASS**; workflow is limited to recognized Retry controls and cannot send Continue/arbitrary text.
- Installer + START/STOP kill-switch smoke run `35301449363`: **PASS**.
  - local runtime install/upgrade: PASS;
  - dedicated process START: PASS;
  - deterministic STOP: PASS.
- Persistent install run `35301801896`: **PASS**.
  - install/start job: PASS;
  - second-job persistence check after Actions cleanup: PASS;
  - `PERSISTENT_SUPERVISOR_ALIVE=True`;
  - `DESKTOP_KILL_SWITCH_READY=True`;
  - local authenticated target present.
- Supervisor is installed live on `MAGASIN-BUSINESS-PC`; it reads canonical project state and pauses on Owner/security gates.
