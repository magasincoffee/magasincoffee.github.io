import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
 const failures=[];
 page.on('pageerror',e=>failures.push(String(e)));
 await page.goto(base+'/09_QA/people-shift/workforce-rules-p1-fixture.html?auto-preview&global-533',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Đề xuất xếp lịch',exact:true}).click();
 await page.getByRole('dialog',{name:/bốn chi nhánh/}).waitFor();
 const status=page.locator('[data-global-status]');
 await status.filter({hasText:'Phạm vi: cả 4 chi nhánh'}).waitFor();
 const before=await page.evaluate(()=>window.__WORKFORCE_RULES_QA.calls.map(c=>c.name));
 assert.ok(before.includes('get_workforce_global_week_snapshot_533'));
 assert.ok(!before.includes('auto_generate_cross_store_schedule_533'));
 assert.ok(!before.includes('apply_schedule_v2_auto_proposals_533'),
   'global route must not call store-scoped V2 writer');
 const trigger=page.locator('[data-global-apply]');
 assert.equal(await trigger.isEnabled(),true);
 page.once('dialog',dialog=>dialog.accept());
 await trigger.click();
 await status.filter({hasText:'Đã tạo lịch NHÁP cho 4 chi nhánh'}).waitFor();
 const after=await page.evaluate(()=>{
  const q=window.__WORKFORCE_RULES_QA;
  return {calls:q.calls,assignments:q.assignments};
 });
 const writes=after.calls.filter(c=>c.name==='auto_generate_cross_store_schedule_533');
 assert.equal(writes.length,1,'one global transaction call only');
 assert.equal(writes[0].args.p_confirmed,true);
 assert.equal(writes[0].args.p_expected_fingerprint,'a'.repeat(32));
 assert.equal(writes[0].args.p_week_start,'2026-10-26');
 assert.equal(after.calls.some(c=>/publish_schedule|review_schedule/.test(c.name)),false);
 assert.equal(after.calls.some(c=>c.name==='apply_schedule_v2_auto_proposals_533'),false);
 assert.deepEqual(failures,[],'no JavaScript errors in global route');
 await page.goto(base+'/09_QA/people-shift/workforce-rules-p1-fixture.html?auto-preview&global-533&locked',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Đề xuất xếp lịch',exact:true}).click();
 await page.locator('[data-global-status]').filter({hasText:'PUBLISHED_OR_REVIEWED_WEEK_LOCKED'}).waitFor();
 assert.equal(await page.locator('[data-global-apply]').isEnabled(),false);
 console.log('SCHEDULING_533_GLOBAL_MANAGER_BROWSER=PASS (4 stores, confirmation, one writer, reviewed lock)');
}finally{await browser.close();}
