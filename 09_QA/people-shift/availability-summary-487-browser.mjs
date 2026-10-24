import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const browser=await chromium.launch({headless:true});
const errors=[];
async function scene(role,width,locale){
 const page=await browser.newPage({viewport:{width,height:850},locale,timezoneId:'Asia/Ho_Chi_Minh'});
 page.on('pageerror',e=>errors.push(role+': '+e.message));
 await page.goto(base+'/09_QA/people-shift/availability-summary-487-fixture.html?role='+role,{waitUntil:'networkidle'});
 await page.locator('.as487-metrics').waitFor({timeout:15000});
 return page;
}
try{
 const manager=await scene('manager',390,'en-US');
 const metric=()=>manager.locator('.as487-metric strong').allInnerTexts();
 assert.deepEqual(await metric(),['2','2','0'],'Manager CN1 can count only two ACTIVE prioritized employees');
 assert.equal(await manager.locator('[data-as487-employee]').count(),2);
 assert.ok(!(await manager.locator('#view-availability').innerText()).includes('Bình QA'),'CN2 staff cannot leak to CN1 Manager');
 assert.ok(!(await manager.locator('#view-availability').innerText()).includes('Nghỉ QA'),'inactive staff excluded');
 assert.match(await manager.locator('.as487-table').innerText(),/06:00–14:00/,'24h display');
 assert.match(await manager.locator('.as487-table').innerText(),/09:30–16:00/,'half-hour slot display');
 await manager.locator('[data-as487-type]').selectOption('FULL_TIME');
 assert.deepEqual(await metric(),['1','1','0']);
 await manager.locator('[data-as487-type]').selectOption('ALL');
 await manager.locator('[data-as487-search]').fill('Chi');
 await manager.locator('[data-as487-search]').press('Tab');
 assert.equal(await manager.locator('[data-as487-employee]').count(),1);
 await manager.locator('[data-as487-search]').fill('');
 await manager.locator('[data-as487-search]').press('Tab');
 await manager.locator('[data-as487-prev]').click();
 await manager.locator('.as487-metrics').waitFor({timeout:10000});
 await manager.waitForFunction(()=>document.querySelector('#view-availability').__as487.getState().week==='2026-10-19'&&!document.querySelector('#view-availability').__as487.getState().loading);
 assert.deepEqual(await metric(),['2','0','2'],'week switch does not pretend old data is still registered');
 await manager.locator('[data-as487-nextweek]').click();
 await manager.waitForFunction(()=>document.querySelector('#view-availability').__as487.getState().week==='2026-10-26'&&!document.querySelector('#view-availability').__as487.getState().loading);
 await manager.evaluate(()=>{window.__AS487_QA.fail=true});
 await manager.locator('[data-as487-reload]').click();
 await manager.locator('.as487-state.error').waitFor({timeout:10000});
 assert.match(await manager.locator('.as487-state.error').innerText(),/Không thể kết luận nhân viên chưa đăng ký/);
 assert.equal(await manager.locator('.as487-metric').count(),0,'failed reads cannot display false zero counts');
 const viewport=await manager.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(viewport.scroll<=viewport.width+2,'390px page must not horizontally overflow '+JSON.stringify(viewport));
 console.log('AS487_MANAGER_390_FILTERS_WEEK_FAILCLOSED_PASS');
 await manager.close();

 const owner=await scene('owner',1440,'vi-VN');
 const counts=await owner.locator('.as487-metric strong').allInnerTexts();
 assert.deepEqual(counts,['4','3','1'],'Owner four-store deduped counts');
 assert.equal(await owner.locator('[data-as487-employee]').count(),4);
 const state=await owner.evaluate(()=>document.querySelector('#view-availability').__as487.getState());
 assert.equal(state.rows.length,3,'duplicate registration in multiple priority stores must be deduped by availability_id');
 assert.equal(((await owner.locator('.as487-table').innerText()).match(/09:30–16:00/g)||[]).length,1);
 await owner.locator('[data-as487-store]').selectOption('91000000-0000-4000-8000-000000000003');
 await owner.waitForFunction(()=>document.querySelector('#view-availability').__as487.getState().storeId.endsWith('0003')&&!document.querySelector('#view-availability').__as487.getState().loading);
 assert.deepEqual(await owner.locator('.as487-metric strong').allInnerTexts(),['1','0','1']);
 await owner.locator('[data-as487-status]').selectOption('UNREGISTERED');
 assert.deepEqual(await owner.locator('.as487-metric strong').allInnerTexts(),['1','0','1']);
 console.log('AS487_OWNER_1440_4STORE_SCOPED_COUNTS_PASS');
 await owner.close();

 assert.deepEqual(errors,[],'no browser JS errors');
 console.log('AS487_READONLY_BROWSER_MATRIX_PASS');
}finally{await browser.close()}