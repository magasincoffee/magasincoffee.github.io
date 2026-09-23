import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("SCHED-04 keeps exactly one canonical Manager scheduling writer surface",async()=>{
  const [draft,engine,legacy]=await Promise.all([
    read("05_MANAGER/Workforce/draft-publish-v1.js"),
    read("05_MANAGER/Workforce/engine-v1.js"),
    read("05_MANAGER/Lich-lam/index.html")
  ]);
  for(const rpc of [
    "get_manager_accessible_stores",
    "get_manager_weekly_availability",
    "list_schedule_generations",
    "create_schedule_generation",
    "get_schedule_generation_assignments",
    "replace_schedule_generation_assignments",
    "validate_schedule_generation_v1",
    "review_schedule_generation",
    "publish_schedule_generation",
    "get_manager_weekly_schedule"
  ]) assert.match(draft,new RegExp(rpc),rpc);
  assert.doesNotMatch(draft,/auto_generate_schedule_generation|get_workforce_staffing_requirements/);
  assert.doesNotMatch(draft,/\.from\(/);
  assert.match(engine,/draft-publish-v1\.js\?v=20260924-sched04/);
  assert.match(legacy,/manager-runtime-v1\.html\?v=20260924-sched04#workforce/);
  assert.doesNotMatch(legacy,/publish_schedule_generation|replace_schedule_generation_assignments|create_schedule_generation/);
});

test("SCHED-04 active generation reload covers DRAFT REVIEWED PUBLISHED and published truth is server-read",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(draft,/\['DRAFT','REVIEWED','PUBLISHED'\]/);
  assert.match(draft,/state\.generationStatus=String\(run\.status\|\|'DRAFT'\)\.toUpperCase\(\)/);
  assert.match(draft,/if\(state\.generationStatus==='PUBLISHED'\)await loadOfficialRows\(\)/);
  assert.match(draft,/client\(\)\.rpc\('get_manager_weekly_schedule'/);
  assert.match(draft,/String\(r\.status\|\|'APPROVED'\)\.toUpperCase\(\)==='APPROVED'/);
});

test("SCHED-04 UX distinguishes availability draft validation review and official publish",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  for(const label of ["Availability","Bản nháp","Kiểm tra","Duyệt","Phát hành"])assert.match(draft,new RegExp(label),label);
  assert.match(draft,/Availability là dữ liệu đầu vào; chỉ lịch đã phát hành mới là lịch làm chính thức/);
  assert.match(draft,/Không hiển thị ID kỹ thuật/);
  assert.match(draft,/Mở lịch chính thức/);
  assert.doesNotMatch(draft,/Generation \$\{esc\(state\.generationId/);
});

test("SCHED-04 keeps server-side conflict and idempotency semantics explicit",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  for(const code of [
    "GENERATION_VERSION_CONFLICT",
    "ASSIGNMENT_OVERLAP",
    "MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY",
    "EMPLOYEE_INACTIVE",
    "EMPLOYEE_NOT_STAFF",
    "STORE_NOT_ALLOWED",
    "AVAILABILITY_MISMATCH",
    "OFFICIAL_SCHEDULE_OVERLAP"
  ]) assert.match(draft,new RegExp(code),code);
  assert.match(draft,/already_reviewed/);
  assert.match(draft,/already_published/);
  assert.match(draft,/await loadOfficialRows\(\)/);
});

test("SCHED-04 Manager shell no longer contains fake schedule truth",async()=>{
  const shell=await read("05_MANAGER/runtime/manager-shell-v1.html");
  assert.match(shell,/Đang tải bảng xếp lịch canonical/);
  assert.match(shell,/Đang tải lịch làm chính thức từ server/);
  assert.doesNotMatch(shell,/Trắng · CN2|Mai Chi · CN2|Coverage<\/b><span>96%/);
});
