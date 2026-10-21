import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const OUT=process.env.QA_OUT||'qa-artifacts/people-shift';
fs.mkdirSync(OUT,{recursive:true});
const fixture=fs.readFileSync('09_QA/people-shift/manager-demand-vn-fixture.html','utf8');
const browser=await chromium.launch({headless:true});
const logs=[];
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:920},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
  page.on('pageerror',e=>logs.push(String(e)));
  await page.route('**/manager/scheduling/?qa=fixture*',route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient(){throw Error("QA_SECOND_CLIENT_NOT_ALLOWED")}}'}));
  await page.goto(BASE+'/manager/scheduling/?qa=fixture',{waitUntil:'domcontentloaded'});
  const frame=page.frameLocator('#app');
  await frame.locator('#sv2DemandStore:not([disabled])').waitFor({timeout:18000});
  await frame.locator('#sv2DemandRows tr').first().locator('input').first().waitFor();
  const state=await page.evaluate(()=>{
   const doc=document.getElementById('app').contentDocument;
   const select=id=>doc.getElementById(id);
   return {
    parentReads:window.__QA_DEMAND.parentClientReads,
    stores:[...select('sv2DemandStore').options].map(o=>({id:o.value,text:o.textContent})),
    start:[...select('sv2BandStart').options].map(o=>o.value),
    end:[...select('sv2BandEnd').options].map(o=>o.value),
    timeInputCount:doc.querySelectorAll('input[type=time]').length,
    addDisabled:select('sv2AddBand').disabled,
    currentStatus:select('sv2DemandStatus').textContent,
    rows:select('sv2DemandRows').querySelectorAll('tr').length,
    scroll:doc.documentElement.scrollWidth,
    client:doc.documentElement.clientWidth,
    shell:doc.documentElement.dataset.sv2ManagerHost
   };
  });
  assert.ok(state.parentReads>0,'editor must reuse signed-in parent client');
  assert.deepEqual(state.stores.map(x=>x.id),[A,B],'only authorized stores');
  assert.equal(state.start.length,34);
  assert.equal(state.end.length,34);
  assert.equal(state.start[0],'05:00');assert.equal(state.start.at(-1),'21:30');
  assert.equal(state.end[0],'05:30');assert.equal(state.end.at(-1),'22:00');
  assert.equal(state.timeInputCount,0,'browser locale-dependent 12h time inputs must be gone');
  assert.equal(state.addDisabled,false);
  assert.equal(state.rows,1);
  assert.equal(state.shell,'shared','child sidebar must remain hidden under canonical host');
  assert.ok(state.scroll<=state.client+1,'no editor document horizontal overflow '+width);
  const start=frame.locator('#sv2BandStart');
  const end=frame.locator('#sv2BandEnd');
  await start.selectOption('14:30');
  await end.selectOption('16:00');
  await frame.locator('#sv2AddBand').click();
  const tr=frame.locator('#sv2DemandRows tr').filter({hasText:'14:30–16:00'});
  assert.equal(await tr.count(),1,'new half-hour-aligned band added');
  await tr.locator('input').nth(0).fill('3');
  assert.equal(await frame.locator('#sv2DemandSave').isEnabled(),true);
  page.on('dialog',d=>d.accept());
  await frame.locator('#sv2DemandSave').click();
  await frame.locator('#sv2DemandStatus').filter({hasText:'Đã lưu nhu cầu nhân sự'}).waitFor();
  const write=await page.evaluate(()=>window.__QA_DEMAND.writes.at(-1));
  assert.ok(write.some(x=>x.store_id===B&&x.target_headcount===4),'other store is preserved');
  assert.ok(write.some(x=>x.store_id===A&&x.start_time==='06:00'&&x.target_headcount===2),'prior selected store row retained');
  assert.ok(write.some(x=>x.store_id===A&&x.start_time==='14:30'&&x.end_time==='16:00'&&x.day_of_week===1&&x.target_headcount===3),'new Vietnamese 24h row persists');
  await page.screenshot({path:path.join(OUT,'manager-demand-vn-'+width+'px.png'),fullPage:true});
  await page.close();
 }
 // Bounded errors must produce a visible retry instead of an infinite spinner.
 const page=await browser.newPage({locale:'vi-VN'});
 page.on('pageerror',e=>logs.push(String(e)));
 await page.route('**/manager/scheduling/?qa=fixture*',route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient(){throw Error("QA_SECOND_CLIENT_NOT_ALLOWED")}}'}));
 await page.goto(BASE+'/manager/scheduling/?qa=fixture&fail=yes',{waitUntil:'domcontentloaded'});
 const frame=page.frameLocator('#app');
 await frame.locator('#sv2DemandRetry:visible').waitFor({timeout:18000});
 assert.match(await frame.locator('#sv2DemandStatus').textContent(),/QA_LIST_UNAVAILABLE/);
 assert.equal(await frame.locator('#sv2AddBand').isEnabled(),false,'cannot edit data after failed load');
 await page.evaluate(()=>{window.__QA_DEMAND.fail=false});
 await frame.locator('#sv2DemandRetry').click();
 await frame.locator('#sv2DemandStore:not([disabled])').waitFor();
 assert.equal(await frame.locator('#sv2DemandStore option').count(),2);
 assert.equal(await frame.locator('#sv2DemandRetry').isVisible(),false);
 assert.deepEqual(logs,[],'zero browser JavaScript syntax/runtime errors');
 await page.close();
 console.log('MANAGER_DEMAND_VN_BROWSER=PASS · 1440/390, 2 authorized stores, 24h/30m, fixture save, error/retry');
}finally{await browser.close()}
