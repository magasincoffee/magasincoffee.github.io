import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { workforceWeekIdentity } from "../../02_CORE/shared/workforce-operations-v1.mjs";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("Employee availability has one active owner and shell contains no business RPC logic",async()=>{
  const [runtime,shell,engine]=await Promise.all([
    read("06_EMPLOYEE/runtime/employee-runtime-v1.html"),
    read("06_EMPLOYEE/app/employee-v40.html"),
    read("06_EMPLOYEE/availability/engine-v1.js")
  ]);

  assert.equal((runtime.match(/\/06_EMPLOYEE\/availability\/engine-v1\.js/g)||[]).length,1);
  assert.doesNotMatch(shell,/get_my_availability|save_my_availability|delete_my_availability/);
  assert.match(engine,/get_my_availability/);
  assert.match(engine,/save_my_availability/);
  assert.match(engine,/delete_my_availability/);
  assert.match(engine,/employeeAvailabilityEngine/);
  assert.doesNotMatch(engine,/\.from\(/);
  assert.doesNotMatch(engine,/availability-v2/i);
});

test("Employee availability API exposes read/delete/week/registration policy without a second engine",async()=>{
  const engine=await read("06_EMPLOYEE/availability/engine-v1.js");
  assert.match(engine,/data-av-delete/);
  assert.match(engine,/async function remove\(/);
  assert.match(engine,/getRows:\(\)=>state\.rows\.slice\(\)/);
  assert.match(engine,/getWeek:\(\)=>state\.week/);
  assert.match(engine,/getRegistrationState:\(\)=>state\.registration/);
  assert.match(engine,/getPolicy:\(\)=>/);
});

test("active engine derives target week from canonical Asia-Ho-Chi-Minh date primitives",async()=>{
  const engine=await read("06_EMPLOYEE/availability/engine-v1.js");
  assert.match(engine,/C\.date\.dateKey\?\.\(\)/);
  assert.match(engine,/C\.date\.monday\(today\)/);
  assert.match(engine,/C\.date\.addDays\(currentMonday,7\)/);
  assert.match(engine,/today===sunday\?'REGISTRATION_CLOSED':'REGISTRATION_OPEN'/);
  assert.doesNotMatch(engine,/new Date\(/);
});

test("TASK-091 week helper proves Monday-Saturday open, Sunday closed, rollover and VN midnight",()=>{
  const monday=workforceWeekIdentity("2026-09-21");
  assert.equal(monday.next_week_start,"2026-09-28");
  assert.equal(monday.availability_registration_state,"REGISTRATION_OPEN");

  const saturday=workforceWeekIdentity("2026-09-26");
  assert.equal(saturday.next_week_start,"2026-09-28");
  assert.equal(saturday.availability_registration_state,"REGISTRATION_OPEN");

  const sunday=workforceWeekIdentity("2026-09-27");
  assert.equal(sunday.next_week_start,"2026-09-28");
  assert.equal(sunday.availability_registration_state,"REGISTRATION_CLOSED");

  const nextMonday=workforceWeekIdentity("2026-09-28");
  assert.equal(nextMonday.next_week_start,"2026-10-05");
  assert.equal(nextMonday.availability_registration_state,"REGISTRATION_OPEN");

  const vnMidnight=workforceWeekIdentity("2026-09-27T17:30:00Z");
  assert.equal(vnMidnight.date,"2026-09-28");
  assert.equal(vnMidnight.next_week_start,"2026-10-05");
});

test("write guards reject Sunday, out-of-week date, malformed time and unknown store in the active engine",async()=>{
  const engine=await read("06_EMPLOYEE/availability/engine-v1.js");
  assert.match(engine,/state\.registration!=='REGISTRATION_OPEN'/);
  assert.match(engine,/Ngày đăng ký phải thuộc đúng tuần kế tiếp/);
  assert.match(engine,/TIME_RE\.test/);
  assert.match(engine,/Giờ kết thúc phải sau giờ bắt đầu/);
  assert.match(engine,/Không tìm thấy chi nhánh đang hoạt động/);
  assert.match(engine,/state\.stores\.filter\(s=>s&&s\.id&&s\.code/);
  assert.doesNotMatch(engine,/STORE_CODES/);
});

test("save/delete are UI-bounded against duplicate in-flight mutations and reload never auto-resubmits",async()=>{
  const engine=await read("06_EMPLOYEE/availability/engine-v1.js");
  assert.match(engine,/savePending/);
  assert.match(engine,/deletePending:new Set\(\)/);
  assert.match(engine,/if\(state\.savePending\)/);
  assert.match(engine,/state\.deletePending\.has\(key\)/);
  assert.match(engine,/await load\(\)/);
  assert.doesNotMatch(engine,/setInterval|setTimeout\([^)]*save_my_availability/i);
});

test("Manager availability reader uses the same Monday week identity and exact seven-day range",async()=>{
  const sql=await read("07_DATABASE/migrations/20260902070000_get_manager_weekly_availability_v1.sql");
  assert.match(sql,/Asia\/Ho_Chi_Minh/);
  assert.match(sql,/extract\(isodow from v_week_start\) <> 1/);
  assert.match(sql,/WEEK_START_MUST_BE_MONDAY/);
  assert.match(sql,/ea\.work_date between v_week_start and v_week_start \+ 6/);
  assert.match(sql,/p\.status = 'ACTIVE'/);
  assert.match(sql,/can_access_store/);
});

test("availability remains capability input rather than official schedule assignment",async()=>{
  const [engine,contract]=await Promise.all([
    read("06_EMPLOYEE/availability/engine-v1.js"),
    read("02_CORE/contracts/workforce-operations-v1.json")
  ]);
  assert.doesNotMatch(engine,/publish_schedule_generation|work_schedules|schedule_generation/);
  const c=JSON.parse(contract);
  assert.equal(c.invariants.find(x=>x.id==="WF-INV-001")?.rule,"AVAILABILITY_IS_CAPABILITY_NOT_OFFICIAL_ASSIGNMENT");
});
