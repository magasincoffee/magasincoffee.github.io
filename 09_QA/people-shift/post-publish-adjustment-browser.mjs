import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
let failed=false;
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 try{
  await page.goto('http://127.0.0.1:8787/09_QA/people-shift/post-publish-adjustment-fixture.html',{waitUntil:'networkidle'});
  await page.locator('#mppAdd').waitFor({timeout:12000});
  if(!await page.locator('#mppHistory').isVisible())throw Error('Audit button missing');
  await page.locator('#mppAdd').click();
  await page.locator('#mppEmployee option').last().waitFor({timeout:10000});
  const options=await page.locator('#mppEmployee option').allTextContents();
  if(options.length!==2||options.some(x=>x.includes('đã nghỉ')))throw Error('Inactive employee exposed: '+JSON.stringify(options));
  const ids=await page.evaluate(()=>({staff:window.fixture.staff,shift:window.fixture.shift}));
  await page.locator('#mppEmployee').selectOption(ids.staff);
  await page.locator('#mppReason').fill('Bổ sung người cho ca thiếu');
  await page.locator('#mppSubmit').click();
  await page.locator('#mppLayer').waitFor({state:'detached'});
  let calls=await page.evaluate(()=>window.fixture.calls);
  if(!calls.some(x=>x.name==='add_published_shift_v1'&&x.payload.p_employee_id===ids.staff&&x.payload.p_reason.length>=3))throw Error('ADD RPC missing');
  await page.locator('.mpp-open').click();
  await page.locator('#mppEmployee option').last().waitFor({timeout:10000});
  await page.locator('#mppEmployee').selectOption(ids.staff);
  await page.locator('#mppReason').fill('Thay nhân viên cho ca đã phát hành');
  await page.locator('#mppSubmit').click();
  await page.locator('#mppLayer').waitFor({state:'detached'});
  calls=await page.evaluate(()=>window.fixture.calls);
  if(!calls.some(x=>x.name==='reassign_published_shift_v1'&&x.payload.p_schedule_id===ids.shift))throw Error('REASSIGN RPC missing');
  await page.locator('#mppHistory').click();
  await page.locator('.mpp-audit').waitFor({timeout:10000});
  if(!await page.locator('.mpp-audit').innerText().then(x=>x.includes('Bổ sung theo nhu cầu')))throw Error('Audit detail missing');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  if(overflow.scroll>overflow.client+2)throw Error('Horizontal overflow '+JSON.stringify(overflow));
  if(errors.length)throw Error('Browser errors: '+JSON.stringify(errors));
  console.log('POST_PUBLISH_UI_'+width+'=PASS');
 }catch(e){failed=true;console.error('POST_PUBLISH_UI_'+width+'=FAIL',e.message,JSON.stringify(errors))}
 await page.close();
}
await browser.close();if(failed)process.exit(1);