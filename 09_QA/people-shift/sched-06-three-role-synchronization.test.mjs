import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("SCHED-06 locks one active writer and one official schedule truth across roles",async()=>{
  const [ownerRuntime,ownerLegacy,managerWriter,managerOfficial,employeeSchedule,employeeAttendance,employeeSwap,managerApproval]=await Promise.all([
    read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html"),
    read("04_OWNER/Workforce/03-publish/engine-v1.js"),
    read("05_MANAGER/Workforce/draft-publish-v1.js"),
    read("05_MANAGER/Workforce/official-v1.js"),
    read("06_EMPLOYEE/schedule/engine-v1.js"),
    read("06_EMPLOYEE/attendance/engine-v1.js"),
    read("06_EMPLOYEE/swap/engine-v1.js"),
    read("05_MANAGER/Workforce/swap-approval-v1.js")
  ]);

  assert.match(ownerRuntime,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js/);
  assert.match(ownerLegacy,/compatibility wrapper/);
  assert.match(ownerLegacy,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js/);
  assert.doesNotMatch(ownerLegacy,/create_schedule_generation|replace_schedule_generation_assignments|publish_schedule_generation/);

  for(const rpc of ["create_schedule_generation","replace_schedule_generation_assignments","validate_schedule_generation_v1","review_schedule_generation","publish_schedule_generation","get_manager_weekly_schedule"]){
    assert.match(managerWriter,new RegExp(rpc),rpc);
  }
  assert.match(managerOfficial,/get_manager_weekly_schedule/);
  assert.match(managerOfficial,/magasin:shift-give-resolved/);
  assert.match(managerOfficial,/magasin:shift-swap-resolved/);
  assert.match(employeeSchedule,/list_my_approved_schedules_v2/);
  assert.match(employeeSchedule,/schedule_id/);
  assert.match(employeeAttendance,/list_my_approved_schedules_v2/);
  assert.match(employeeAttendance,/submit_manual_time_attendance_v1/);
  assert.match(employeeAttendance,/ATTENDANCE_NOT_CURRENT_OWNER/);
  assert.match(employeeSwap,/submit_shift_give_request/);
  assert.match(employeeSwap,/respond_shift_give_request/);
  assert.match(managerApproval,/list_shift_give_requests_v1/);
  assert.match(managerApproval,/p_status:'PENDING_MANAGER'/);
  assert.match(managerApproval,/approve_shift_give/);
});

test("SCHED-06 server primitives preserve schedule identity through publish, Give and Attendance",async()=>{
  const [publishSql,giveSql,attendanceSql]=await Promise.all([
    read("07_DATABASE/migrations/20260921171458_task_094_schedule_validation_publish_gate_v1.sql"),
    read("07_DATABASE/migrations/20260922134157_task_097_give_lifecycle_reconciliation_hardening.sql"),
    read("07_DATABASE/migrations/20260922142225_task_098_manual_time_attendance_authority_v1.sql")
  ]);

  assert.match(publishSql,/create unique index if not exists uq_work_schedules_source_generation_assignment/);
  const publish=publishSql.split(/create or replace function public\.publish_schedule_generation/i)[1];
  assert.ok(publish,"publish_schedule_generation missing");
  assert.equal((publish.match(/insert into public\.work_schedules/g)||[]).length,1);
  assert.match(publish,/source_generation_id,source_generation_assignment_id/);
  assert.match(publish,/'already_published',true/);

  const approve=giveSql.split(/create or replace function public\.approve_shift_give/i)[1].split(/create or replace function public\.reject_shift_give/i)[0];
  assert.match(approve,/v_give\.status='APPROVED'[\s\S]*already_applied/);
  assert.equal((approve.match(/update public\.work_schedules/g)||[]).length,1);
  assert.match(approve,/set user_id=v_give\.recipient_id/);
  assert.match(approve,/where id=p_give_id and status='PENDING_MANAGER'/);

  assert.match(attendanceSql,/validate_attendance_assignment_authority_v1\(p_schedule_id, v_uid\)/);
  assert.match(attendanceSql,/v_schedule\.user_id <> p_employee_id[\s\S]*ATTENDANCE_NOT_CURRENT_OWNER/);
  assert.match(attendanceSql,/shift_swap_schedule:/);
  assert.match(attendanceSql,/already_submitted', true/);
});

function createModel(){
  const state={
    generations:new Map(),
    schedules:new Map(),
    give:null,
    transferCount:0,
    attendance:new Map()
  };
  const store="store-a",week="2026-09-28",scheduleId="schedule-sync-1",generationId="generation-sync-1";

  function publish(){
    if(state.generations.get(generationId)==="PUBLISHED"){
      return {already_published:true,schedule_id:scheduleId};
    }
    state.generations.set(generationId,"PUBLISHED");
    if(!state.schedules.has(scheduleId)){
      state.schedules.set(scheduleId,{id:scheduleId,schedule_id:scheduleId,store_id:store,week_start:week,user_id:"u-a",status:"APPROVED",source_generation_id:generationId});
    }
    return {already_published:false,schedule_id:scheduleId};
  }
  function readRole(role,scopeStore=store){
    if(!["MANAGER","OWNER"].includes(role))throw new Error("ROLE_DENIED");
    if(scopeStore!==store)throw new Error("STORE_NOT_ALLOWED");
    return [...state.schedules.values()].filter(x=>x.store_id===scopeStore&&x.week_start===week&&x.status==="APPROVED").map(x=>({...x}));
  }
  function readEmployee(userId){
    return [...state.schedules.values()].filter(x=>x.user_id===userId&&x.status==="APPROVED").map(x=>({...x}));
  }
  function requestGive(){
    const s=state.schedules.get(scheduleId);
    if(!s||s.user_id!=="u-a")throw new Error("GIVER_SCHEDULE_NOT_OWNED");
    if(state.give&&["PENDING_RECIPIENT","PENDING_MANAGER"].includes(state.give.status))throw new Error("SHIFT_GIVE_ALREADY_PENDING");
    state.give={id:"give-sync-1",schedule_id:scheduleId,giver_id:"u-a",recipient_id:"u-b",status:"PENDING_RECIPIENT"};
  }
  function acceptGive(){
    if(state.give?.status!=="PENDING_RECIPIENT")throw new Error("SHIFT_GIVE_NOT_PENDING_RECIPIENT");
    const s=state.schedules.get(scheduleId);
    if(s.user_id!==state.give.giver_id)throw new Error("GIVER_OWNERSHIP_CHANGED");
    state.give.status="PENDING_MANAGER";
  }
  function approveGive(){
    const s=state.schedules.get(scheduleId);
    if(state.give?.status==="APPROVED"){
      if(s.user_id!=="u-b")throw new Error("SHIFT_GIVE_APPROVED_OWNERSHIP_MISMATCH");
      return {already_applied:true,transferred:false};
    }
    if(state.give?.status!=="PENDING_MANAGER")throw new Error("SHIFT_GIVE_NOT_PENDING_MANAGER");
    if(s.user_id!=="u-a")throw new Error("GIVER_OWNERSHIP_CHANGED");
    s.user_id="u-b";
    state.transferCount++;
    state.give.status="APPROVED";
    return {already_applied:false,transferred:true};
  }
  function submitAttendance(userId,start="06:10",end="12:05"){
    const s=state.schedules.get(scheduleId);
    if(s.user_id!==userId)throw new Error("ATTENDANCE_NOT_CURRENT_OWNER");
    const existing=state.attendance.get(scheduleId);
    if(existing){
      if(existing.user_id===userId&&existing.actual_start===start&&existing.actual_end===end)return {...existing,already_submitted:true};
      throw new Error("ATTENDANCE_ACTIVE_SUBMISSION_EXISTS");
    }
    const row={id:"att-sync-1",schedule_id:scheduleId,user_id:userId,actual_start:start,actual_end:end,status:"NEEDS_REVIEW",already_submitted:false};
    state.attendance.set(scheduleId,row);
    return {...row};
  }
  return {state,store,week,scheduleId,publish,readRole,readEmployee,requestGive,acceptGive,approveGive,submitAttendance};
}

test("SCHED-06 deterministic three-role synchronization converges on one schedule identity",()=>{
  const m=createModel();
  const first=m.publish();
  const retry=m.publish();
  assert.equal(first.schedule_id,m.scheduleId);
  assert.equal(retry.already_published,true);
  assert.equal(m.state.schedules.size,1);

  const employeeBefore=m.readEmployee("u-a")[0];
  const managerBefore=m.readRole("MANAGER")[0];
  const ownerBefore=m.readRole("OWNER")[0];
  assert.equal(employeeBefore.schedule_id,m.scheduleId);
  assert.deepEqual([employeeBefore.schedule_id,managerBefore.schedule_id,ownerBefore.schedule_id],[m.scheduleId,m.scheduleId,m.scheduleId]);
  assert.equal(managerBefore.user_id,"u-a");
  assert.equal(ownerBefore.user_id,"u-a");

  const staleSnapshot={...employeeBefore};
  m.requestGive();
  m.acceptGive();
  const apply=m.approveGive();
  const retryApply=m.approveGive();
  assert.deepEqual(apply,{already_applied:false,transferred:true});
  assert.deepEqual(retryApply,{already_applied:true,transferred:false});
  assert.equal(m.state.transferCount,1);
  assert.equal(m.state.schedules.size,1);

  assert.equal(m.readEmployee("u-a").length,0);
  assert.equal(m.readEmployee("u-b")[0].schedule_id,m.scheduleId);
  assert.equal(m.readRole("MANAGER")[0].user_id,"u-b");
  assert.equal(m.readRole("OWNER")[0].user_id,"u-b");
  assert.equal(staleSnapshot.user_id,"u-a");
  assert.equal(m.state.schedules.get(staleSnapshot.schedule_id).user_id,"u-b");

  assert.throws(()=>m.submitAttendance("u-a"),/ATTENDANCE_NOT_CURRENT_OWNER/);
  const attendance=m.submitAttendance("u-b");
  const attendanceRetry=m.submitAttendance("u-b");
  assert.equal(attendance.user_id,"u-b");
  assert.equal(attendance.schedule_id,m.scheduleId);
  assert.equal(attendanceRetry.already_submitted,true);
  assert.equal(m.state.attendance.size,1);

  assert.throws(()=>m.readRole("MANAGER","store-x"),/STORE_NOT_ALLOWED/);
  assert.throws(()=>m.readRole("OWNER","store-x"),/STORE_NOT_ALLOWED/);
});
