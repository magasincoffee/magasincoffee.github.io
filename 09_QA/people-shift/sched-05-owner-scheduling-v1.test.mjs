import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("SCHED-05 Owner runtime reuses the canonical Manager scheduling writer",async()=>{
  const [runtime,index]=await Promise.all([
    read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html"),
    read("04_OWNER/Workforce/index.html")
  ]);
  assert.match(runtime,/__MAGASIN_SCHEDULING_ACTOR__='OWNER'/);
  assert.match(runtime,/manager-context-v1\.js\?v=20260929-mer003/);
  assert.match(runtime,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js\?v=(?:20260924-sched05|20260928-xstore005|20260929-mer003|20261003-sched-ui-008|20261005-xstore-019)/);
  assert.doesNotMatch(runtime,/\/04_OWNER\/Workforce\/01-demand\/engine-v1\.js/);
  assert.doesNotMatch(runtime,/\/04_OWNER\/Workforce\/02-review\/engine-v1\.js/);
  assert.doesNotMatch(runtime,/\/04_OWNER\/Workforce\/03-publish\/engine-v1\.js/);
  assert.match(runtime,/owner-scheduling-overview-v1\.js\?v=(?:20261003-sched-ui-008|20261005-xstore-019)/);
  assert.doesNotMatch(runtime,/cross-store-master-v1\.js/);
  assert.match(runtime,/Lập lịch tuần/);
  assert.doesNotMatch(runtime,/Enterprise oversight|One canonical writer|No direct table DML|Availability/);
  assert.match(index,/owner-workforce-runtime\.html\?v=(?:20261003-sched-ui-008|20261005-xstore-019)/);
});

test("SCHED-05 legacy Owner publish engine is compatibility-only and has zero mutation implementation",async()=>{
  const legacy=await read("04_OWNER/Workforce/03-publish/engine-v1.js");
  assert.match(legacy,/compatibility wrapper/);
  assert.match(legacy,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js\?v=(?:20260924-sched05|20260928-xstore005|20260929-mer003|20261005-xstore-019)/);
  for(const forbidden of [
    "auto_generate_schedule_generation",
    "create_schedule_generation",
    "replace_schedule_generation_assignments",
    "validate_schedule_generation_v1",
    "review_schedule_generation",
    "publish_schedule_generation",
    "get_manager_weekly_schedule"
  ]) assert.doesNotMatch(legacy,new RegExp(forbidden),forbidden);
});

test("SCHED-05 deprecated Owner demand/review engines are not active runtime authority",async()=>{
  const [runtime,demand,review,lock]=await Promise.all([
    read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html"),
    read("04_OWNER/Workforce/01-demand/engine-v1.js"),
    read("04_OWNER/Workforce/02-review/engine-v1.js"),
    read("07_DATABASE/migrations/20260923163337_sched_02_three_role_scheduling_authority_lock_v1.sql")
  ]);
  assert.match(demand,/upsert_workforce_staffing_requirement/);
  assert.match(review,/manager_update_employee_availability/);
  assert.doesNotMatch(runtime,/upsert_workforce_staffing_requirement|manager_update_employee_availability|create_store_transfer_request|review_store_transfer_request/);
  for(const fn of [
    "auto_generate_schedule_generation",
    "upsert_workforce_staffing_requirement",
    "delete_workforce_staffing_requirement",
    "manager_update_employee_availability",
    "create_store_transfer_request",
    "review_store_transfer_request"
  ]) assert.match(lock,new RegExp(fn),fn);
});

test("SCHED-05 shared writer is role-aware but retains one canonical RPC set",async()=>{
  const writer=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(writer,/actorRole=\(\)=>String\(window\.__MAGASIN_SCHEDULING_ACTOR__/);
  assert.match(writer,/Giám sát xếp lịch/);
  assert.match(writer,/không tạo lịch song song/);
  for(const rpc of [
    "get_manager_weekly_availability",
    "list_schedule_generations",
    "create_schedule_generation",
    "get_schedule_generation_assignments",
    "replace_schedule_generation_assignments",
    "validate_schedule_generation_v1",
    "review_schedule_generation",
    "publish_schedule_generation",
    "get_manager_weekly_schedule"
  ]) assert.match(writer,new RegExp(rpc),rpc);
  assert.doesNotMatch(writer,/auto_generate_schedule_generation/);
  assert.match(writer,/MAGASIN_MANAGER_WORKFORCE_CONTEXT/);
  assert.doesNotMatch(writer,/client\(\)\.from\(|sb\.from\(|supabase[^\n]*\.from\(/);
});

test("SCHED-05 store/week changes clear stale projections before server reload",async()=>{
  const writer=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(writer,/function resetBranchProjection\(\)[\s\S]*state\.assignments=\[\];state\.availability=\[\];state\.eligibleEmployees=\[\]/);
  assert.match(writer,/state\.requirements=\[\];state\.shortages=\[\];state\.shortageSource='NONE';state\.supplementTarget=null/);
  assert.match(writer,/state\.officialRows=\[\];state\.lastValidation=null;state\.dirty=false/);
  assert.match(writer,/resetBranchProjection\(\);render\(\);status\('Đang tải lịch của chi nhánh đã mở/);
  assert.match(writer,/Đang tải dữ liệu tuần đã chọn/);
  assert.match(writer,/function officialRowsHtml\(\)/);
  assert.match(writer,/dữ liệu đã phát hành|lịch làm chính thức/i);
});

test("SCHED-05 OLD NEW inventory explicitly deprecates Owner parallel mutation UI",async()=>{
  const readme=await read("04_OWNER/Workforce/README.md");
  assert.match(readme,/03-publish\/engine-v1\.js.*WRAP \/ DEPRECATE/s);
  assert.match(readme,/02-review\/engine-v1\.js.*DEPRECATE ACTIVE UI/s);
  assert.match(readme,/01-demand\/engine-v1\.js.*DEPRECATE ACTIVE UI/s);
  assert.match(readme,/draft-publish-v1\.js.*REUSE/s);
  assert.match(readme,/single official\/current assignment truth/);
});
