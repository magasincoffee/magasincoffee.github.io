import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
let failed=false;
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:850}});
 const browserErrors=[];page.on('pageerror',e=>browserErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text())});
 try{
  await page.goto('http://127.0.0.1:8786/09_QA/people-shift/manager-workforce-canonical-fixture.html',{waitUntil:'networkidle'});
  await page.locator('.x19g-shell').waitFor({timeout:15000});
  const steps=await page.locator('.x19g-nav button').allTextContents();
  const boards=await page.locator('[data-x19g-board]').count();
  const names=['Chuẩn bị','Tạo lịch nháp','Chỉnh lịch','Kiểm tra','Duyệt & phát hành'];
  if(boards!==5||steps.length!==5||names.some((name,i)=>!steps[i].includes(name)))throw Error(JSON.stringify({boards,steps}));
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  if(overflow.scroll>overflow.client+2)throw Error('Viewport overflow '+JSON.stringify(overflow));
  console.log('MANAGER_FIVE_STEP_'+width+'=PASS',JSON.stringify({boards,steps}));
 }catch(e){failed=true;console.error('MANAGER_FIVE_STEP_'+width+'=FAIL',e.message,JSON.stringify({browserErrors,html:await page.locator('#panel-publish').innerText().catch(()=>''),scripts:await page.evaluate(()=>[...document.scripts].map(s=>s.src)).catch(()=>[])}))}
 await page.close();
}
await browser.close();
if(failed)process.exit(1);
