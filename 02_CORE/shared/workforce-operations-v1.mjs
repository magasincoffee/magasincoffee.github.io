import { readFileSync } from "node:fs";

export const WORKFORCE_SCHEMA_VERSION = "workforce-operations-v1";
export const WORKFORCE_TIMEZONE = "Asia/Ho_Chi_Minh";

const contractUrl = new URL("../contracts/workforce-operations-v1.json", import.meta.url);
const CONTRACT = Object.freeze(JSON.parse(readFileSync(contractUrl, "utf8")));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function fail(code, detail = null) {
  return Object.freeze({ ok: false, code, detail });
}

function ok(detail = null) {
  return Object.freeze({ ok: true, code: "OK", detail });
}

function validDateKey(value) {
  if (!DATE_RE.test(value || "")) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function zonedDateKey(input) {
  if (typeof input === "string" && validDateKey(input)) return input;
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: WORKFORCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const key = parts.year + "-" + parts.month + "-" + parts.day;
  return validDateKey(key) ? key : null;
}

function addDays(dateKey, amount) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + amount);
  return dt.getUTCFullYear() + "-" + String(dt.getUTCMonth() + 1).padStart(2, "0") + "-" + String(dt.getUTCDate()).padStart(2, "0");
}

function isoWeekday(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

function normalize(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function machine(domain) {
  return CONTRACT.state_machines?.[normalize(domain)] || null;
}

export function getWorkforceContract() {
  return copy(CONTRACT);
}

export function workforceWeekIdentity(input) {
  const date = zonedDateKey(input);
  if (!date) return fail("INVALID_DATE");
  const weekday = isoWeekday(date);
  const currentWeekStart = addDays(date, -(weekday - 1));
  const nextWeekStart = addDays(currentWeekStart, 7);
  return Object.freeze({
    ok: true,
    code: "OK",
    timezone: WORKFORCE_TIMEZONE,
    date,
    iso_weekday: weekday,
    current_week_start: currentWeekStart,
    next_week_start: nextWeekStart,
    availability_registration_state: weekday === 7 ? "REGISTRATION_CLOSED" : "REGISTRATION_OPEN",
    availability_target_week_start: nextWeekStart,
    sunday_manager_target_week_start: weekday === 7 ? nextWeekStart : null
  });
}

export function validateCanonicalState(domain, state) {
  const m = machine(domain);
  if (!m) return fail("UNKNOWN_DOMAIN", normalize(domain) || null);
  const normalizedState = normalize(state);
  if (!m.states.includes(normalizedState)) return fail("UNKNOWN_STATE", normalizedState || null);
  return ok({ domain: normalize(domain), state: normalizedState });
}

export function validateTransition(domain, fromState, toState, actor) {
  const m = machine(domain);
  const d = normalize(domain);
  const from = normalize(fromState);
  const to = normalize(toState);
  const a = normalize(actor);
  if (!m) return fail("UNKNOWN_DOMAIN", d || null);
  if (!m.states.includes(from) || !m.states.includes(to)) return fail("UNKNOWN_STATE", { from, to });
  if (!a) return fail("UNKNOWN_ACTOR");
  const transition = m.transitions.find((x) => x.from === from && x.to === to);
  if (!transition) return fail("TRANSITION_NOT_ALLOWED", { domain: d, from, to });
  if (!transition.actors.includes(a)) return fail("ACTOR_NOT_AUTHORIZED", { actor: a, allowed: transition.actors });
  return ok({ domain: d, from, to, actor: a });
}

export function getCompatibilityMapping(domain) {
  const d = normalize(domain);
  if (!d) return [];
  return copy((CONTRACT.compatibility_rules || []).filter((row) => normalize(row.domain) === d));
}

export function getInvariant(id) {
  const key = typeof id === "string" ? id.trim().toUpperCase() : "";
  const row = (CONTRACT.invariants || []).find((item) => normalize(item.id) === key);
  return row ? copy(row) : null;
}

export function authorizeWorkforceAccess({
  actor_role,
  actor_employee_id = null,
  subject_employee_id = null,
  capability = null,
  subject_store_id = null,
  allowed_store_ids = [],
  explicit_permissions = []
} = {}) {
  const role = normalize(actor_role);
  const cap = normalize(capability);
  const actorId = actor_employee_id == null ? null : String(actor_employee_id);
  const subjectId = subject_employee_id == null ? null : String(subject_employee_id);
  const storeId = subject_store_id == null ? null : String(subject_store_id);
  const allowedStores = new Set(Array.isArray(allowed_store_ids) ? allowed_store_ids.map(String) : []);
  const permissions = new Set(Array.isArray(explicit_permissions) ? explicit_permissions.map(normalize) : []);

  if (!["EMPLOYEE", "MANAGER", "OWNER"].includes(role)) return fail("UNKNOWN_ACTOR");
  if (!cap) return fail("UNKNOWN_CAPABILITY");

  if (role === "OWNER") return ok({ scope: "ENTERPRISE" });

  if (role === "EMPLOYEE") {
    const selfCaps = new Set(["PROFILE_READ", "AVAILABILITY_READ_WRITE", "SCHEDULE_READ", "ATTENDANCE_SUBMIT", "PAYROLL_READ"]);
    if (!selfCaps.has(cap)) return fail("CAPABILITY_NOT_AUTHORIZED");
    if (!actorId || !subjectId || actorId !== subjectId) return fail("CROSS_USER_DENY");
    return ok({ scope: "SELF" });
  }

  const scopedCaps = new Set(["PROFILE_READ", "AVAILABILITY_READ", "SCHEDULE_READ_WRITE", "SCHEDULE_PUBLISH", "ATTENDANCE_REVIEW"]);
  if (cap === "PAYROLL_REVIEW" && !permissions.has("PAYROLL_REVIEW")) return fail("EXPLICIT_PERMISSION_REQUIRED");
  if (cap !== "PAYROLL_REVIEW" && !scopedCaps.has(cap)) return fail("CAPABILITY_NOT_AUTHORIZED");
  if (!storeId || !allowedStores.has(storeId)) return fail("STORE_SCOPE_DENY");
  return ok({ scope: "STORE", store_id: storeId });
}

export function canSubmitAttendanceForAssignment({ actor_employee_id, assignment_owner_id } = {}) {
  const actorId = actor_employee_id == null ? "" : String(actor_employee_id);
  const ownerId = assignment_owner_id == null ? "" : String(assignment_owner_id);
  if (!actorId || !ownerId) return fail("OWNER_ID_REQUIRED");
  return actorId === ownerId ? ok({ owner_id: ownerId }) : fail("NOT_CURRENT_ASSIGNMENT_OWNER");
}

export function validatePayrollSource({ source_type, confirmed_work_time_state } = {}) {
  const source = normalize(source_type);
  const state = normalize(confirmed_work_time_state);
  if (source !== "CONFIRMED_WORK_TIME") return fail("PAYROLL_SOURCE_NOT_CONFIRMED_WORK_TIME");
  if (!["CONFIRMED", "REVISED"].includes(state)) return fail("CONFIRMED_WORK_TIME_NOT_READY");
  return ok({ source_type: source, confirmed_work_time_state: state });
}

export function diagnosticForAttendancePolicy(policy = {}) {
  const hasDeviation = Number.isFinite(policy.deviation_minutes) && policy.deviation_minutes >= 0;
  const autoApproval = policy.auto_approval === true;
  if (!hasDeviation) {
    return Object.freeze({
      ok: false,
      code: "ATTENDANCE_REVIEW_POLICY_MISSING",
      route_to: "NEEDS_REVIEW",
      auto_approve: false
    });
  }
  return Object.freeze({
    ok: true,
    code: "OK",
    route_to: "POLICY_EVALUATION",
    auto_approve: autoApproval
  });
}

export function validateContractShape(contract = CONTRACT) {
  const errors = [];
  if (contract?.schema_version !== WORKFORCE_SCHEMA_VERSION) errors.push("SCHEMA_VERSION");
  if (contract?.timezone !== WORKFORCE_TIMEZONE) errors.push("TIMEZONE");
  if (contract?.week_semantics?.week_start !== "MONDAY") errors.push("WEEK_START");
  if (!Array.isArray(contract?.invariants) || contract.invariants.length === 0) errors.push("INVARIANTS");
  if (!Array.isArray(contract?.compatibility_rules) || contract.compatibility_rules.length === 0) errors.push("COMPATIBILITY_RULES");
  if (!Array.isArray(contract?.e2e_traceability) || contract.e2e_traceability.length !== 16) errors.push("E2E_TRACEABILITY");
  return errors.length ? fail("MALFORMED_CONTRACT", errors) : ok({ invariant_count: contract.invariants.length });
}
