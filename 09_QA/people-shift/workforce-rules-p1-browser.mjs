import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const OUT=process.env.QA_OUT||'qa-artifacts/people-shift';
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1365,height:900},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'});
 const pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(String(e)));
 await page.goto(BASE+'/09_QA/people-shift/workforce-rules-p1-fixture.html?auto-preview',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Đề xuất xếp lịch'}).click();
 await page.locator('[data-autostatus]').filter({hasText:'Thêm 1 ca; loại 0 ca'}).waitFor();
 const previewText=await page.locator('[data-summary]').innerText();
 assert.match(previewText,/Ưu tiên Full-time trước Part-time/,'draft preview must explain FT before PT');
 assert.match(previewText,/Thứ tự đăng ký sớm nhất chưa được xác minh/,'same-category registration order must remain visible as unverified');
 assert.match(previewText,/Thiếu người chỉ là cảnh báo|Không còn thiếu người/,'coverage warning must remain visible too');
 const qa=await page.evaluate(async()=>{
  const plan=window.MAGASIN_SCHEDULING_V2_STORE_PLANNER;
  const weeks=['2026-10-26','2026-11-02','2026-11-09'];
  const projections=[];
  for(const weekStart of weeks){
    const r=await plan.preview({storeId:'store-one',weekStart});
    projections.push({weekStart,proposed:r.proposals.map(p=>({
      user_id:p.user_id,start_time:p.start_time,end_time:p.end_time,work_date:p.work_date
    })),priorityStatus:r.priorityStatus,registrationOrderStatus:r.registrationOrderStatus});
  }
  return {projections,calls:window.__WORKFORCE_RULES_QA.calls.map(c=>c.name)};
 });
 assert.equal(qa.projections.length,3);
 for(const week of qa.projections){
  assert.equal(week.proposed.length,1,'recurring demand persists across unmodified weeks');
  assert.equal(week.proposed[0].user_id,'ft-one','FULL_TIME outranks PART_TIME even if PT availability=PREFERRED');
  assert.equal(week.proposed[0].start_time,'08:00');
  assert.equal(week.proposed[0].end_time,'12:00');
  assert.equal(week.proposed[0].work_date,week.weekStart);
  assert.equal(week.priorityStatus,'FT_FIRST_PT_SECOND');
  assert.equal(week.registrationOrderStatus,'NOT_VERIFIED_MISSING_TIMESTAMP');
 }
 assert.ok(!qa.calls.some(x=>/publish|review|replace|create/.test(x)),'viewing weeks must be read only');
 const btn=page.locator('[data-apply]');
 assert.equal(await btn.isEnabled(),true);
 await page.screenshot({path:path.join(OUT,'workforce-rules-p1-preview.png'),fullPage:true});
 page.once('dialog',d=>d.accept());
 await btn.click();
 await page.locator('[data-autostatus]').filter({hasText:'Đã loại 0 ca cũ và thêm 1 ca'}).waitFor({timeout:15000});
 const after=await page.evaluate(()=>({
  assignments:window.__WORKFORCE_RULES_QA.assignments,
  rpc:window.__WORKFORCE_RULES_QA.calls.map(x=>x.name)
 }));
 assert.equal(after.assignments.length,1);
 assert.equal(after.assignments[0].user_id,'ft-one');
 assert.equal(after.assignments[0].status,'DRAFT');
 assert.ok(after.rpc.includes('apply_schedule_v2_auto_proposals_532'));
 assert.ok(!after.rpc.includes('replace_schedule_generation_assignments'));
 assert.ok(!after.rpc.includes('review_schedule_generation')&&!after.rpc.includes('publish_schedule_generation'),
  'automation is not allowed to review or publish');
 assert.deepEqual(pageErrors,[],'no page JavaScript runtime exceptions');
 await page.goto(BASE+'/09_QA/people-shift/workforce-rules-p1-fixture.html?auto-preview&verified',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Đề xuất xếp lịch'}).click();
 await page.locator('[data-autostatus]').filter({hasText:'Thêm 1 ca; loại 0 ca'}).waitFor();
 const verifiedPreview=await page.locator('[data-summary]').innerText();
 assert.match(verifiedPreview,/thời điểm tạo đăng ký do máy chủ xác thực/,'verified server timestamp status must be visible');
 assert.doesNotMatch(verifiedPreview,/Thứ tự đăng ký sớm nhất chưa được xác minh/);
 const verifiedResult=await page.evaluate(()=>window.MAGASIN_SCHEDULING_V2_STORE_PLANNER.preview({storeId:'store-one',weekStart:'2026-10-26'}));
 assert.equal(verifiedResult.registrationOrderStatus,'VERIFIED_CREATED_AT');
 assert.equal(verifiedResult.proposals[0]?.user_id,'ft-one','PREFERRED outranks earlier registration timestamp within the same FT group (#533 rule 8 before rule 9)');
 assert.equal((await page.evaluate(()=>window.__WORKFORCE_RULES_QA.assignments)).length,0,'timestamp browser verification does not publish or write drafts');
 assert.deepEqual(pageErrors,[],'verified branch has no page JS exceptions');
 console.log('WORKFORCE_20261020_P1_BROWSER_E2E=PASS (3 weeks FT/PT; server-timestamp verified+unverified fallback; draft only; zero publish)');
 await page.close();
}finally{await browser.close()}
