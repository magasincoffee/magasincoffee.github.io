# MAGASIN Supervisor — Three-Lane Architecture V1

Date: 2026-09-19  
Status: OWNER APPROVED / ACTIVE IMPLEMENTATION  
Task: TASK-049

## Why this replaces BRAIN_WORKER_V1

The previous runtime attempted to rediscover which ChatGPT conversation was the Brain. Multiple valid historical Brain conversations made that ambiguous and repeatedly stopped automation.

The Owner has replaced that topology with three explicit, isolated work lanes. The Robot must never infer a Brain conversation again.

## Topology

Each lane represents one project:

Owner-selected Brain URL
→ Brain instruction
→ Owner-selected or Robot-managed Work conversation
→ completed Work assistant response
→ screenshot + full text relay
→ same lane Brain
→ next Brain instruction

There are exactly three lanes:

- lane-1
- lane-2
- lane-3

Each lane is independent and has its own project name, Brain URL, Work URL, status, message, START and STOP controls.

## Owner-facing contract

For each lane the Control Panel shows:

1. Project name — editable and local only.
2. Brain URL — editable by Owner. This is the only source of Brain identity.
3. Work URL — editable by Owner while the lane is stopped; optional. If blank, Robot creates and maintains it automatically.
4. Lane status.
5. Lane message / error.
6. START LANE.
7. STOP LANE.
8. Open Brain.
9. Open Work.

The Owner does not need to paste a Work URL, but may explicitly create a Work conversation and paste its URL while the lane is stopped.

## Non-negotiable invariants

1. **No Brain auto-discovery.** Brain target comes only from the lane Brain URL entered by Owner.
2. **Lane isolation.** A lane may never read, send to, or update another lane's Brain or Work target.
3. **Independent start/stop.** Stopping one lane does not stop the other lanes.
4. **At most one active Work conversation per lane.**
5. **Work target may come from Owner or Robot.** Owner may set/replace Work URL only while the lane is stopped. If Work URL is blank, Robot may create it automatically only for an enabled lane with a valid Owner Brain URL and a valid Brain work directive.
6. **Automatic Work rollover requires positive conversationFull evidence.** Missing, stale, unavailable or mismatched Work targets do not authorize automatic replacement. A different Work URL explicitly entered by Owner while the lane is stopped is a separate Owner override, not an automatic rollover.
7. **Brain rollover is not automatic.** If the Owner Brain URL itself is full/missing/unavailable, that lane waits for Owner to enter a replacement Brain URL.
8. **Result relay is exact-once.** Each completed Work result is relayed once to the Brain of the same lane.
9. **Relay evidence includes both:**
   - screenshot of the final completed Work assistant turn;
   - full captured text of that assistant turn.
10. Screenshot files are transient local artifacts and are deleted after a confirmed relay attempt; they are never committed to Git.
11. Message bodies, screenshots, cookies, profiles and private data are never persisted in Git.
12. Auth/MFA/CAPTCHA, destructive actions, admin escalation and ambiguous security decisions remain fail-closed.

## Brain directive contract

The Brain of a lane returns one machine-readable block:

<<<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"WORK","task_id":"TASK-ID","instruction":"Self-contained work instruction"}
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>

No work available:

<<<MAGASIN_LANE_DIRECTIVE_V1>>>
{"action":"IDLE"}
<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>

The directive belongs only to the lane whose Brain URL produced it.

## Work access and Owner reset

- A manually entered Work URL must be accessible to the account/session inside the dedicated Robot Chrome profile.
- If ChatGPT reports that the conversation is not accessible, the lane waits for Owner instead of silently replacing the explicit target.
- Control Panel exposes **TỰ TẠO WORK** while the lane is stopped. This clears the explicit Work target and returns the lane to Robot auto-create mode.
- Access-denied errors must be shown in plain Vietnamese; the generic exact-restore error is not acceptable for this case.

## Work lifecycle

1. Lane is enabled.
2. Robot opens the exact Owner-supplied Brain URL.
3. Robot reconciles the latest Brain directive.
4. If action=WORK, Robot uses the current Owner-supplied Work URL when one was explicitly configured; otherwise, if there is no Work conversation, Robot creates one and stores its URL locally.
5. Robot sends the instruction once.
6. Robot waits for a completed Work assistant turn.
7. Robot captures:
   - full text;
   - screenshot of the final assistant turn.
8. Robot sends both to the exact lane Brain.
9. Robot marks the result relayed and waits for the next Brain directive.
10. The same Work conversation is reused until ChatGPT explicitly reports conversationFull.
11. Only positive conversationFull evidence may trigger automatic replacement. Owner may also stop the lane, paste a different Work URL, and restart the lane as an explicit override.

## Local state

Local-only files under:

%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor

- lanes.json — Owner configuration, including optional Owner Work URL and its revision.
- lane-status.json — privacy-safe current status for the Control Panel.
- lane-evidence\ — transient screenshots; deleted after relay.
- supervisor.log — metadata/errors only, no full message bodies.

## Status model

Per lane:

- STOPPED
- NEED_BRAIN_URL
- STARTING
- WAITING_BRAIN
- WORKING
- RELAYING_RESULT
- READY
- RECOVERING
- WAIT_OWNER
- ERROR

The Control Panel must never show WORKING without evidence that the lane is enabled, a Work target exists, and a Work instruction is awaiting a result.

## Five-Step application

QUESTION — remove the need for the Robot to infer Brain identity.  
DELETE — delete Brain auto-discovery/rebind logic from the active runtime.  
SIMPLIFY — exactly three fixed lanes with Owner-bound Brain URLs and optional Owner-bound Work URLs.  
ACCELERATE — reuse one Work chat per lane until explicit full evidence.  
AUTOMATE — auto-create Work chat when blank, auto-roll it only on positive full evidence, recover transient network/CDP failures, and auto-relay screenshot + full result to Brain.

## Acceptance

THREE_LANE_V1 is accepted only when:

- all three lane cards render and persist independently;
- Owner can enter three distinct Brain URLs;
- each lane starts/stops independently;
- no Brain auto-discovery code runs in active mode;
- Owner may paste a Work URL while stopped, or leave it blank for Robot auto-create;
- Work result screenshot + full text reaches the correct Brain exactly once;
- automatic Work rollover occurs only on positive conversationFull evidence; explicit Owner replacement while stopped is allowed;
- transient fetch/CDP/network failures enter RECOVERING and retry automatically instead of escalating to Owner;
- one lane failure does not stop another lane;
- auth/MFA/CAPTCHA/security boundaries remain fail-closed;
- self-hosted install and post-job survival both pass.
