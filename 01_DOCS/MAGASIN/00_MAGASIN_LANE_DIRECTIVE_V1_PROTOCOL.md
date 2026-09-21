# MAGASIN_LANE_DIRECTIVE_V1 — Canonical Brain → Robot Protocol

Status: **CANONICAL / REQUIRED FOR ALL MAGASIN BRAIN PROJECTS**

Purpose: define the exact machine-readable response a Brain must return so MAGASIN Supervisor can parse it and dispatch work to the lane's Work conversation.

This protocol is project-agnostic. Any MAGASIN Brain — Coffee, Content Money Engine, Cup, or a future project — must use this exact serialization when controlled by Supervisor Three-Lane.

## 1. Mandatory output rule

When the Robot asks a Brain for the next directive, the Brain must return **exactly one fenced code block** containing one valid directive block.

Recommended Brain response:

~~~text
<<<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"WORK","task_id":"TASK-ID","instruction":"Self-contained work instruction"}
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

The fenced code block is recommended because ChatGPT should render the marker characters literally. The Robot reads the rendered assistant text; the Markdown fence itself is not part of the directive payload.

Do not add explanatory prose before or after the directive when the Brain is operating under Robot control.

## 2. Exact markers

The start marker must be exactly:

~~~text
<<<MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

The end marker must be exactly:

~~~text
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

These are invalid and must never be emitted:

~~~text
<<\<MAGASIN_LANE_DIRECTIVE_V1>>>
<<\<END_MAGASIN_LANE_DIRECTIVE_V1>>>
"<<<MAGASIN_LANE_DIRECTIVE_V1>>>"
<<< MAGASIN_LANE_DIRECTIVE_V1 >>>
~~~

Do not insert a backslash before `<`. Do not add spaces inside the marker. Do not wrap the entire block in quotation marks.

## 3. WORK schema

Canonical WORK directive:

~~~text
<<<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"WORK","task_id":"MCME-011","instruction":"BẮT ĐẦU MCME-011. Thực hiện đúng một task. Trả evidence và dừng sau task này."}
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

Required fields:

- `action`: `"WORK"`
- `task_id`: non-empty task identifier accepted by the Supervisor parser
- `instruction`: non-empty, self-contained instruction for Work

Current `task_id` parser contract:

~~~text
^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$
~~~

Examples of valid IDs:

- `TASK-RBT-005/LONG-RUNNING-WORK-WATCHDOG-01`
- `MCME-011`
- `TASK-065`
- `CUP:STOCK.AUDIT-01`

## 4. IDLE schema

If there is no dependency-correct work to dispatch:

~~~text
<<<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"IDLE"}
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

Do not invent placeholder tasks merely to avoid IDLE.

## 4A. Optional previous-result verdict extension (RBT-008)

The protocol name and byte-exact markers remain **MAGASIN_LANE_DIRECTIVE_V1**. Old WORK/IDLE directives remain valid without any new field.

After the Robot has confirmed a Work-result relay, a Brain may add:

~~~json
"previous_result":{
  "task_id":"TASK-PREVIOUS",
  "relay_id":"32_HEX_CHARACTERS",
  "verdict":"ACCEPT",
  "reason_code":"DOD_MET"
}
~~~

Required fields when `previous_result` is present:

- `task_id`: the exact previous task;
- `relay_id`: the exact deterministic relay ID confirmed by the Robot;
- `verdict`: `ACCEPT` or `REJECT`.

Optional `reason_code` is enum-only:

- `DOD_MET`
- `EVIDENCE_VERIFIED`
- `CORRECTION_REQUIRED`
- `EVIDENCE_INCOMPLETE`
- `OWNER_INTERVENTION_REQUIRED`
- `DEPENDENCY_BLOCKED`

No free-form rationale, review prose, chain-of-thought, URL or private evidence belongs in this metadata.

### ACCEPT

ACCEPT records the semantic Brain decision separately from transport fact `RESULT_RELAY_CONFIRMED`.

Example ACCEPT + next task:

~~~text
<<<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"WORK","task_id":"TASK-NEXT","instruction":"One dependency-correct bounded task with DoD, evidence and stop boundary.","previous_result":{"task_id":"TASK-PREVIOUS","relay_id":"0123456789abcdef0123456789abcdef","verdict":"ACCEPT","reason_code":"DOD_MET"}}
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

ACCEPT + IDLE is also valid.

### REJECT

REJECT + WORK must be an explicitly correlated correction. Add:

~~~json
"correction_of":{
  "task_id":"TASK-PREVIOUS",
  "relay_id":"0123456789abcdef0123456789abcdef"
}
~~~

The `correction_of` values must exactly match `previous_result`. A REJECT directive may not jump to unrelated roadmap work.

If Owner intervention is required, Brain may return IDLE with REJECT and `OWNER_INTERVENTION_REQUIRED`.

Malformed known optional metadata fails closed. Unknown future top-level fields are ignored and never become a control surface.

## 4B. Brain planning contract

Brain owns:

**PLAN → DISPATCH → VERIFY → ACCEPT/REJECT → NEXT PLAN**

Before each WORK directive Brain should establish:

- one primary outcome;
- dependencies satisfied or explicitly blocked;
- bounded scope;
- explicit Definition of Done;
- explicit evidence expected from Work;
- explicit stop boundary;
- no self-start of the next task by Work.

Planning target is roughly <=20 minutes of active implementation when safely decomposable. If a task is expected to exceed 30 minutes and can be split safely, split it before dispatch. This is planning guidance, not a runtime timeout; RBT-005 watchdog remains activity-based and inherently long-running operations remain valid.

The Brain must not expose chain-of-thought/private reasoning. Only machine contract/output needed by the Robot is required.

## 5. JSON serialization rules

The content between the markers must be valid JSON.

Required:

- use double quotes around JSON keys and string values;
- escape an internal double quote as `\"`;
- encode a literal backslash as `\\`;
- if a newline is needed inside `instruction`, encode it as `\n`;
- keep the directive to one JSON object;
- prefer a single-line JSON object for reliability.

Never use invalid JSON escapes such as:

~~~text
\<
\'
\a
~~~

Example of an invalid instruction fragment:

~~~text
"safe_reference=\<public reference>"
~~~

Use this instead:

~~~text
"safe_reference=PUBLIC_OR_SANITIZED_REFERENCE_IF_ANY"
~~~

## 6. No Markdown transformation inside machine fields

Inside `instruction`, prefer plain text.

Do not use Markdown links:

~~~text
[https://www.pinterest.com/example/](https://www.pinterest.com/example/)
~~~

Use the raw URL:

~~~text
https://www.pinterest.com/example/
~~~

Avoid angle-bracket placeholders that may be transformed by Markdown rendering. Prefer uppercase symbolic placeholders:

~~~text
OWNER_EMAIL
PUBLIC_OR_SANITIZED_REFERENCE_IF_ANY
EXACT_COMMIT_SHA
~~~

Markdown emphasis, headings, tables, nested code fences, and blockquotes are unnecessary inside `instruction` and should be avoided in machine directives.

## 7. Brain responsibility

The Brain, not the Robot, owns directive serialization.

Before returning a WORK directive, Brain must verify:

1. exactly one start marker exists;
2. exactly one end marker exists;
3. neither marker contains a backslash;
4. JSON parses as one object;
5. `action` is WORK;
6. `task_id` matches the allowed format;
7. `instruction` is non-empty and self-contained;
8. raw URLs are used instead of Markdown links;
9. no invalid JSON escape exists;
10. Work is told where to stop and must not self-start the next task.

If any check fails, Brain must repair its own output before answering.

## 8. Recommended Brain system instruction

Every MAGASIN project Brain controlled by Supervisor should include this rule in its persistent architecture/prompt:

~~~text
ROBOT DIRECTIVE OUTPUT CONTRACT

When MAGASIN Supervisor requests the next directive, return exactly one fenced code block and no prose outside it.

The code block must contain exactly:

<<<MAGASIN_LANE_DIRECTIVE_V1>>>
VALID_JSON_OBJECT
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>

For work:
{"action":"WORK","task_id":"TASK-ID","instruction":"SELF-CONTAINED INSTRUCTION"}

For no work:
{"action":"IDLE"}

Hard rules:
- markers must be byte-exact;
- never emit <<\<MAGASIN... or any backslash before <;
- JSON must be valid;
- no Markdown links inside instruction; use raw URLs;
- no angle-bracket placeholders; use plain symbolic placeholders;
- task_id must match ^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$;
- exactly one directive per response;
- no explanation outside the fenced code block while Robot is polling the Brain.
~~~

## 9. Canonical MCME example

~~~text
<<<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"WORK","task_id":"MCME-011","instruction":"BẮT ĐẦU THỰC HIỆN MCME-011 trên repository magasincoffee/MAGASIN-CONTENT-MONEY-ENGINE. Đây là task DUY NHẤT được phép active. Pinterest property: https://www.pinterest.com/bachvantoi1994/ . Thu sanitized evidence theo task contract. Không lưu password, OTP/MFA, cookie, token, tax ID, identity document, bank/card data hoặc secret. safe_reference=PUBLIC_OR_SANITIZED_REFERENCE_IF_ANY. DỪNG sau MCME-011 và trả exact commit SHA cùng evidence."}
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

## 10. Invalid MCME example

Do not emit:

~~~text
<<\<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"WORK","task_id":"MCME-011","instruction":"Pinterest: [https://example.com](https://example.com/) ; safe_reference=\<public ref>"}
<<\<END_MAGASIN_LANE_DIRECTIVE_V1>>>
~~~

Why it fails:

- start/end markers are not exact because they contain `\`;
- `\<` is not a valid JSON escape;
- Markdown link rendering can change the text observed by the Robot.

## 11. Parser authority

Current Supervisor parser authority is:

`08_INTEGRATIONS/supervisor/src/runtime/three-lane.mjs::parseLaneDirective()`

The parser intentionally fails closed when the exact block is absent, JSON is invalid, action is unsupported, task ID is invalid, or the WORK instruction is empty.

Brain projects must conform to the protocol. They must not depend on the Robot guessing or rewriting malformed directives.

## 12. Owner usage

To configure another Brain project, tell that Brain:

> Read and permanently follow the canonical MAGASIN Supervisor directive protocol in `01_DOCS/MAGASIN/00_MAGASIN_LANE_DIRECTIVE_V1_PROTOCOL.md`. When the Robot polls you, output only a valid directive according to that file.

The protocol defines serialization plus the optional RBT-008 verdict/correction contract. Project-specific planning, dependency checks, DoD, safety rules, and Work instructions remain the responsibility of each project's Brain architecture.
