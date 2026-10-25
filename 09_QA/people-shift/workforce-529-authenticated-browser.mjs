// #529: actual browser -> signed JWT -> disposable PG17/PostgREST role acceptance.
// GitHub-hosted QA only. No production URL, key, or employee account is used.
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.QA_529_URL||'http://127.0.0.1:3059';
assert.match(base,/^http:\/\/127\.0\.0\.1:3059$/,'Must use isolated loopback PostgREST');
const secret=process.env.QA_529_JWT_SECRET;
assert.ok(secret?.length>=32);
const chrome=process.env.QA_529_CHROME;
assert.ok(chrome,'Chrome path required');
const ids={owner:'11111111-1111-1111-1111-111111111111',manager:'11111111-1111-1111-1111-111111111112',staff:'11111111-1111-1111-1111-111111111113'};
const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(who){
 const now=Math.floor(Date.now()/1000);
 const body=b({alg:'HS256',typ:'JWT'})+'.'+b({role:'authenticated',sub:ids[who],iat:now,exp:now+1800});
 return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');
}
const storeIds=['20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'];
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const who of ['owner','manager','staff']){
  const page=await browser.newPage();
  try{
   // Navigate once to establish the SAME ORIGIN as QA PostgREST.
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});
   await page.setContent('<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body><div id="xstoreAutomationMount"></div></body></html>');
   await page.evaluate(({base,jwt,stores})=>{
    window.__qaRpcCalls=[];
    window.confirm=()=>true;
    window.MAGASIN_CROSS_STORE_MASTER={refresh:()=>{}};
    window.MAGASIN_MANAGER_SCHEDULE_DRAFT={
      refresh:async()=>{},getState:()=>({generationStatus:'DRAFT',lastValidation:'INVALID',assignments:[{}],busy:false})
    };
    window.MAGASIN_MANAGER_WORKFORCE_CONTEXT={client:()=>({rpc:async(name,args={})=>{
      window.__qaRpcCalls.push({name,args});
      if(name==='list_workforce_recurring_staffing_requirements_v1'){
       return {data:stores.map(store_id=>({store_id,day_of_week:1,start_time:'06:00',end_time:'14:00',target_headcount:1}))};
      }
      const resp=await fetch(base+'/rpc/'+name,{
       method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+jwt},
       body:JSON.stringify(args)
      });
      const raw=await resp.text();
      let data;try{data=JSON.parse(raw)}catch{data=raw}
      return resp.ok?{data,error:null}:{data:null,error:{message:typeof data?.message==='string'?data.message:raw}};
    }})};
   },{base,jwt:token(who),stores:who==='owner'?storeIds:[storeIds[0]]});
   await page.addScriptTag({path:'05_MANAGER/Workforce/cross-store-auto-schedule-v1.js'});
   await page.evaluate(({stores})=>document.dispatchEvent(new CustomEvent('magasin:xstore-master-rendered',{detail:{
    week:'2026-10-26',stores:stores.map((id,i)=>({id,code:'CN'+(i+1),name:'QA '+(i+1)})),
    unconfiguredEmployeeCount:0,globalDraftCount:1,globalOfficialCount:0
   }})),{stores:who==='owner'?storeIds:[storeIds[0]]});
   await page.waitForFunction(()=>window.MAGASIN_XSTORE_AUTO_SCHEDULE?.getState()?.capabilitiesChecked);
   const before=await page.evaluate(()=>window.MAGASIN_XSTORE_AUTO_SCHEDULE.getState());
   assert.equal(before.safeRerunAvailable,who!=='staff',who+' safe capability visibility');
   if(who==='staff'){
    assert.equal(await page.locator('#xsaRerun').count(),0,'Staff cannot see auto rerun');
    assert.equal(await page.evaluate(()=>window.__qaRpcCalls.some(x=>x.name==='auto_generate_cross_store_schedule_529')),false);
   }else{
    await page.locator('#xsaRerun').click();
    await page.waitForFunction(()=>{
      const s=window.MAGASIN_XSTORE_AUTO_SCHEDULE?.getState();
      return s&&!s.busy&&s.assignmentCount!==null;
    },{timeout:12000});
    const state=await page.evaluate(()=>window.MAGASIN_XSTORE_AUTO_SCHEDULE.getState());
    assert.equal(state.messageType!=='error',true,who+' UI generation error: '+state.message);
    const names=await page.evaluate(()=>window.__qaRpcCalls.map(x=>x.name));
    assert.ok(names.includes('auto_generate_cross_store_schedule_529'),who+' missing versioned writer');
    assert.ok(!names.includes('auto_generate_cross_store_schedule_v1'),who+' invoked legacy writer');
   }
   console.log('AUTH_BROWSER_529_'+who.toUpperCase()+'=PASS');
  }finally{await page.close()}
 }
}finally{await browser.close()}
console.log('AUTH_BROWSER_529_THREE_ROLES_POSTGREST=PASS');
