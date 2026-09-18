import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-032 contract keeps verified feedback core and fail-closed boundaries",async()=>{
  const spec=JSON.parse(await read("02_CORE/contracts/published-schedule-feedback-loop.v1.json"));
  assert.equal(spec.task,"TASK-032");
  assert.equal(spec.status,"OWNER_DECISION_REQUIRED");
  assert.equal(spec.verified_run,35337154491);
  assert.equal(spec.verified.attendance_schedule_linked,true);
  assert.equal(spec.verified.swap_atomic_schedule_update,true);
  assert.equal(spec.verified.official_schedule_refresh_after_swap,true);
  assert.equal(spec.fail_closed.give_shift_primitive,"NOT_CONNECTED");
  assert.equal(spec.fail_closed.notification_outbox,"NOT_CONNECTED");
  assert.equal(spec.guardrails.fake_give_as_swap,false);
  assert.equal(spec.guardrails.production_schema_apply,false);
  assert.equal(spec.guardrails.production_provider_activation,false);
  assert.equal(spec.guardrails.credentials_in_public_git,false);
  assert.equal(spec.required_project_state,"WAIT_USER");
  assert.deepEqual(spec.owner_decisions.map(x=>x.id),["SFB-001","SFB-002"]);
  const give=spec.owner_decisions.find(x=>x.id==="SFB-001");
  assert.equal(give.status,"APPROVED");
  assert.equal(give.selected_option,"RECIPIENT_ACCEPTS_THEN_MANAGER_APPROVES");
  const notification=spec.owner_decisions.find(x=>x.id==="SFB-002");
  assert.equal(notification.status,"OWNER_INPUT_REQUIRED");
});

test("active Employee feedback engines fail closed on fake Give and unsafe auto-attendance",async()=>{
  const [swap,attendance,manager]=await Promise.all([
    read("06_EMPLOYEE/swap/engine-v1.js"),
    read("06_EMPLOYEE/attendance/engine-v1.js"),
    read("05_MANAGER/Workforce/swap-approval-v1.js")
  ]);
  assert.match(swap,/giveShiftState='NOT_CONNECTED'/);
  assert.doesNotMatch(swap,/mode='give'/);
  assert.match(swap,/Vui lòng nhập lý do đổi ca/);
  assert.doesNotMatch(attendance,/auto_attendance_from_approved_schedules/);
  assert.match(attendance,/clock_in_for_schedule/);
  assert.match(attendance,/clock_out_attendance/);
  assert.match(manager,/list_shift_swap_requests_v1/);
  assert.match(manager,/approve_shift_swap/);
  assert.match(manager,/reject_shift_swap/);
});
