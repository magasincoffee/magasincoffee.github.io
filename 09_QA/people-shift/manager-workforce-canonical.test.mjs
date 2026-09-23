import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("Manager runtime owns Workforce through canonical module only",async()=>{
  const runtime=await read("05_MANAGER/runtime/manager-runtime-v1.html");
  assert.match(runtime,/\/05_MANAGER\/Workforce\/engine-v1\.js/);
  const legacy=["manager-workforce-live.js","manager-workforce-review-v2.js","manager-workforce-demand-v4.js","manager-workforce-auto.js","manager-workforce-tabs-v1.js","manager-workforce-day-header-fix-v2.js"];
  for(const file of legacy)assert.equal(runtime.includes(file),false,file);
});

test("Canonical Workforce shell opens scheduling, keeps Demand hidden, and labels Manager as scheduler",async()=>{
  const shell=await read("05_MANAGER/runtime/manager-shell-v1.html");
  assert.match(shell,/Xếp lịch tuần/);
  assert.match(shell,/class="active" data-tab="publish"/);
  assert.match(shell,/data-tab="demand" hidden/);
  assert.match(shell,/Availability của nhân viên → Manager tạo và lưu lịch nháp/);
  assert.doesNotMatch(shell,/Nhu cầu nhân sự, review và phát hành lịch tuần/);
});

test("Manager availability is read-only scheduling input and defaults to next week",async()=>{
  const review=await read("05_MANAGER/Workforce/review-v1.js");
  assert.match(review,/get_manager_weekly_availability/);
  assert.match(review,/get_manager_accessible_stores/);
  assert.match(review,/Asia\/Ho_Chi_Minh/);
  assert.match(review,/targetWeek=\(\)=>add\(monday\(todayVN\(\)\),7\)/);
  assert.match(review,/magasin:manager-schedule-open/);
  assert.doesNotMatch(review,/manager_update_employee_availability/);
  assert.doesNotMatch(review,/auto_generate_schedule_generation/);
  assert.doesNotMatch(review,/get_workforce_staffing_requirements/);
  assert.doesNotMatch(review,/magasin:schedule-robot-request/);
  assert.doesNotMatch(review,/supabase[^\n]*\.from\(|sb\.from\(|client\(\)\.from\(/);
});

test("Manager direct draft creation uses existing permissioned generation primitives without demand or Robot prerequisite",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  for(const rpc of [
    "get_manager_accessible_stores",
    "get_manager_weekly_availability",
    "list_schedule_generations",
    "create_schedule_generation",
    "get_schedule_generation_assignments",
    "replace_schedule_generation_assignments"
  ]) assert.match(draft,new RegExp(rpc),rpc);

  assert.match(draft,/MANAGER_DIRECT_V1/);
  assert.match(draft,/async function startOrResume/);
  assert.match(draft,/async function resumeOnly/);
  assert.doesNotMatch(draft,/auto_generate_schedule_generation/);
  assert.doesNotMatch(draft,/get_workforce_staffing_requirements/);
  assert.doesNotMatch(draft,/magasin:schedule-robot-request/);
  assert.doesNotMatch(draft,/supabase[^\n]*\.from\(|sb\.from\(|client\(\)\.from\(/);
});

test("Direct save only persists DRAFT and does not auto validate review or publish",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  const start=draft.indexOf("async function save()");
  const end=draft.indexOf("async function validate()",start);
  assert.ok(start>=0&&end>start);
  const save=draft.slice(start,end);
  assert.match(save,/replace_schedule_generation_assignments/);
  assert.doesNotMatch(save,/validate_schedule_generation_v1/);
  assert.doesNotMatch(save,/review_schedule_generation/);
  assert.doesNotMatch(save,/publish_schedule_generation/);
  assert.match(save,/Hãy kiểm tra xung đột trước khi duyệt/);
});

test("Manager direct board supports source availability plus add remove edit save and resume",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(draft,/Employee Availability/);
  assert.match(draft,/Lịch đang xếp · Thứ Hai → Chủ Nhật/);
  assert.match(draft,/data-add-av/);
  assert.match(draft,/data-remove/);
  assert.match(draft,/data-f="start_time"/);
  assert.match(draft,/data-f="end_time"/);
  assert.match(draft,/id="msdSave"/);
  assert.match(draft,/listGenerations\(\)/);
  assert.match(draft,/state\.duplicateDrafts/);
});

test("Existing validation review publish hooks remain explicit downstream controls",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  for(const rpc of ["validate_schedule_generation_v1","review_schedule_generation","publish_schedule_generation","get_manager_weekly_schedule"])assert.match(draft,new RegExp(rpc),rpc);
  assert.match(draft,/Sau khi lưu bản nháp: kiểm tra xung đột → duyệt → phát hành/);
});

test("TASK-094 Manager board delegates create/resume and validation idempotency to server primitives",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  const createStart=draft.indexOf("async function startOrResume()");
  const createEnd=draft.indexOf("function sourceHtml()",createStart);
  const create=draft.slice(createStart,createEnd);
  assert.match(create,/create_schedule_generation/);
  assert.match(create,/Đã mở đúng một bản nháp cho cửa hàng và tuần đã chọn/);
  assert.doesNotMatch(create,/if\(drafts\.length\)\{/);

  const resumeStart=draft.indexOf("async function resumeOnly()");
  const resumeEnd=draft.indexOf("async function startOrResume()",resumeStart);
  const resume=draft.slice(resumeStart,resumeEnd);
  assert.match(resume,/runs\.length>1/);
  assert.match(resume,/generationStatus='CONFLICT'/);
  assert.match(resume,/khóa thao tác/);

  assert.match(draft,/MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY/);
  assert.match(draft,/AVAILABILITY_MISMATCH/);
  assert.match(draft,/GENERATION_VERSION_CONFLICT/);
  assert.match(draft,/already_reviewed/);
  assert.match(draft,/already_published/);
  assert.match(draft,/state\.lastValidation=q\.data\?\.valid\?'VALID':'INVALID'/);
});

test("Legacy demand stays isolated from canonical direct scheduling path",async()=>{
  const [demand,engine]=await Promise.all([
    read("05_MANAGER/Workforce/demand-v1.js"),
    read("05_MANAGER/Workforce/engine-v1.js")
  ]);
  assert.match(demand,/get_workforce_staffing_requirements/);
  assert.match(demand,/OWNER_ONLY/);
  assert.doesNotMatch(demand,/replace_schedule_generation_assignments/);
  assert.equal(engine.includes("demand-v1.js"),false,"legacy demand must not load in canonical Manager flow");
  for(const file of ["review-v1.js","draft-publish-v1.js","official-v1.js"])assert.equal(engine.includes(file),true,file);
});

test("Official schedule remains server-read only",async()=>{
  const official=await read("05_MANAGER/Workforce/official-v1.js");
  assert.match(official,/get_manager_weekly_schedule/);
  assert.doesNotMatch(official,/\.from\('work_schedules'\)/);
});

test("Manager deep-links use canonical runtime",async()=>{
  for(const p of ["05_MANAGER/Workforce/index.html","05_MANAGER/Lich-lam/index.html"]){
    const source=await read(p);
    assert.equal(source.includes("shared-core-v1.js"),true);
    assert.equal(source.includes("manager-runtime-v1.html"),true);
    assert.equal(source.includes("manager-v13-runtime.html"),false);
  }
});


test("SCHED-04 reload resumes DRAFT REVIEWED or PUBLISHED through one canonical active generation",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(draft,/async function listGenerations\(\)/);
  assert.match(draft,/\['DRAFT','REVIEWED','PUBLISHED'\]/);
  assert.match(draft,/if\(state\.generationStatus==='PUBLISHED'\)await loadOfficialRows\(\)/);
  assert.match(draft,/get_manager_weekly_schedule/);
  assert.match(draft,/officialRows/);
});

test("SCHED-04 Manager UI hides technical generation identity and raw backend diagnostics",async()=>{
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.doesNotMatch(draft,/Generation \$\{esc\(state\.generationId/);
  assert.match(draft,/Không hiển thị ID kỹ thuật/);
  assert.doesNotMatch(draft,/hit\[1\]\+' \('\+hit\[0\]/);
  assert.match(draft,/Không thể hoàn tất thao tác\. Hãy tải lại dữ liệu và thử lại\./);
});

test("SCHED-04 legacy Lich-lam route wraps canonical Workforce surface only",async()=>{
  const legacy=await read("05_MANAGER/Lich-lam/index.html");
  assert.match(legacy,/manager-runtime-v1\.html\?v=20260924-sched04#workforce/);
  assert.doesNotMatch(legacy,/manager-v13-runtime/);
  assert.doesNotMatch(legacy,/draft-publish-v1\.js/);
});
