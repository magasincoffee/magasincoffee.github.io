import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const auto=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const fixture=read("09_QA/people-shift/manager-workforce-canonical-fixture.html");

test("XSTORE-017 reads canonical recurring requirements and bounded server shortages",()=>{
  assert.match(draft,/list_workforce_recurring_staffing_requirements_v1/);
  assert.match(draft,/list_cross_store_staffing_shortages_v1/);
  assert.match(draft,/p_week_start:state\.week/);
  assert.match(draft,/shortageSource='SERVER'/);
  assert.match(fixture,/list_cross_store_staffing_shortages_v1/);
});

test("XSTORE-017 recalculates exact shortage intervals locally while DRAFT is dirty",()=>{
  assert.match(draft,/function recalculateShortagesLocal\(\)/);
  assert.match(draft,/count|new Set/);
  assert.match(draft,/missing_headcount:target-assigned/);
  assert.match(draft,/state\.shortageSource='LOCAL'/);
  assert.match(draft,/recalculateShortagesLocal\(\);render\(\)/);
});

test("XSTORE-017 renders accessible inline shortage cards in exact calendar cells",()=>{
  assert.match(draft,/data-msd-date/);
  assert.match(draft,/msd-shortage-card/);
  assert.match(draft,/msd-shortage-icon/);
  assert.match(draft,/Thiếu .* người/);
  assert.match(draft,/data-msd-supplement/);
  assert.match(draft,/\+ Bổ sung người/);
  assert.match(draft,/aria-label="Thiếu nhân sự/);
  assert.match(draft,/#8b5cf6/i);
  assert.match(draft,/#f3efff/i);
});

test("XSTORE-017 supplement action prefills the existing manual picker without inventing a second writer",()=>{
  assert.match(draft,/function openSupplement\(index\)/);
  assert.match(draft,/supplementTarget/);
  assert.match(draft,/selectedDate=target\?\.work_date/);
  assert.match(draft,/selectedStart=hm\(target\?\.shortage_start/);
  assert.match(draft,/selectedEnd=hm\(target\?\.shortage_end/);
  assert.match(draft,/replace_schedule_generation_assignments/);
  assert.doesNotMatch(draft,/insert\s+into\s+work_schedules/i);
});

test("XSTORE-017 removes the duplicate detailed shortage list from Auto Schedule",()=>{
  assert.match(auto,/Mở chi nhánh tương ứng bên dưới để xem shortage ngay trong ô ngày\/giờ/);
  assert.doesNotMatch(auto,/state\.shortages\.slice\(0,12\)\.map/);
});

test("XSTORE-017 cache chain points at inline-shortage runtime",()=>{
  assert.ok(engine.includes("draft-publish-v1.js?v=20261005-xstore-017"));
  assert.ok(engine.includes("cross-store-auto-schedule-v1.js?v=20261005-xstore-017"));
});

console.log("XSTORE_017_INLINE_SHORTAGE_STATIC=PASS");
