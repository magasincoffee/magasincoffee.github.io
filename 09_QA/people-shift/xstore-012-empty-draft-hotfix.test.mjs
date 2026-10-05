import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const auto=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const migration=read("07_DATABASE/migrations/20261004173000_xstore_012_empty_draft_validation_guard_v1.sql");
const publishGate=read("07_DATABASE/migrations/20260921171458_task_094_schedule_validation_publish_gate_v1.sql");

test("XSTORE-012 master exposes persisted global draft count to guided workflow",()=>{
 assert.match(master,/globalDraftCount=plan\.filter/);
 assert.match(master,/globalOfficialCount=plan\.filter/);
 assert.match(master,/magasin:xstore-master-rendered[\s\S]*globalDraftCount,globalOfficialCount/);
});

test("XSTORE-012 empty DRAFT returns to automatic schedule generation",()=>{
 assert.match(auto,/globalDraftCount:null/);
 assert.match(auto,/stage==='DRAFT'&&globalDraftCount===0/);
 assert.match(auto,/action:'auto',label:'Tạo lịch nháp tự động',title:'Bản nháp đang rỗng'/);
 assert.match(auto,/state\.globalDraftCount=Number\(detail\.globalDraftCount\|\|0\)/);
 assert.match(auto,/state\.assignmentCount=state\.globalDraftCount/);
});

test("XSTORE-012 browser controls fail closed when selected generation has zero assignments",()=>{
 assert.match(draft,/stage==='DRAFT'&&state\.assignments\.length===0/);
 assert.match(draft,/Lịch nháp chưa có ca nào\. Hãy tạo lịch nháp tự động trước khi kiểm tra/);
 assert.match(draft,/Không thể duyệt lịch rỗng/);
 assert.match(draft,/Không thể phát hành lịch rỗng/);
 assert.match(draft,/id="msdValidate"[\s\S]*state\.assignments\.length===0/);
 assert.match(draft,/id="msdReview"[\s\S]*state\.assignments\.length>0/);
 assert.match(draft,/id="msdPublish"[\s\S]*state\.assignments\.length>0/);
});

test("XSTORE-012 server validator rejects zero-assignment generations",()=>{
 assert.match(migration,/create or replace function public\.validate_schedule_generation_v1/);
 assert.match(migration,/not exists\([\s\S]*from public\.schedule_generation_assignments empty_guard[\s\S]*empty_guard\.generation_id=p_generation_id/);
 assert.match(migration,/jsonb_build_object\('code','EMPTY_GENERATION'\)/);
 assert.match(migration,/revoke execute on function public\.validate_schedule_generation_v1\(uuid\) from public,anon/);
 assert.match(migration,/grant execute on function public\.validate_schedule_generation_v1\(uuid\) to authenticated/);
});

test("XSTORE-012 backend guard automatically protects review and publish",()=>{
 assert.match(publishGate,/review_schedule_generation[\s\S]*validate_schedule_generation_v1\(p_generation_id\)/);
 assert.match(publishGate,/publish_schedule_generation[\s\S]*validate_schedule_generation_v1\(p_generation_id\)/);
});

test("XSTORE-012 cache lineage remains intact while newer scheduling IA revisions may advance",()=>{
 assert.match(engine,/draft-publish-v1\.js\?v=(?:20261004-xstore-015|20261004-xstore-016|20261005-xstore-017|20261005-xstore-018)/);
 assert.match(engine,/cross-store-master-v1\.js\?v=(?:20261004-xstore-012|20261004-xstore-016)/);
 assert.match(engine,/cross-store-auto-schedule-v1\.js\?v=(?:20261004-xstore-012|20261005-xstore-017)/,"cross-store-auto-schedule-v1.js");
});

console.log("XSTORE_012_EMPTY_DRAFT_HOTFIX=PASS");
