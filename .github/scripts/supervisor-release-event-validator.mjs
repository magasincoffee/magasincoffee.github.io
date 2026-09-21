import fs from "node:fs";
import readline from "node:readline";
import { pathToFileURL } from "node:url";

const ALLOWED_KEYS = new Set([
  "schema_version","timestamp","lane_id","actor","event_type","task_id","phase",
  "reason_code","work_generation","work_url_revision","elapsed_ms","queue_time_ms",
  "execution_time_ms","dispatch_id","relay_id","target_role","target_digest","target_revision"
]);

const FORBIDDEN_VALUE = /https?:\/\/|chatgpt\.com|brain_url|work_url|cookie|token|authorization|message_body|screenshot|browser_profile|\\Users\\|\/home\//i;
const CONFIRMED_DISPATCH = "WORK_DISPATCH_CONFIRMED";
const CONFIRMED_RELAY = "RESULT_RELAY_CONFIRMED";

function finiteTimestamp(value, label) {
  const ms = Date.parse(String(value || ""));
  if (!Number.isFinite(ms)) throw new Error(`${label} has invalid timestamp`);
  return ms;
}

function logicalKey(event) {
  return [event.lane_id || "GLOBAL", event.task_id || "NO_TASK", Number(event.work_generation || 0)].join("|");
}

function assertPrivacy(event, lineNumber) {
  for (const key of Object.keys(event)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`line ${lineNumber}: forbidden event key ${key}`);
  }
  for (const value of Object.values(event)) {
    if (typeof value === "string" && FORBIDDEN_VALUE.test(value)) {
      throw new Error(`line ${lineNumber}: private or URL-like event value rejected`);
    }
  }
}

export async function validateEventFile(filePath, { since = null, maxFloodPerFiveMinutes = 20 } = {}) {
  const sinceMs = since ? finiteTimestamp(since, "since") : null;
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const input = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const groups = new Map();
  const dispatches = new Map();
  const relays = new Map();
  const floodBuckets = new Map();
  const counts = new Map();
  let lineNumber = 0;
  let totalEvents = 0;
  let inWindowEvents = 0;
  let legacyPrefixCount = 0;

  const stateFor = (event) => {
    const key = logicalKey(event);
    if (!groups.has(key)) groups.set(key, { assignedAt: null, dispatchAt: null, completedAt: null, rolloverTargetAt: null });
    return groups.get(key);
  };

  for await (const rawLine of input) {
    lineNumber += 1;
    const line = rawLine.trim();
    if (!line) continue;
    let event;
    try { event = JSON.parse(line); } catch { throw new Error(`line ${lineNumber}: invalid JSON`); }
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error(`line ${lineNumber}: event must be an object`);
    assertPrivacy(event, lineNumber);
    const at = finiteTimestamp(event.timestamp, `line ${lineNumber}`);
    const type = String(event.event_type || "");
    if (!type) throw new Error(`line ${lineNumber}: missing event_type`);
    totalEvents += 1;
    counts.set(type, Number(counts.get(type) || 0) + 1);
    if (sinceMs === null || at >= sinceMs) inWindowEvents += 1;

    if ((sinceMs === null || at >= sinceMs) && (type === "ERROR" || type === "RECOVERY")) {
      const bucketStart = Math.floor(at / 300000);
      const bucketKey = [bucketStart, event.lane_id || "GLOBAL", type, event.reason_code || "NONE"].join("|");
      const next = Number(floodBuckets.get(bucketKey) || 0) + 1;
      floodBuckets.set(bucketKey, next);
      if (next > maxFloodPerFiveMinutes) throw new Error(`line ${lineNumber}: repeated ${type}/RECOVERY flood detected`);
    }

    const state = stateFor(event);
    if (type === "BRAIN_TASK_ASSIGNED") state.assignedAt = state.assignedAt ?? at;

    if (type === CONFIRMED_DISPATCH) {
      const id = String(event.dispatch_id || "");
      if (!id) throw new Error(`line ${lineNumber}: confirmed dispatch missing dispatch_id`);
      if (dispatches.has(id)) throw new Error(`line ${lineNumber}: duplicate confirmed dispatch_id`);
      if (state.assignedAt === null) {
        if (sinceMs !== null && at >= sinceMs) throw new Error(`line ${lineNumber}: confirmed dispatch missing assignment in durable history`);
        legacyPrefixCount += 1;
      } else if (state.assignedAt > at) throw new Error(`line ${lineNumber}: confirmed dispatch precedes assignment`);
      dispatches.set(id, { at, lane_id: event.lane_id || null, task_id: event.task_id || null });
      state.dispatchAt = at;
    }

    if (type === "WORK_STARTED" || type === "WORK_ACTIVITY") {
      if (state.dispatchAt === null) {
        if (sinceMs !== null && at >= sinceMs) throw new Error(`line ${lineNumber}: work activity missing confirmed dispatch in durable history`);
        legacyPrefixCount += 1;
      } else if (state.dispatchAt > at) throw new Error(`line ${lineNumber}: work activity precedes confirmed dispatch`);
    }

    if (type === "WORK_COMPLETED") {
      if (state.dispatchAt === null) {
        if (sinceMs !== null && at >= sinceMs) throw new Error(`line ${lineNumber}: work completion missing confirmed dispatch in durable history`);
        legacyPrefixCount += 1;
      } else if (state.dispatchAt > at) throw new Error(`line ${lineNumber}: work completion precedes confirmed dispatch`);
      state.completedAt = at;
    }

    if (type === CONFIRMED_RELAY) {
      const id = String(event.relay_id || "");
      if (!id) throw new Error(`line ${lineNumber}: confirmed relay missing relay_id`);
      if (relays.has(id)) throw new Error(`line ${lineNumber}: duplicate confirmed relay_id`);
      if (state.completedAt === null) {
        if (sinceMs !== null && at >= sinceMs) throw new Error(`line ${lineNumber}: relay confirmation missing work completion in durable history`);
        legacyPrefixCount += 1;
      } else if (state.completedAt > at) throw new Error(`line ${lineNumber}: relay confirmation precedes work completion`);
      relays.set(id, { at, lane_id: event.lane_id || null, task_id: event.task_id || null });
    }

    if (type === "BRAIN_RESULT_ACCEPTED" || type === "BRAIN_RESULT_REJECTED") {
      const id = String(event.relay_id || "");
      const relay = relays.get(id);
      if (!id) throw new Error(`line ${lineNumber}: semantic Brain verdict missing relay_id`);
      if (!relay) {
        if (sinceMs !== null && at >= sinceMs) throw new Error(`line ${lineNumber}: semantic Brain verdict missing matching relay in durable history`);
        legacyPrefixCount += 1;
      } else if (relay.at > at) throw new Error(`line ${lineNumber}: semantic Brain verdict precedes matching relay`);
      if (relay && (relay.lane_id !== (event.lane_id || null) || relay.task_id !== (event.task_id || null))) {
        throw new Error(`line ${lineNumber}: Brain verdict relay correlation mismatch`);
      }
    }

    if (type === "WORK_ROLLOVER_TARGET_PERSISTED") state.rolloverTargetAt = at;
    if (type === "WORK_ROLLOVER_DISPATCH_CONFIRMED") {
      if (state.rolloverTargetAt === null) {
        if (sinceMs !== null && at >= sinceMs) throw new Error(`line ${lineNumber}: rollover dispatch confirmation missing target persistence in durable history`);
        legacyPrefixCount += 1;
      } else if (state.rolloverTargetAt > at) {
        throw new Error(`line ${lineNumber}: rollover dispatch confirmation precedes target persistence`);
      }
    }
  }

  return {
    schema_version: "supervisor-release-event-validation.v1",
    total_events: totalEvents,
    in_window_events: inWindowEvents,
    confirmed_dispatch_count: dispatches.size,
    confirmed_relay_count: relays.size,
    duplicate_dispatch_count: 0,
    duplicate_relay_count: 0,
    privacy_safe: true,
    transition_order_valid: true,
    flood_safe: true,
    legacy_prefix_count: legacyPrefixCount,
    event_type_counts: Object.fromEntries([...counts.entries()].sort(([a],[b]) => a.localeCompare(b)))
  };
}

function parseArgs(argv) {
  const out = { file: null, since: null, summary: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--file") out.file = argv[++i];
    else if (argv[i] === "--since") out.since = argv[++i];
    else if (argv[i] === "--summary") out.summary = argv[++i];
  }
  if (!out.file) throw new Error("--file is required");
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const summary = await validateEventFile(args.file, { since: args.since });
    if (args.summary) fs.writeFileSync(args.summary, JSON.stringify(summary, null, 2) + "\n", "utf8");
    console.log(`EVENT_VALIDATOR_TOTAL=${summary.total_events}`);
    console.log(`EVENT_VALIDATOR_DISPATCH_CONFIRMED=${summary.confirmed_dispatch_count}`);
    console.log(`EVENT_VALIDATOR_RELAY_CONFIRMED=${summary.confirmed_relay_count}`);
    console.log("EVENT_VALIDATOR_NO_DUPLICATE_DISPATCH=True");
    console.log("EVENT_VALIDATOR_NO_DUPLICATE_RELAY=True");
    console.log("EVENT_VALIDATOR_ORDER_VALID=True");
    console.log("EVENT_VALIDATOR_PRIVACY_SAFE=True");
    console.log("EVENT_VALIDATOR_FLOOD_SAFE=True");
  } catch (error) {
    console.error(`EVENT_VALIDATOR_FAIL=${String(error?.message || error)}`);
    process.exitCode = 1;
  }
}
