import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  WORKFORCE_SCHEMA_VERSION,
  WORKFORCE_TIMEZONE,
  authorizeWorkforceAccess,
  canSubmitAttendanceForAssignment,
  diagnosticForAttendancePolicy,
  getCompatibilityMapping,
  getInvariant,
  getWorkforceContract,
  validateCanonicalState,
  validateContractShape,
  validatePayrollSource,
  validateTransition,
  workforceWeekIdentity
} from "../../02_CORE/shared/workforce-operations-v1.mjs";

const root = new URL("../../", import.meta.url);

async function rawContract() {
  const raw = await fs.readFile(new URL("02_CORE/contracts/workforce-operations-v1.json", root), "utf8");
  return JSON.parse(raw);
}

test("contract exposes canonical schema version and timezone", async () => {
  const c = await rawContract();
  assert.equal(c.schema_version, WORKFORCE_SCHEMA_VERSION);
  assert.equal(c.timezone, WORKFORCE_TIMEZONE);
  assert.equal(c.status, "CANONICAL");
});

test("contract shape validator accepts the canonical contract", () => {
  const result = validateContractShape(getWorkforceContract());
  assert.equal(result.ok, true);
  assert.equal(result.code, "OK");
  assert.ok(result.detail.invariant_count >= 30);
});

test("Monday uses itself as Asia/Ho_Chi_Minh week start", () => {
  const w = workforceWeekIdentity("2026-09-21");
  assert.equal(w.ok, true);
  assert.equal(w.current_week_start, "2026-09-21");
  assert.equal(w.next_week_start, "2026-09-28");
  assert.equal(w.iso_weekday, 1);
});

test("Sunday deterministically maps Manager target to next Monday", () => {
  const w = workforceWeekIdentity("2026-09-20T23:30:00+07:00");
  assert.equal(w.date, "2026-09-20");
  assert.equal(w.iso_weekday, 7);
  assert.equal(w.sunday_manager_target_week_start, "2026-09-21");
  assert.equal(w.availability_registration_state, "REGISTRATION_CLOSED");
});

test("timezone conversion does not use a foreign fixed-date assumption", () => {
  const w = workforceWeekIdentity("2026-09-20T17:30:00Z");
  assert.equal(w.date, "2026-09-21");
  assert.equal(w.current_week_start, "2026-09-21");
  assert.equal(w.timezone, "Asia/Ho_Chi_Minh");
});

test("invalid date fails closed", () => {
  assert.deepEqual(workforceWeekIdentity("not-a-date"), { ok: false, code: "INVALID_DATE", detail: null });
});

test("Employee availability is semantically distinct from official assignment", async () => {
  const c = await rawContract();
  assert.equal(c.invariants.find((x) => x.id === "WF-INV-001").rule, "AVAILABILITY_IS_CAPABILITY_NOT_OFFICIAL_ASSIGNMENT");
  assert.notEqual(c.state_machines.AVAILABILITY.states.join(","), c.state_machines.SCHEDULE.states.join(","));
});

test("Employee cannot publish schedule", () => {
  const r = validateTransition("SCHEDULE", "REVIEWED", "PUBLISHED", "EMPLOYEE");
  assert.equal(r.ok, false);
  assert.equal(r.code, "ACTOR_NOT_AUTHORIZED");
});

test("Manager can publish canonical reviewed schedule", () => {
  assert.equal(validateTransition("SCHEDULE", "REVIEWED", "PUBLISHED", "MANAGER").ok, true);
});

test("Manager publish authorization is store scoped", () => {
  const allowed = authorizeWorkforceAccess({actor_role:"MANAGER",capability:"SCHEDULE_PUBLISH",subject_store_id:"CN1",allowed_store_ids:["CN1"]});
  const denied = authorizeWorkforceAccess({actor_role:"MANAGER",capability:"SCHEDULE_PUBLISH",subject_store_id:"CN2",allowed_store_ids:["CN1"]});
  assert.equal(allowed.ok, true);
  assert.equal(denied.code, "STORE_SCOPE_DENY");
});

test("maximum two assignments per employee per day is canonical", () => {
  assert.equal(getInvariant("WF-INV-008")?.rule, "MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_PER_DAY");
});

test("schedule overlap is forbidden canonically", () => {
  assert.equal(getInvariant("WF-INV-007")?.rule, "SCHEDULE_ASSIGNMENTS_MUST_NOT_OVERLAP_FOR_EMPLOYEE");
});

test("staffing-gap state is absent from canonical core", async () => {
  const c = await rawContract();
  assert.equal(c.five_step.delete.includes("STAFFING_GAP_AS_CORE_STATE"), true);
  assert.equal(c.invariants.find((x) => x.id === "WF-INV-003")?.rule, "STAFFING_GAP_NOT_CORE_STATE");
  assert.equal(Object.keys(c.state_machines).includes("STAFFING_GAP"), false);
});

test("Robot generation is not Manager scheduling prerequisite", async () => {
  const c = await rawContract();
  assert.equal(c.roles.ROBOT.scheduling_prerequisite, false);
  assert.equal(getInvariant("WF-INV-004")?.rule, "ROBOT_GENERATION_NOT_SCHEDULING_PREREQUISITE");
});

test("Swap requires peer acceptance before Manager approval", () => {
  assert.equal(validateTransition("SWAP","REQUESTED","PEER_ACCEPTED","PEER_EMPLOYEE").ok, true);
  const premature = validateTransition("SWAP","REQUESTED","MANAGER_APPROVED","MANAGER");
  assert.equal(premature.ok, false);
  assert.equal(premature.code, "TRANSITION_NOT_ALLOWED");
});

test("Swap peer-accepted state is a documented implementation gap", () => {
  const peer = getCompatibilityMapping("SWAP").find((x) => x.canonical_state === "PEER_ACCEPTED");
  assert.equal(peer.semantic_match, "GAP");
  assert.equal(peer.migration_required, "YES_IN_LATER_TASK");
  assert.match(peer.closing_task, /TASK-096/);
});

test("Swap apply requires prior Manager-approved canonical state", () => {
  assert.equal(validateTransition("SWAP","MANAGER_APPROVED","APPLIED","SYSTEM").ok, true);
  assert.equal(validateTransition("SWAP","PEER_ACCEPTED","APPLIED","SYSTEM").ok, false);
});

test("Give requires recipient acceptance before Manager approval", () => {
  assert.equal(validateTransition("GIVE","OFFERED","RECIPIENT_ACCEPTED","RECIPIENT_EMPLOYEE").ok, true);
  assert.equal(validateTransition("GIVE","OFFERED","MANAGER_APPROVED","MANAGER").code, "TRANSITION_NOT_ALLOWED");
});

test("Give current APPROVED transaction maps to canonical APPLIED without rename migration", () => {
  const applied = getCompatibilityMapping("GIVE").find((x) => x.canonical_state === "APPLIED");
  assert.equal(applied.semantic_match, "EXACT");
  assert.equal(applied.migration_required, "NO");
  assert.match(applied.current_state_rpc_table, /status=APPROVED/);
});

test("Give Manager approval still follows recipient acceptance", () => {
  assert.equal(validateTransition("GIVE","RECIPIENT_ACCEPTED","MANAGER_APPROVED","MANAGER").ok, true);
  assert.equal(validateTransition("GIVE","MANAGER_APPROVED","APPLIED","SYSTEM").ok, true);
});

test("current assignment owner has attendance submission authority", () => {
  assert.equal(canSubmitAttendanceForAssignment({actor_employee_id:"A",assignment_owner_id:"A"}).ok, true);
});

test("old owner loses and new owner gains attendance authority after transfer", () => {
  const oldOwner = canSubmitAttendanceForAssignment({actor_employee_id:"A",assignment_owner_id:"B"});
  const newOwner = canSubmitAttendanceForAssignment({actor_employee_id:"B",assignment_owner_id:"B"});
  assert.equal(oldOwner.code, "NOT_CURRENT_ASSIGNMENT_OWNER");
  assert.equal(newOwner.ok, true);
});

test("Attendance V1 has no realtime CHECKED_IN or CHECKED_OUT canonical states", async () => {
  const c = await rawContract();
  assert.equal(c.state_machines.ATTENDANCE.states.includes("CHECKED_IN"), false);
  assert.equal(c.state_machines.ATTENDANCE.states.includes("CHECKED_OUT"), false);
  assert.equal(getInvariant("WF-INV-022")?.rule, "REALTIME_CHECK_IN_OUT_NOT_CANONICAL_ATTENDANCE_V1");
});

test("attendance SUBMITTED is not confirmed work time", async () => {
  const c = await rawContract();
  assert.equal(c.attendance_truth.separation.includes("RAW_SUBMISSION_NE_CONFIRMED_WORK_TIME"), true);
  assert.equal(getInvariant("WF-INV-023")?.rule, "RAW_ATTENDANCE_SUBMISSION_NE_CONFIRMED_WORK_TIME");
});

test("missing attendance review policy fails closed to NEEDS_REVIEW", () => {
  const r = diagnosticForAttendancePolicy({});
  assert.equal(r.ok, false);
  assert.equal(r.route_to, "NEEDS_REVIEW");
  assert.equal(r.auto_approve, false);
});

test("configured attendance policy remains policy evaluation not invented threshold", () => {
  const r = diagnosticForAttendancePolicy({deviation_minutes:7,auto_approval:false});
  assert.equal(r.ok, true);
  assert.equal(r.route_to, "POLICY_EVALUATION");
  assert.equal(r.auto_approve, false);
});

test("NEEDS_REVIEW raw attendance cannot be payroll input", () => {
  const r = validatePayrollSource({source_type:"ATTENDANCE_SUBMITTED",confirmed_work_time_state:"NEEDS_REVIEW"});
  assert.equal(r.code, "PAYROLL_SOURCE_NOT_CONFIRMED_WORK_TIME");
  assert.equal(getInvariant("WF-INV-025")?.rule, "NEEDS_REVIEW_NOT_PAYROLL_INPUT");
});

test("REJECTED raw attendance cannot be payroll input", () => {
  assert.equal(validatePayrollSource({source_type:"ATTENDANCE_SUBMITTED",confirmed_work_time_state:"REJECTED"}).ok, false);
  assert.equal(getInvariant("WF-INV-026")?.rule, "REJECTED_ATTENDANCE_NOT_PAYROLL_INPUT");
});

test("confirmed work time is a separate canonical truth family", async () => {
  const c = await rawContract();
  assert.deepEqual(c.state_machines.CONFIRMED_WORK_TIME.states, ["ABSENT","CONFIRMED","REVISED"]);
  assert.equal(getInvariant("WF-INV-027")?.rule, "CONFIRMED_WORK_TIME_SEPARATE_CANONICAL_TRUTH");
  assert.ok(c.confirmed_work_time.minimum_fields.includes("revision_identity"));
});

test("Payroll source validator accepts confirmed work time only", () => {
  assert.equal(validatePayrollSource({source_type:"CONFIRMED_WORK_TIME",confirmed_work_time_state:"CONFIRMED"}).ok, true);
  assert.equal(validatePayrollSource({source_type:"CONFIRMED_WORK_TIME",confirmed_work_time_state:"REVISED"}).ok, true);
  assert.equal(validatePayrollSource({source_type:"PLANNED_SCHEDULE",confirmed_work_time_state:"CONFIRMED"}).ok, false);
});

test("attendance.amount is explicitly legacy non-payroll truth", async () => {
  const c = await rawContract();
  const row = c.legacy_deprecations.find((x) => x.item === "attendance.amount as payroll truth");
  assert.equal(row.status, "LEGACY_NON_PAYROLL_TRUTH");
  assert.equal(getInvariant("WF-INV-029")?.rule, "ATTENDANCE_AMOUNT_IS_LEGACY_NON_PAYROLL_TRUTH");
});

test("Payroll ESTIMATED is not FINALIZED", async () => {
  const c = await rawContract();
  assert.ok(c.state_machines.PAYROLL.states.includes("ESTIMATED"));
  assert.ok(c.state_machines.PAYROLL.states.includes("FINALIZED"));
  assert.equal(getInvariant("WF-INV-030")?.rule, "PAYROLL_ESTIMATED_NE_FINALIZED");
});

test("Payroll cannot skip REVIEWED", () => {
  assert.equal(validateTransition("PAYROLL","ESTIMATED","FINALIZED","PAYROLL_AUTHORIZED").ok, false);
  assert.equal(validateTransition("PAYROLL","ESTIMATED","REVIEWED","PAYROLL_AUTHORIZED").ok, true);
  assert.equal(validateTransition("PAYROLL","REVIEWED","FINALIZED","PAYROLL_AUTHORIZED").ok, true);
});

test("Employee A cannot read Employee B profile", () => {
  const r = authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"A",subject_employee_id:"B",capability:"PROFILE_READ"});
  assert.equal(r.code, "CROSS_USER_DENY");
});

test("Employee A cannot read Employee B payroll", () => {
  const r = authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"A",subject_employee_id:"B",capability:"PAYROLL_READ"});
  assert.equal(r.code, "CROSS_USER_DENY");
});

test("Employee can read own payroll and profile", () => {
  assert.equal(authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"A",subject_employee_id:"A",capability:"PAYROLL_READ"}).ok, true);
  assert.equal(authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"A",subject_employee_id:"A",capability:"PROFILE_READ"}).ok, true);
});

test("Manager profile access is limited to explicit store scope", () => {
  assert.equal(authorizeWorkforceAccess({actor_role:"MANAGER",capability:"PROFILE_READ",subject_store_id:"CN1",allowed_store_ids:["CN1","CN2"]}).ok, true);
  assert.equal(authorizeWorkforceAccess({actor_role:"MANAGER",capability:"PROFILE_READ",subject_store_id:"CN3",allowed_store_ids:["CN1","CN2"]}).code, "STORE_SCOPE_DENY");
});

test("Manager payroll review requires explicit later permission", () => {
  const missing = authorizeWorkforceAccess({actor_role:"MANAGER",capability:"PAYROLL_REVIEW",subject_store_id:"CN1",allowed_store_ids:["CN1"]});
  const allowed = authorizeWorkforceAccess({actor_role:"MANAGER",capability:"PAYROLL_REVIEW",subject_store_id:"CN1",allowed_store_ids:["CN1"],explicit_permissions:["PAYROLL_REVIEW"]});
  assert.equal(missing.code, "EXPLICIT_PERMISSION_REQUIRED");
  assert.equal(allowed.ok, true);
});

test("Owner has enterprise authority but is not daily scheduler", async () => {
  const c = await rawContract();
  assert.equal(authorizeWorkforceAccess({actor_role:"OWNER",capability:"PROFILE_READ"}).ok, true);
  assert.equal(c.roles.OWNER.daily_schedule_owner, false);
});

test("unknown actor fails closed", () => {
  assert.equal(authorizeWorkforceAccess({actor_role:"GUEST",capability:"PROFILE_READ"}).code, "UNKNOWN_ACTOR");
});

test("unknown canonical state fails closed", () => {
  assert.equal(validateCanonicalState("ATTENDANCE","CLOCKED_IN").code, "UNKNOWN_STATE");
});

test("unknown domain fails closed", () => {
  assert.equal(validateCanonicalState("HRM_MAGIC","ACTIVE").code, "UNKNOWN_DOMAIN");
});

test("unknown transition fails closed", () => {
  assert.equal(validateTransition("ATTENDANCE","DRAFT","APPROVED","MANAGER").code, "TRANSITION_NOT_ALLOWED");
});

test("schedule publish has explicit idempotency requirement", async () => {
  const c = await rawContract();
  const r = c.idempotency_requirements.find((x) => x.family === "schedule_publish");
  assert.match(r.logical_identity, /official assignment/i);
  assert.match(r.duplicate_retry, /must not create duplicate assignments/i);
});

test("attendance submit has explicit idempotency requirement", async () => {
  const c = await rawContract();
  const r = c.idempotency_requirements.find((x) => x.family === "attendance_submit");
  assert.match(r.logical_identity, /assignment_id/);
  assert.match(r.duplicate_retry, /must not create duplicate active submission/i);
});

test("Swap apply has explicit idempotency requirement", async () => {
  const c = await rawContract();
  assert.match(c.idempotency_requirements.find((x) => x.family === "swap_accept_approve_apply").duplicate_retry, /cannot exchange twice/i);
});

test("Give apply has explicit idempotency requirement", async () => {
  const c = await rawContract();
  assert.match(c.idempotency_requirements.find((x) => x.family === "give_accept_approve_apply").duplicate_retry, /transfers at most once/i);
});

test("payroll finalize has idempotency and audit requirements", async () => {
  const c = await rawContract();
  assert.ok(c.idempotency_requirements.some((x) => x.family === "payroll_finalize"));
  assert.equal(c.audit_requirements.payroll_finalize, "AUDIT_REQUIRED");
  assert.equal(c.audit_requirements.new_ledger_in_task_091, false);
});

test("legacy realtime clock events are deprecated not canonical", async () => {
  const c = await rawContract();
  const legacy = new Map(c.legacy_deprecations.map((x) => [x.item,x.status]));
  for (const event of ["ATTENDANCE_CLOCKED_IN","ATTENDANCE_CLOCKED_OUT","CLOCK_OUT_REMINDER"]) {
    assert.equal(legacy.get(event), "LEGACY_DEPRECATE_FROM_ACTIVE_V1");
    assert.equal(c.canonical_events.includes(event), false);
  }
});

test("contract getter and validators are deterministic and idempotent", () => {
  assert.deepEqual(getWorkforceContract(), getWorkforceContract());
  assert.deepEqual(validateTransition("GIVE","RECIPIENT_ACCEPTED","MANAGER_APPROVED","MANAGER"),validateTransition("GIVE","RECIPIENT_ACCEPTED","MANAGER_APPROVED","MANAGER"));
  assert.deepEqual(workforceWeekIdentity("2026-09-20"),workforceWeekIdentity("2026-09-20"));
});

test("every E2E-01 through E2E-16 is present exactly once", async () => {
  const c = await rawContract();
  const ids = c.e2e_traceability.map((x) => x.id);
  assert.equal(ids.length, 16);
  assert.equal(new Set(ids).size, 16);
  assert.deepEqual(ids, Array.from({length:16},(_,i) => "E2E-" + String(i + 1).padStart(2,"0")));
});

test("every E2E scenario maps state family invariant and closing task", async () => {
  const c = await rawContract();
  for (const row of c.e2e_traceability) {
    assert.ok(row.state_families.length > 0, row.id);
    assert.ok(row.invariants.length > 0, row.id);
    assert.ok(row.closing_tasks.length > 0, row.id);
    for (const id of row.invariants) assert.ok(getInvariant(id), row.id + ":" + id);
  }
});

test("unresolved Sunday cutoff has no synthetic default", async () => {
  const c = await rawContract();
  const cfg = c.unresolved_business_configuration.find((x) => x.key === "SUNDAY_REGISTRATION_CUTOFF_TIME");
  assert.equal(cfg.status, "CONFIGURABLE_GAP");
  assert.equal(cfg.default, "NONE");
  assert.equal(c.week_semantics.exact_sunday_cutoff, "CONFIGURABLE_UNRESOLVED");
});

test("attendance deviation threshold has no synthetic numeric default", async () => {
  const c = await rawContract();
  const cfg = c.unresolved_business_configuration.find((x) => x.key === "ATTENDANCE_DEVIATION_THRESHOLD");
  assert.equal(cfg.default, "NONE");
  assert.equal(c.attendance_truth.numeric_deviation_threshold, "CONFIGURABLE_UNRESOLVED");
});

test("payroll rates allowances bonuses and deductions remain configurable gaps", async () => {
  const c = await rawContract();
  const keys = new Set(c.unresolved_business_configuration.map((x) => x.key));
  for (const key of ["PAYROLL_PAY_RATES","PAYROLL_ALLOWANCE_RULES","PAYROLL_BONUS_RULES","PAYROLL_DEDUCTION_RULES"]) {
    assert.equal(keys.has(key), true, key);
    assert.equal(c.unresolved_business_configuration.find((x) => x.key === key).default, "NONE", key);
  }
});

test("helper has no database Supabase browser or external API write path", async () => {
  const source = await fs.readFile(new URL("02_CORE/shared/workforce-operations-v1.mjs", root), "utf8");
  assert.doesNotMatch(source, /supabase|\\.rpc\\(|\\.from\\(|fetch\\(|XMLHttpRequest|localStorage|sessionStorage|document\\.|window\\./i);
  assert.doesNotMatch(source, /insert|update|delete\\s+from|create\\s+table|alter\\s+table/i);
});

test("TASK-091 safety forbids production mutation and preserves PFC", async () => {
  const c = await rawContract();
  assert.equal(c.safety.production_mutation_in_task_091, false);
  assert.equal(c.safety.db_migration_in_task_091, false);
  assert.equal(c.safety.attendance_migration_in_task_091, false);
  assert.equal(c.safety.payroll_table_creation_in_task_091, false);
  assert.equal(c.safety.pfc_cursor_mutation, false);
});

test("TASK-092 does not auto-start and Workforce Robot remains disabled", async () => {
  const c = await rawContract();
  assert.equal(c.safety.task_092_auto_start, false);
  assert.equal(c.safety.workforce_robot_enabled, false);
  assert.equal(c.roles.ROBOT.workforce_track_execution_enabled, false);
});

test("compatibility map covers all required domains", async () => {
  const c = await rawContract();
  const domains = new Set(c.compatibility_rules.map((x) => x.domain));
  for (const domain of ["AVAILABILITY","SCHEDULE_GENERATION","OFFICIAL_SCHEDULE","SWAP","GIVE","ATTENDANCE","CONFIRMED_WORK_TIME","PAYROLL","NOTIFICATION"]) {
    assert.equal(domains.has(domain), true, domain);
  }
});

test("legacy COMPLETED attendance is not mapped as confirmed work time", () => {
  const attendance = getCompatibilityMapping("ATTENDANCE");
  assert.equal(attendance.some((x) => /COMPLETED/.test(x.current_state_rpc_table) && /confirmed/i.test(x.canonical_state)), false);
  assert.equal(getCompatibilityMapping("CONFIRMED_WORK_TIME")[0].semantic_match, "GAP");
});

test("malformed contract fails closed", () => {
  const malformed={schema_version:"wrong",timezone:"UTC",week_semantics:{},invariants:[],compatibility_rules:[],e2e_traceability:[]};
  const r=validateContractShape(malformed);
  assert.equal(r.code, "MALFORMED_CONTRACT");
  assert.ok(r.detail.includes("SCHEMA_VERSION"));
  assert.ok(r.detail.includes("TIMEZONE"));
});
