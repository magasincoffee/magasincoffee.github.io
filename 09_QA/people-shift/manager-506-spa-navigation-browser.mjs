import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8769';
const browser=await chromium.launch({headless:true});
const core=`window.MAGASIN_CORE={supabase:{
 requireActive:async()=>({id:'qa-manager',role:'STORE_MANAGER',status:'ACTIVE',full_name:'Quản lý QA'}),
 get:()=>window.supabase?.createClient?.()
}};`;
const supabase=`window.supabase={createClient:()=>({
 auth:{getUser:async()=>({data:{user:{id:'qa-manager'}},error:null}),
 getSession:async()=>({data:{session:{user:{id:'qa-manager'}}},error:null}),
 signOut:async()=>({error:null})},
 from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'qa-manager',role:'STORE_MANAGER',status:'ACTIVE'},error:null})})})}),
 rpc:async(name)=>({data:name==='get_manager_accessible_stores'?[{id:'qa-store',code:'CN1',name:'CN1',status:'ACTIVE'}]:[],error:null})
})};`;
const failures=[];
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/02_CORE/shared/shared-core-v1.js**',route=>route.fulfill({status:200,contentType:'application/javascript',body:core}));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:supabase}));
  const response=await page.goto(BASE+'/manager/scheduling/',{waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200);
  await page.waitForFunction(()=>!!window.MAGASIN_MANAGER_MODULE_ROUTER,{timeout:20000});
  await page.locator('#app:not([hidden])').waitFor({timeout:20000});
  const source=page.frameLocator('#app');
  await source.locator('#sv2Week').waitFor({timeout:20000});
  await page.evaluate(()=>{document.body.dataset.spaTestMarker='persistent-document';});
  await source.locator('#sv2Week').evaluate(input=>{
    input.value='2026-11-02';
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  const week=await source.locator('#sv2Week').inputValue();
  assert.equal(week,'2026-11-02');
  // A toolbar anchor in the content iframe must NOT navigate the top document.
  await source.locator('details.sv2-advanced summary').click();
  await source.locator('.sv2-demand-back').click();
  await page.waitForURL(url=>url.pathname==='/manager/scheduling/'&&url.searchParams.get('section')==='demand');
  await page.waitForFunction(()=>window.MAGASIN_MANAGER_MODULE_ROUTER?.current()==='demand');
  await page.locator('iframe[data-manager-module="demand"]:not([hidden])').waitFor();
  const demand=page.frameLocator('iframe[data-manager-module="demand"]');
  await demand.locator('#sv2DemandStore').waitFor({timeout:20000});
  assert.equal(await page.locator('#app').isHidden(),true,'original scheduling editor stays cached');
  assert.equal(await page.evaluate(()=>document.body.dataset.spaTestMarker),'persistent-document');
  assert.equal(await page.locator('.m-shell-v2-sidebar').count(),1);
  assert.equal(await page.locator('.m-shell-v2-topbar').count(),1);
  assert.equal(await demand.locator('.sv2-sidebar').isVisible(),false);

  // Mark an unsaved local form edit, reject navigation, then accept it.
  await demand.locator('body').evaluate(node=>node.dataset.managerUnsaved='true');
  const dirty=await page.evaluate(()=>window.MAGASIN_MANAGER_MODULE_ROUTER.dirty());
  assert.equal(dirty,true);
  if(width<=1024) await page.locator('[data-shell-menu]').click();
  const goWorkforce=page.locator('[data-shell-key="workforce"]');
  page.once('dialog',dialog=>dialog.dismiss());
  await goWorkforce.click();
  assert.equal(await page.evaluate(()=>window.MAGASIN_MANAGER_MODULE_ROUTER.current()),'demand');
  assert.equal(new URL(page.url()).searchParams.get('section'),'demand');
  page.once('dialog',dialog=>dialog.accept());
  await goWorkforce.click();
  await page.waitForFunction(()=>window.MAGASIN_MANAGER_MODULE_ROUTER.current()==='workforce');
  assert.equal(await source.locator('#sv2Week').inputValue(),'2026-11-02','week survives module switch');
  assert.equal(await page.evaluate(()=>document.body.dataset.spaTestMarker),'persistent-document');
  assert.equal(await demand.locator('body').getAttribute('data-manager-unsaved'),'true','dirty demand iframe is retained');

  if(width<=1024)await page.locator('[data-shell-menu]').click();
  await page.locator('[data-shell-key="staff"]').click();
  await page.waitForURL(url=>url.pathname==='/manager/'&&url.hash==='#staff');
  await page.locator('iframe[data-manager-module="legacy"]:not([hidden])').waitFor({timeout:20000});
  await page.waitForFunction(()=>document.querySelector('iframe[data-manager-module="legacy"]')?.style.visibility==='visible',{timeout:20000});
  assert.equal(await page.evaluate(()=>document.body.dataset.spaTestMarker),'persistent-document');
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.MAGASIN_MANAGER_MODULE_ROUTER?.current()==='workforce');
  assert.equal(await source.locator('#sv2Week').inputValue(),'2026-11-02');
  assert.equal(await page.locator('.m-shell-v2-sidebar').count(),1);
  console.log('MANAGER_506_SPA_E2E_PASS viewport='+width);
  // Hard reload prompts only while outstanding unsaved changes exist.
  await page.close({runBeforeUnload:false});
 }
} catch (error) {
 failures.push(String(error?.stack||error));
 throw error;
} finally {
 await browser.close();
}
