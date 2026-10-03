import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT=process.cwd();
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");

test("SCHED-UI-008 Owner scheduling is overview-first and reuses shared scheduling detail",()=>{
  const entry=read("04_OWNER/Workforce/index.html");
  const runtime=read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");
  const overview=read("04_OWNER/Workforce/owner-scheduling-overview-v1.js");

  assert.match(entry,/owner-workforce-runtime\.html\?v=20261003-sched-ui-008/);
  assert.match(runtime,/draft-publish-v1\.js\?v=20261003-sched-ui-008/);
  assert.match(runtime,/owner-scheduling-overview-v1\.js\?v=20261003-sched-ui-008/);
  assert.doesNotMatch(runtime,/cross-store-master-v1\.js/);

  assert.match(overview,/Tổng quan xếp lịch/);
  assert.match(overview,/data-owner-store-open/);
  assert.match(overview,/get_manager_weekly_availability/);
  assert.match(overview,/list_schedule_generations/);
  assert.match(overview,/MAGASIN_MANAGER_SCHEDULE_DRAFT\?\.openDirect/);
  assert.match(overview,/Sẵn sàng xếp lịch/);
  assert.match(overview,/Đang xếp lịch/);
  assert.match(overview,/Đã duyệt/);
  assert.match(overview,/Đã phát hành/);

  assert.doesNotMatch(overview,/\.from\s*\(/);
  for(const mutation of [
    "create_schedule_generation",
    "replace_schedule_generation_assignments",
    "validate_schedule_generation_v1",
    "review_schedule_generation",
    "publish_schedule_generation",
    "upsert_workforce_staffing_requirement",
    "manager_update_employee_availability"
  ]) assert.doesNotMatch(overview,new RegExp(mutation));
});

test("SCHED-UI-008 Owner normal UI copy removes implementation language",()=>{
  const visibleHtml=p=>read(p)
    .replace(/<script\b[\s\S]*?<\/script>/gi,"")
    .replace(/<style\b[\s\S]*?<\/style>/gi,"");
  const files=[
    visibleHtml("04_OWNER/index.html"),
    visibleHtml("04_OWNER/Workforce/index.html"),
    visibleHtml("04_OWNER/Workforce/runtime/owner-workforce-runtime.html"),
    read("04_OWNER/Workforce/owner-scheduling-overview-v1.js")
  ].join("\n");

  for(const forbidden of [
    "Enterprise oversight",
    "canonical",
    "direct table DML",
    "DRAFT → Validate → Review → Publish",
    "Availability",
    "NOT CONNECTED",
    "Freshness",
    "quality semantics"
  ]) assert.equal(files.includes(forbidden),false,forbidden+" must not be normal Owner-facing copy");
});

test("SCHED-UI-008 shared Owner detail keeps the Manager scheduling authority",()=>{
  const writer=read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(writer,/actorRole\(\)==='OWNER'/);
  assert.match(writer,/create_schedule_generation/);
  assert.match(writer,/replace_schedule_generation_assignments/);
  assert.match(writer,/validate_schedule_generation_v1/);
  assert.match(writer,/review_schedule_generation/);
  assert.match(writer,/publish_schedule_generation/);
  assert.match(writer,/document\.addEventListener\('magasin:owner-schedule-open'/);
});
