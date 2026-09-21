# MAGASIN Supervisor — ChatGPT-Native Robot Research Architecture

Status: **LOCKED RESEARCH DIRECTION / POST-RBT-009 DESIGN INPUT**

Owner decision: MAGASIN Supervisor is not a generic browser bot. It is a Robot designed specifically around ChatGPT. Future architecture changes must therefore start from ChatGPT product semantics, supported surfaces, usage constraints, memory/project behavior, model behavior, and OpenAI policy/terms rather than generic DOM automation assumptions.

This document records the research direction. It is architecture-only and must not modify the active RBT-009 soaked candidate.

## 1. Core principle

The Supervisor should model **ChatGPT as the execution environment**, not as an arbitrary website.

The Robot must understand product-level concepts:

- conversation identity;
- Brain versus Work role;
- ChatGPT Project scope;
- project-only memory versus default memory;
- model/reasoning mode;
- response-running versus completed;
- tool/permission prompts;
- rate/usage-limit states;
- authentication/MFA/security boundaries;
- conversation availability/missing state;
- user-visible stop/retry/continue states;
- product updates and UI drift.

Generic selectors are implementation details and must never become the source of truth.

## 2. Critical compliance constraint

Current OpenAI consumer Terms of Use prohibit:

- automatically or programmatically extracting data or Output;
- circumventing rate limits or restrictions;
- bypassing protective measures or safety mitigations.

Therefore, before expanding the current browser automation model, MAGASIN must complete a **ChatGPT Automation Compliance Decision**.

The project must not intentionally design mechanisms whose purpose is:

- bulk/programmatic output scraping from ChatGPT consumer UI;
- bypassing ChatGPT usage limits;
- rotating models/chats/accounts to evade limits;
- bypassing CAPTCHA/MFA/login/security checks;
- using undocumented internal endpoints to avoid supported product behavior.

If full machine-to-machine extraction/relay is required, the supported long-term path should be evaluated against OpenAI developer/API products rather than assuming consumer ChatGPT UI scraping is a stable or permitted automation interface.

This is a release-architecture question, not a selector implementation detail.

## 3. ChatGPT Projects as lane isolation primitive

Official ChatGPT Projects can contain chats, files, instructions, and shared project context.

Project-only memory provides a useful isolation model:

- chats may reference other chats inside the same project;
- chats cannot reference chats outside that project;
- outside chats cannot reference chats inside it;
- saved personal memories are not referenced inside the project-only boundary.

Research target for MAGASIN:

```text
Lane 1 -> ChatGPT Project 1 -> Brain 1 + Work 1
Lane 2 -> ChatGPT Project 2 -> Brain 2 + Work 2
Lane 3 -> ChatGPT Project 3 -> Brain 3 + Work 3
```

with **project-only memory** where product availability and Owner intent allow it.

Benefits:

- reduced cross-lane context contamination;
- Brain and Work in the same lane may share lane-level project context;
- lane files/instructions can be scoped to one project;
- conversations can be moved into a project when eligible.

Important product constraint: ChatGPT Work is currently unavailable inside project-only Projects. Therefore Project isolation and ChatGPT Work mode must not be combined silently. A future design must choose deliberately.

## 4. Persistent chats, not Temporary Chat, for Brain/Work

Brain/Work targets require durable conversation identity and reopening.

Temporary Chat is therefore not the default execution target because:

- unsaved temporary chats do not remain in normal chat history;
- they are not intended as durable long-running lane state;
- memory behavior differs from normal persistent chats.

Brain/Work should remain regular persistent conversations unless a separately designed ephemeral task workflow is approved.

## 5. Model and reasoning awareness

ChatGPT model controls are product-level and may change over time.

The Robot should not hard-code a single model label as a permanent assumption.

Use capability classes instead:

```text
FAST
REASONING_MEDIUM
REASONING_HIGH
PRO
UNKNOWN
```

The Control Panel may map current user-visible model/reasoning controls into those classes.

Rules:

- never switch models merely to bypass a usage cap;
- never assume a requested model remained active without visible confirmation;
- if ChatGPT reports a limit/fallback, record the product-visible state and pause/fail closed according to Owner policy;
- model fallback must not silently change task semantics when Brain explicitly required a reasoning class.

## 6. Usage-limit-aware scheduling

ChatGPT usage limits depend on plan, model, and workspace configuration and may change.

The Scheduler must treat a displayed usage/rate-limit state as an external resource constraint.

Required semantics:

```text
AVAILABLE
LIMIT_NEAR_OR_WARNING
LIMIT_REACHED
RESET_KNOWN
UNKNOWN
```

When a limit is reached:

- do not resend the same task repeatedly;
- do not create extra chats/accounts to evade the limit;
- do not rotate models solely to circumvent the restriction;
- preserve exact-once state;
- surface WAIT_CHATGPT_LIMIT;
- resume only when product-visible availability returns or Owner chooses an allowed alternative.

## 7. Multi-chat concurrency research

MAGASIN uses six logical conversations:

```text
3 lanes x (1 Brain + 1 Work) = 6 logical chats
```

Future testing should determine the safe ChatGPT-specific concurrency envelope instead of assuming browser-tab count equals model concurrency.

Research separately:

- number of simultaneous responses ChatGPT reliably sustains on the Owner plan;
- whether starting Work 1, Work 2, Work 3 in rapid sequence yields true concurrent generation;
- how product usage limits behave under concurrent generations;
- whether one conversation becoming busy affects another;
- whether visible model/limit fallback differs across concurrent chats;
- memory/CPU effect of 1 versus 2 resident pages while three logical Work responses are active.

Do not deliberately stress or bypass service safeguards. Use normal Owner-authorized product behavior only.

## 8. ChatGPT-specific state machine

Target high-level conversation state:

```text
UNKNOWN
READY
COMPOSER_HAS_DRAFT
SUBMITTING
RESPONSE_RUNNING
RESPONSE_COMPLETE
INTERRUPTED
RETRY_AVAILABLE
CONTINUE_AVAILABLE
LIMIT_BLOCKED
AUTH_BLOCKED
PERMISSION_REQUIRED
CONVERSATION_MISSING
CONVERSATION_FULL_OR_CAPACITY
SECURITY_BLOCKED
```

Each transition must come from multiple user-visible signals where ambiguity exists.

Do not collapse unrelated states:

- LIMIT_BLOCKED != WORK_FULL;
- AUTH_BLOCKED != CONVERSATION_MISSING;
- RESPONSE_RUNNING != STALLED;
- RETRY_AVAILABLE != safe automatic retry;
- permission prompt != failure;
- product outage/network retry != target missing.

## 9. Semantic signals over brittle DOM details

Implementation should prioritize:

1. user-visible text/state;
2. accessibility roles/names;
3. stable product-visible controls;
4. URL conversation identity where allowed;
5. bounded multi-signal classification.

Avoid relying on:

- CSS class hashes;
- React internal properties;
- undocumented internal network APIs;
- hidden implementation attributes;
- brittle nth-child selectors.

A ChatGPT UI revision should degrade to UNKNOWN/fail-closed rather than mutate the wrong conversation.

## 10. Prompt/response contract optimized for ChatGPT

Brain prompts should be short, explicit, and structured.

The existing planning contract remains useful:

```text
PLAN
-> one primary outcome
-> dependency
-> bounded scope
-> DoD
-> evidence
-> STOP
```

Work prompts should avoid asking ChatGPT to autonomously continue the roadmap.

Chat-specific improvements to research:

- stable machine-readable completion footer;
- concise evidence references rather than repeating entire history;
- task context supplied from canonical repository/file sources instead of ever-growing chat history;
- new Work chat when context degradation is observed, but only through explicit safe rollover;
- Brain remains strategic context; Work remains execution context.

## 11. Long-conversation control

A conversation is not a database.

MAGASIN should progressively move canonical truth to GitHub/local state rather than relying on an indefinitely growing chat.

Research metrics:

- conversation age;
- number of turns;
- approximate task/result history depth;
- frequency of instruction drift;
- repeated context reconstruction;
- latency growth;
- capacity/full signals.

When rollover is needed:

- preserve canonical task/result state externally;
- create a fresh Work conversation only through the existing exact-once rollover contract;
- never auto-replace Brain without Owner authority.

## 12. Project instructions and lane instructions

If ChatGPT Projects are adopted, lane-level instructions should contain only stable role constraints:

- project/lane identity;
- Brain or Work role;
- machine directive/result protocol;
- stop conditions;
- canonical repository/source-of-truth location;
- privacy/safety constraints.

Do not duplicate fast-changing task state in Project instructions. Dynamic task state remains in the Supervisor registry and explicit messages.

## 13. Tool and permission prompts

ChatGPT may expose tools, plugins, browsing, files, permissions, and product-specific confirmations.

Robot policy:

- detect permission-required states separately;
- do not approve new permissions by default;
- do not upload or expose secrets automatically;
- do not dismiss security warnings to continue automation;
- require Owner action for authentication, MFA, CAPTCHA, security, new sensitive permission, or ambiguous account state.

## 14. Product update resilience

ChatGPT is a continuously updated product.

Add a ChatGPT compatibility layer with a versioned classifier contract:

```text
CHATGPT_COMPAT_PROFILE_V1
```

The compatibility profile defines supported visible states and actions, not DOM internals.

When product behavior changes:

1. detect UNKNOWN or contract mismatch;
2. stop mutations for affected lane;
3. preserve task/latch state;
4. capture privacy-safe diagnostics;
5. update compatibility fixtures;
6. run synthetic acceptance before resuming production.

## 15. First-party ChatGPT automation research

OpenAI now provides first-party browser/agentic capabilities in ChatGPT desktop/Work, including multi-tab browser tasks and cloud-browser workflows on supported plans.

MAGASIN should research whether any first-party capability can replace custom brittle browser control for selected operations.

Decision criteria:

- does it preserve Owner-selected Brain/Work conversation semantics?
- can it run background work safely?
- can it expose deterministic task/result state?
- does it support lane isolation?
- does it preserve exact-once requirements?
- does it reduce local Chrome/RAM pressure?
- does it remain within supported product terms?

Do not replace the current Supervisor merely because a feature exists; require a measurable reliability advantage.

## 16. API/hybrid architecture research

Because fully automated programmatic extraction from consumer ChatGPT UI is constrained by current Terms, evaluate a hybrid architecture:

```text
ChatGPT
= Owner/Brain interaction, planning, review, control

Supported OpenAI developer/API surface
= machine-to-machine task execution/state transport where appropriate

MAGASIN Supervisor
= scheduling, exact-once state, GitHub evidence, resource/lifecycle control
```

This research must compare:

- product semantics;
- memory/context differences;
- cost;
- latency;
- usage limits;
- reliability;
- privacy;
- migration effort;
- Owner UX.

No API migration is approved by this document. It is a required architectural comparison.

## 17. Research backlog

After RBT-009 release closure, perform the following before major new ChatGPT automation features:

### CHATGPT-R01 — Product & Terms Compatibility Audit

Map every current Robot action to:
- supported product behavior;
- documented constraint;
- policy/terms risk;
- keep / redesign / remove.

### CHATGPT-R02 — Project Isolation Experiment

Test one Project per lane with project-only memory using non-production test chats.

### CHATGPT-R03 — Concurrency & Limit Characterization

Measure normal, non-evasive 1/2/3 concurrent Work responses and document product behavior.

### CHATGPT-R04 — Conversation State Classifier V2

Build a semantic state matrix from user-visible ChatGPT states and fail-closed unknown handling.

### CHATGPT-R05 — Long-Conversation/Rollover Study

Measure latency, drift, and capacity behavior across long-lived Work chats.

### CHATGPT-R06 — First-Party Work/Desktop/Cloud Browser Comparison

Evaluate supported ChatGPT-native agentic features against custom Chrome/CDP control.

### CHATGPT-R07 — API/Hybrid Decision

Produce a decision record for which operations may remain UI-based and which should move to supported developer surfaces.

## 18. Definition of Done for ChatGPT-native redesign

The Robot is considered ChatGPT-native only when:

- lane isolation matches ChatGPT memory/project semantics;
- usage-limit behavior is explicit and non-evasive;
- model/reasoning behavior is observed rather than assumed;
- conversation states are semantic and fail closed;
- long-chat rollover is controlled;
- UI changes cannot cause destructive wrong-target actions;
- resource guard reflects real ChatGPT browser behavior;
- policy/terms compatibility is documented for every automated action;
- no feature depends on bypassing safeguards or undocumented internal endpoints;
- Owner remains authoritative for Brain identity and sensitive permissions.

## 19. Locked research statement

MAGASIN Supervisor will be optimized for **ChatGPT as a product**, not merely for Chrome as a browser.

Future development must combine:

**ChatGPT product semantics + lane isolation + exact-once state + lightweight browser scheduling + resource protection + explicit usage-limit handling + compliance-aware supported automation.**
