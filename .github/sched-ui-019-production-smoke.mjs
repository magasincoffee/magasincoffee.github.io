import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = String(process.env.QA_BASE_URL || 'https://magasincoffee.github.io').replace(/\/$/,'');
const outDir = String(process.env.QA_OUT || 'qa-artifacts/sched-ui-019');
const expectedMain = String(process.env.EXPECTED_MAIN_SHA || '').trim();
const productMergeSha = String(process.env.PRODUCT_MERGE_SHA || '').trim();

await fs.mkdir(outDir,{recursive:true});

const report = {
  base,
  expectedMain,
  productMergeSha,
  generatedAt:new Date().toISOString(),
  http:[],
  browser:{consoleErrors:[],pageErrors:[],requestFailures:[],http5xx:[]},
  markers:{},
  mutationMode:'READ_ONLY_GET_PLUS_AUTH_LOGIN_LOGOUT_ONLY',
  status:'RUNNING'
};

async function get(pathname, marker, label){
  const url=base+pathname;
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    try{
      const r=await fetch(url,{redirect:'follow',headers:{'cache-control':'no-cache'}});
      const text=await r.text();
      last={status:r.status,url:r.url,text};
      if(r.status===200 && (!marker || text.includes(marker))) {
        report.http.push({label,pathname,status:r.status,finalUrl:r.url,marker:marker||null,pass:true});
        return text;
      }
    }catch(e){ last={error:String(e?.message||e)}; }
    await new Promise(r=>setTimeout(r,5000));
  }
  report.http.push({label,pathname,pass:false,last});
  assert.fail(`${label}: production HTTP/marker check failed for ${pathname}: ${JSON.stringify(last)}`);
}

const checks=[
  ['/03_PLATFORM/01_AUTH/','MAGASIN · Đăng nhập','auth'],
  ['/manager/','data-route-key="manager-root"','manager-root'],
  ['/manager/scheduling/','data-route-key="manager-scheduling"','manager-scheduling'],
  ['/manager/schedule/','data-route-key="manager-schedule"','manager-schedule'],
  ['/employee/','data-route-key="employee-root"','employee-root'],
  ['/employee/schedule/','data-route-key="employee-schedule"','employee-schedule'],
  ['/owner/','data-route-key="owner-root"','owner-root'],
  ['/owner/scheduling/','data-route-key="owner-scheduling"','owner-scheduling'],
  ['/05_MANAGER/Workforce/','20261003-sched-ui-017','compat-manager-workforce'],
  ['/06_EMPLOYEE/','20261003-sched-ui-007','compat-employee'],
  ['/04_OWNER/Workforce/','20261003-sched-ui-008','compat-owner-workforce']
];

for(const [p,m,l] of checks) await get(p,m,l);

const review = await get('/05_MANAGER/Workforce/review-v1.js?v=20261003-sched-ui-017','mwr3-band-','manager-review-correction-asset');
for(const marker of ['const shiftBand=', 'data-time-band=', 'mwr3-band-morning', 'mwr3-band-afternoon', 'mwr3-band-evening']){
  assert.ok(review.includes(marker), `review-v1.js missing ${marker}`);
  report.markers[marker]=true;
}

const core = await get('/02_CORE/shared/shared-core-v1.js?v=20261003-sched-ui-005',"m>=300&&m<720?'morning'","canonical-time-band-core");
for(const marker of ["m>=300&&m<720?'morning'","m>=720&&m<1020?'afternoon'","m>=1020&&m<=1320?'evening'"]){
  assert.ok(core.includes(marker), `shared core missing ${marker}`);
  report.markers[marker]=true;
}

const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext();
  const page=await context.newPage();
  page.on('console',msg=>{
    if(msg.type()==='error') report.browser.consoleErrors.push({text:msg.text(),url:page.url()});
  });
  page.on('pageerror',e=>report.browser.pageErrors.push(String(e?.message||e)));
  page.on('requestfailed',req=>{
    const u=req.url();
    if(/magasincoffee\.github\.io|supabase\.co/.test(u)) report.browser.requestFailures.push({url:u,error:req.failure()?.errorText||'unknown'});
  });
  page.on('response',res=>{
    const u=res.url();
    if(res.status()>=500 && /magasincoffee\.github\.io|supabase\.co/.test(u)) report.browser.http5xx.push({status:res.status(),url:u});
  });

  await page.goto(base+'/03_PLATFORM/01_AUTH/',{waitUntil:'networkidle',timeout:30000});
  await page.locator('#login.active').waitFor({timeout:20000});
  assert.match(await page.title(),/MAGASIN.*Đăng nhập/);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'auth mobile horizontal overflow');
  await page.setViewportSize({width:1440,height:900});
  assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'auth desktop horizontal overflow');

  assert.deepEqual(report.browser.pageErrors,[],'production auth page errors');
  assert.deepEqual(report.browser.http5xx,[],'production auth HTTP 5xx');
  assert.deepEqual(report.browser.requestFailures,[],'production first-party/Supabase request failures');
  assert.deepEqual(report.browser.consoleErrors,[],'production auth console errors');
  await context.close();
} finally {
  await browser.close();
}

report.status='PASS';
await fs.writeFile(`${outDir}/production-smoke.json`,JSON.stringify(report,null,2));
console.log('SCHED_UI_019_PRODUCTION_HTTP_ROUTES=PASS');
console.log('SCHED_UI_019_PRODUCTION_CORRECTION_ASSET=PASS');
console.log('SCHED_UI_019_CANONICAL_TIME_BAND_ASSET=PASS');
console.log('SCHED_UI_019_PRODUCTION_BROWSER_DIAGNOSTICS=PASS');
console.log('SCHED_UI_019_NO_BUSINESS_MUTATION=PASS');
console.log('SCHED_UI_019_PRODUCTION_SMOKE=PASS');
