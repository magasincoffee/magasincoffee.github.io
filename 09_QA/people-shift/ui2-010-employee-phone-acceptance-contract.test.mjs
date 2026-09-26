import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const acceptance=read("09_QA/people-shift/ui2-010-employee-phone-acceptance.mjs");
const gate=read("09_QA/people-shift/browser-e2e.mjs");
const engines={
  dashboard:read("06_EMPLOYEE/dashboard/engine-v1.js"),
  schedule:read("06_EMPLOYEE/schedule/engine-v1.js"),
  availability:read("06_EMPLOYEE/availability/engine-v1.js"),
  swap:read("06_EMPLOYEE/swap/engine-v1.js"),
  attendance:read("06_EMPLOYEE/attendance/engine-v1.js"),
  payroll:read("06_EMPLOYEE/payroll/engine-v1.js"),
  profile:read("06_EMPLOYEE/profile/engine-v1.js")
};

test("UI2-010 aggregate gate covers every required Employee phone surface at 360/390/430",()=>{
  assert.match(acceptance,/const widths=\[360,390,430\]/);
  for(const surface of ["shell","today","schedule","availability","swap","give","attendance","payroll","profile"])assert.ok(acceptance.includes('"'+surface+'"'),surface);
  for(const invariant of ["overflow","target","focus","nav_collision"])assert.ok(acceptance.includes(invariant),invariant);
  assert.match(acceptance,/matrix\.length===expected/);
  assert.match(acceptance,/expected=widths\.length\*9/);
});

test("UI2-010 reuses accepted UI2 browser evidence instead of duplicating domain fixtures",()=>{
  for(const artifact of [
    "sched-07-ui-responsive-report.json",
    "ui2-008-employee-secondary-report.json",
    "ui2-009-employee-people-report.json",
    "employee-availability-canonical-report.json",
    "shift-swap-lifecycle-v1.json",
    "shift-give-lifecycle-v1.json",
    "task-099-employee-attendance-ui-report.json",
    "task-101-employee-profile-projection-report.json",
    "task-104-employee-payroll-self-check-report.json"
  ])assert.ok(acceptance.includes(artifact),artifact);
  assert.ok(!fs.existsSync("09_QA/people-shift/ui2-010-employee-phone-fixture.html"));
});

test("UI2-010 fails closed on layout/focus/stale truth/direct-table evidence",()=>{
  assert.match(acceptance,/target>=43\.5/);
  assert.match(acceptance,/focus!==["']none["']/);
  assert.match(acceptance,/!.*collision|collision/);
  for(const check of [
    "ui2_005_employee_hash_back_reload_and_secondary_drawer",
    "ui2_006_today_direct_reload_back_keeps_dashboard_active",
    "ui2_007_schedule_direct_reload_back_keeps_shell_route",
    "ui2_008_secondary_direct_reload_back_refreshes_canonical_truth",
    "frame_reload_preserves_same_week_rows_without_resubmit",
    "reload_retains_applied_state_and_employee_b_ownership",
    "reload_retains_applied_state_and_new_owner",
    "task099_persisted_status_survives_reload_without_duplicate",
    "task101_reload_converges_without_cross_user_state",
    "ui2_009_direct_route_back_reload_refreshes_canonical_truth"
  ])assert.ok(acceptance.includes(check),check);
  for(const check of [
    "only_canonical_rpc_boundary_is_used",
    "browser_uses_rpc_contract_not_direct_shift_swap_table_mutation",
    "browser_uses_rpc_contract_not_direct_give_or_schedule_table_mutation",
    "task099_no_direct_table_or_legacy_mutation_path",
    "task101_browser_uses_self_rpc_only_and_no_direct_profile_table",
    "task104_employee_self_reader_is_parameterless_and_rpc_only"
  ])assert.ok(acceptance.includes(check),check);
});

test("UI2-010 explicitly exercises canonical loading/error/empty/retry reachability",()=>{
  for(const check of [
    "ui2_006_today_current_next_loading_empty_error_states",
    "ui2_007_schedule_week_navigation_and_states",
    "ui2_008_availability_state_matrix_submit_error_retry_readonly",
    "ui2_008_swap_give_state_matrix_delegation_error_retry_submit",
    "ui2_009_state_matrix_error_retry_stale_owner",
    "ui2_010_attendance_error_empty_retry_reachable"
  ])assert.ok(acceptance.includes(check),check);
  assert.match(acceptance,/data-attendance-ui-state=["']error["']/);
  assert.match(acceptance,/data-attendance-retry/);
  assert.match(acceptance,/data-attendance-ui-state=["']empty["']/);
});

test("Employee RPC inventory remains the accepted UI2-009 inventory and no protected browser DML source is added",()=>{
  const expected={
    schedule:["list_my_approved_schedules_v2"],
    availability:["get_my_availability","save_my_availability","delete_my_availability"],
    swap:[
      "list_my_approved_schedules_v2","list_shift_swap_candidates_v1","list_shift_give_candidates_v1",
      "submit_shift_swap_request","submit_shift_give_request","respond_shift_swap_request","respond_shift_give_request",
      "list_my_shift_swaps_v2","list_my_incoming_shift_swaps_v1","list_my_shift_gives_v1"
    ],
    attendance:["list_my_approved_schedules_v2","get_my_attendance_v2","submit_manual_time_attendance_v1"],
    payroll:["get_my_payroll_self_check_v1"],
    profile:["get_my_employee_profile_v1"]
  };
  for(const [name,names] of Object.entries(expected)){
    for(const rpc of names)assert.ok(engines[name].includes(rpc),name+" missing "+rpc);
  }
  for(const [name,source] of Object.entries(engines)){
    assert.doesNotMatch(source,/\b(?:C|MAGASIN_CORE|globalThis\.MAGASIN_CORE)\.supabase\.from\s*\(/,name+" direct protected table reader/writer");
    assert.doesNotMatch(source,/createClient\s*\(/,name+" creates direct client");
  }
});

test("UI2-010 is integrated after UI2-009 in the existing People Shift browser gate and emits review artifacts",()=>{
  const p9=gate.indexOf('import("./ui2-009-employee-people-browser.mjs")');
  const p10=gate.indexOf('import("./ui2-010-employee-phone-acceptance.mjs")');
  assert.ok(p9>=0&&p10>p9);
  assert.match(acceptance,/ui2-010-employee-phone-acceptance-matrix\.md/);
  assert.match(acceptance,/ui2-010-employee-phone-acceptance-report\.json/);
  assert.match(acceptance,/ACCEPT/);
  assert.match(acceptance,/screenshot/);
});

console.log("UI2_010_EMPLOYEE_PHONE_ACCEPTANCE_CONTRACT=PASS");
