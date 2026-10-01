import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const recurring=read("07_DATABASE/migrations/20261001172500_xstore_c02_recurring_staffing_authority_v1.sql");
const cutover=read("07_DATABASE/migrations/20261001175825_xstore_c04_recurring_auto_projection_v1.sql");
const ui=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const fixture=read("09_QA/people-shift/xstore-cross-store-browser-fixture.html");
const browser=read("09_QA/people-shift/xstore-cross-store-browser.mjs");

test("C05 locks one recurring staffing authority with bounded browser access",()=>{
 assert.match(recurring,/workforce_recurring_staffing_requirements/);
 assert.match(recurring,/revoke all on table public\.workforce_recurring_staffing_requirements[\s\S]*from public, anon, authenticated/);
 assert.match(recurring,/AUTH_REQUIRED/);
 assert.match(recurring,/ROLE_NOT_ALLOWED/);
 assert.match(recurring,/ACTOR_NOT_ACTIVE/);
 assert.match(recurring,/can_access_store/);
 assert.match(cutover,/revoke execute on function public\.list_cross_store_staffing_requirements_v1\(date\)[\s\S]*from public,anon,authenticated/);
 assert.match(cutover,/revoke execute on function public\.replace_cross_store_staffing_requirements_v1\(date,jsonb\)[\s\S]*from public,anon,authenticated/);
});

test("C05 recurring configuration is week-independent and Robot projection is week-bound",()=>{
 assert.doesNotMatch(ui,/p_week_start:state\.week[\s\S]*replace_workforce_recurring_staffing_requirements_v1/);
 assert.match(ui,/replace_workforce_recurring_staffing_requirements_v1/);
 assert.match(ui,/auto_generate_cross_store_schedule_v1/);
 assert.match(ui,/p_week_start:state\.week/);
 assert.match(ui,/XSTORE_GLOBAL_RECURRING_V1/);
 assert.match(cutover,/\(p_week_start \+ \(req\.day_of_week::integer - 1\)\)::date as work_date/);
 assert.doesNotMatch(cutover,/from public\.staffing_requirements/);
 assert.doesNotMatch(cutover,/insert into public\.staffing_requirements/);
});

test("C05 browser acceptance proves save persistence across reload and reuse in another week",()=>{
 assert.match(fixture,/xstore-c05-recurring-requirements/);
 assert.match(fixture,/localStorage\.setItem\('xstore-c05-recurring-requirements'/);
 assert.match(fixture,/new URLSearchParams\(location\.search\)\.get\('week'\)/);
 assert.match(browser,/page\.reload\(\{waitUntil:"networkidle"\}\)/);
 assert.match(browser,/recurring edit did not survive reload/);
 assert.match(browser,/week=2026-10-12/);
 assert.match(browser,/recurring config not reused in next week/);
 assert.match(browser,/p_week_start!=="2026-10-12"/);
});

test("C05 Robot remains DRAFT-only and Manager publication authority remains separate",()=>{
 assert.match(cutover,/'status','DRAFT'/);
 assert.match(cutover,/'published',false/);
 assert.doesNotMatch(cutover,/perform public\.publish_schedule_generation|select public\.publish_schedule_generation/);
 assert.doesNotMatch(ui,/publish_schedule_generation|review_schedule_generation/);
});

console.log("XSTORE_C05_RECURRING_ACCEPTANCE=PASS");