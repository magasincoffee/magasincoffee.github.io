import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-032 contract keeps verified feedback core and fail-closed boundaries",async()=>{
  const spec=JSON.parse(await read("02_CORE/contracts/published-schedule-feedback-loop.v1.json"));
  assert.equal(spec.task,"TASK-032");
  assert.equal(spec.status,"APPROVED");
  assert.equal(spec.verified_run,35337154491);
  assert.equal(spec.verified.attendance_schedule_linked,true);
  assert.equal(spec.verified.swap_atomic_schedule_update,true);
  assert.equal(spec.verified.official_schedule_refresh_after_swap,true);
  assert.equal(spec.fail_closed.give_shift_primitive,"CONNECTED_V1");
  assert.equal(spec.verified.give_shift_v1,true);
  assert.equal(spec.verified.give_recipient_consent,true);
  assert.equal(spec.verified.give_manager_approval,true);
  assert.equal(spec.verified.official_schedule_refresh_after_give,true);
  assert.equal(spec.fail_closed.notification_outbox,"CONNECTED_V1");
  assert.equal(spec.verified.notification_outbox_v1,true);
  assert.equal(spec.verified.notification_employee_in_app_reader,true);
  assert.equal(spec.verified.clock_out_reminder,true);
  assert.equal(spec.verified.clock_out_cancels_pending_reminder,true);
  assert.equal(spec.verified.email_queue_state_machine,true);
  assert.equal(spec.guardrails.fake_give_as_swap,false);
  assert.equal(spec.guardrails.production_schema_apply,true);
  assert.equal(spec.guardrails.production_provider_activation,false);
  assert.equal(spec.guardrails.credentials_in_public_git,false);
  assert.equal(spec.required_project_state,"READY");
  assert.deepEqual(spec.owner_decisions.map(x=>x.id),["SFB-001","SFB-002"]);
  const give=spec.owner_decisions.find(x=>x.id==="SFB-001");
  assert.equal(give.status,"APPROVED");
  assert.equal(give.selected_option,"RECIPIENT_ACCEPTS_THEN_MANAGER_APPROVES");
  const notification=spec.owner_decisions.find(x=>x.id==="SFB-002");
  assert.equal(notification.status,"APPROVED");
  assert.equal(notification.selected.allow_event_outbox_production_apply,true);
  assert.equal(notification.selected.email_source,"MAGASIN_EMAIL");
  assert.equal(notification.selected.external_calendar,false);
  assert.equal(notification.selected.allow_secret_store_credentials,true);
});

test("active Employee feedback engines use real Give lifecycle and keep unsafe auto-attendance removed",async()=>{
  const [swap,attendance,manager]=await Promise.all([
    read("06_EMPLOYEE/swap/engine-v1.js"),
    read("06_EMPLOYEE/attendance/engine-v1.js"),
    read("05_MANAGER/Workforce/swap-approval-v1.js")
  ]);
  assert.match(swap,/submit_shift_give_request/);
  assert.match(swap,/respond_shift_give_request/);
  assert.match(swap,/PENDING_RECIPIENT/);
  assert.match(swap,/PENDING_MANAGER/);
  assert.match(swap,/Vui lòng nhập lý do đổi ca/);
  assert.doesNotMatch(attendance,/auto_attendance_from_approved_schedules/);
  assert.match(attendance,/submit_manual_time_attendance_v1/);
  assert.match(attendance,/list_my_approved_schedules_v2/);
  assert.doesNotMatch(attendance,/clock_in_for_schedule/);
  assert.doesNotMatch(attendance,/clock_out_attendance/);
  assert.doesNotMatch(attendance,/manual_attendance_from_schedule/);
  assert.match(manager,/list_shift_swap_requests_v1/);
  assert.match(manager,/approve_shift_swap/);
  assert.match(manager,/reject_shift_swap/);
  assert.match(manager,/list_shift_give_requests_v1/);
  assert.match(manager,/approve_shift_give/);
  assert.match(manager,/reject_shift_give/);
});
