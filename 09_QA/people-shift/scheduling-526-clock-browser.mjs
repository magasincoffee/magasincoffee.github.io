import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const browser=await chromium.launch({headless:true});
const errors=[];
const forbidden=[];
const cases=[['vi-VN',390],['en-US',1440]];
async function make(query,locale,width){
 const context=await browser.newContext({locale,timezoneId:'Asia/Ho_Chi_Minh',viewport:{width,height:900}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(locale+':'+e.message));
 page.on('request',request=>{if(!request.url().startsWith(BASE+'/')&&!request.url().startsWith('data:'))forbidden.push(request.url())});
 await page.goto(BASE+'/09_QA/people-shift/scheduling-526-clock-fixture.html?'+query,{waitUntil:'networkidle'});
 return {page,context};
}
async function slots(page){
 const a=await page.locator('select[name="start"] option').evaluateAll(ns=>ns.map(n=>({value:n.value,text:n.textContent})));
 const b=await page.locator('select[name="end"] option').evaluateAll(ns=>ns.map(n=>({value:n.value,text:n.textContent})));
 assert.equal(a.length,34);assert.equal(b.length,34);
 assert.deepEqual([a[0].value,a.at(-1).value,b[0].value,b.at(-1).value],['05:00','21:30','05:30','22:00']);
 assert.ok([...a,...b].every(x=>/^[0-2][0-9]:[0-5]0$/.test(x.value)&&x.text===x.value),'24h display independent from locale');
}
try{
 for(const [locale,width] of cases){
  const {page,context}=await make('draft-editor',locale,width);
  await page.locator('#editQa').click();
  await slots(page);
  assert.equal(await page.locator('#sv2ShiftLayer select[name="start"]').inputValue(),'06:00','HH:mm:ss edit value must load as HH:mm');
  assert.equal(await page.locator('#sv2ShiftLayer select[name="end"]').inputValue(),'14:00');
  await page.locator('#sv2ShiftLayer button[data-save]').click();
  assert.equal(await page.locator('#sv2ShiftLayer').count(),0);
  let rows=await page.evaluate(()=>window.__QA_526.writes);
  assert.equal(rows.length,1);assert.equal(rows[0].assignment.start_time,'06:00');assert.equal(rows[0].assignment.end_time,'14:00');
  await page.locator('#sv2AddShift').click();
  await page.locator('#sv2ShiftLayer select[name="employee"]').selectOption('qa-two');
  await page.locator('#sv2ShiftLayer select[name="end"]').selectOption('14:00');
  await page.locator('#sv2ShiftLayer button[data-save]').click();
  await page.waitForFunction(()=>document.querySelector('#sv2ShiftLayer [data-error]')?.textContent?.includes('Khoảng đã đăng ký'),{timeout:5000});
  const error=await page.locator('#sv2ShiftLayer [data-error]').innerText();
  assert.match(error,/26|2026-10-26/);
  assert.match(error,/06:00–14:00/);
  assert.match(error,/đăng ký/);
  assert.match(error,/06:00–12:00/,'Manager sees actual registered interval on failed save');
  assert.doesNotMatch(error,/\{|\}|"code"|ASSIGNMENT_VALIDATION_FAILED|AVAILABILITY_MISMATCH/,'technical JSON must be hidden');
  assert.equal(await page.locator('#sv2ShiftLayer').count(),1,'validation error must keep dialog open');
  await page.locator('#sv2ShiftLayer select[name="employee"]').selectOption('qa-one');
  await page.locator('#sv2ShiftLayer select[name="start"]').selectOption('05:00');
  await page.locator('#sv2ShiftLayer select[name="end"]').selectOption('22:00');
  await page.locator('#sv2ShiftLayer button[data-save]').click();
  rows=await page.evaluate(()=>window.__QA_526.writes);
  assert.equal(rows.at(-1).assignment.start_time,'05:00');
  assert.equal(rows.at(-1).assignment.end_time,'22:00');
  assert.equal(await page.locator('#sv2ShiftLayer').count(),0);
  console.log('QA526_DRAFT_MODAL_'+locale+'_'+width+'_HHMM_ROUNDTRIP_MISMATCH_PASS');
  await context.close();

  const post=await make('post-publish-preview',locale,width);
  const p=post.page;
  await p.locator('[data-post-add]').click();
  await slots(p);
  await p.locator('#sv2PostLayer select[name="start"]').selectOption('05:00');
  await p.locator('#sv2PostLayer select[name="end"]').selectOption('22:00');
  await p.locator('#sv2PostLayer textarea[name="reason"]').fill('Ca thử nghiệm trong môi trường cô lập');
  await p.locator('#sv2PostLayer [data-confirm]').click();
  const postWrites=await p.evaluate(()=>window.__QA_526.writes);
  assert.equal(postWrites.length,1);assert.equal(postWrites[0].startTime,'05:00');assert.equal(postWrites[0].endTime,'22:00');
  await p.locator('#officialQa').click();
  await slots(p);
  assert.equal(await p.locator('#sv2PostLayer select[name="start"]').inputValue(),'06:00','post publish stored HH:mm:ss');
  assert.equal(await p.locator('#sv2PostLayer select[name="end"]').inputValue(),'14:00');
  await post.context.close();
  console.log('QA526_POSTPUBLISH_MODAL_'+locale+'_'+width+'_HHMM_PASS');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[],'no external production/API access in fixtures');
 console.log('QA526_REAL_BROWSER_CLOCK_LOCALES_NO_PRODUCTION_WRITE_PASS');
}finally{await browser.close()}