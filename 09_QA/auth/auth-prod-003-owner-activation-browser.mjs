import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl=process.env.QA_BASE_URL||'http://127.0.0.1:8769';

const sharedCoreMock=String.raw`
(()=>{
  const qs=new URL(location.href).searchParams;
  const actorRole=(qs.get('qaActor')||'OWNER').toUpperCase();
  const actor={id:'actor-'+actorRole.toLowerCase(),username:'actor',full_name:'Actor '+actorRole,role:actorRole,status:'ACTIVE'};
  let profiles=[
    {id:'p-owner',full_name:'Owner QA',username:'owner',email:'owner@example.test',role:'OWNER',status:'ACTIVE'},
    {id:'p-staff',full_name:'Staff Pending',username:'staff.pending',email:'staff@example.test',role:'STAFF',status:'PENDING'},
    {id:'p-manager',full_name:'Manager Pending',username:'manager.pending',email:'manager@example.test',role:'STORE_MANAGER',status:'PENDING'},
    {id:'p-accountant',full_name:'Accountant Pending',username:'accountant.pending',email:'accountant@example.test',role:'ACCOUNTANT',status:'PENDING'}
  ];
  window.__authProd003Updates=[];

  function query(name){
    const state={payload:null,id:null};
    const q={
      select(){return q;},
      order(){return Promise.resolve({data:name==='profiles'?profiles:[],error:null});},
      update(payload){state.payload={...payload};return q;},
      eq(column,value){if(column==='id')state.id=value;return q;},
      async single(){
        const current=profiles.find(p=>p.id===state.id)||profiles[1];
        const next=state.payload?{...current,...state.payload}:current;
        if(state.payload&&state.id){
          profiles=profiles.map(p=>p.id===state.id?next:p);
          window.__authProd003Updates.push({id:state.id,payload:{...state.payload}});
        }
        return {data:next,error:null};
      },
      then(resolve,reject){return Promise.resolve({data:name==='profiles'?profiles:[],error:null}).then(resolve,reject);}
    };
    return q;
  }

  const sb={from:name=>query(name),auth:{async signOut(){return {error:null}}}};
  window.MAGASIN_CORE={
    supabase:{
      get(){return sb;},
      async requireActive(){return actor;}
    },
    roles:{hasRole(profile,roles){return profile?.status==='ACTIVE'&&roles.includes(String(profile?.role||'').toUpperCase());}},
    security:{escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}}
  };
})();
`;

async function open(browser,actor='OWNER'){
  const context=await browser.newContext();
  await context.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'globalThis.supabase=globalThis.supabase||{};'}));
  await context.route('**/02_CORE/shared/shared-core-v1.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:sharedCoreMock}));
  const page=await context.newPage();
  const pageErrors=[]; const consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('console',m=>{
    if(m.type()==='error'&&!m.text().includes('[OWNER_ACCESS]'))consoleErrors.push(m.text());
  });
  await page.goto(`${baseUrl}/04_OWNER/Access/?qaActor=${actor}`,{waitUntil:'networkidle'});
  return {context,page,pageErrors,consoleErrors};
}

const browser=await chromium.launch({headless:true});

try{
  {
    const {context,page,pageErrors,consoleErrors}=await open(browser,'OWNER');
    await page.locator('#app:not(.hidden)').waitFor();

    const ownerRow=page.locator('#accountsBody tr[data-id="p-owner"]');
    assert.equal(await ownerRow.locator('[data-role]').isDisabled(),true);
    assert.equal(await ownerRow.locator('[data-account-status]').count(),0);
    assert.equal(await ownerRow.locator('[data-save]').count(),0);

    const staffRow=page.locator('#accountsBody tr[data-id="p-staff"]');
    await staffRow.locator('[data-account-status]').selectOption('ACTIVE');
    assert.equal(await staffRow.locator('[data-save]').isDisabled(),false);
    await staffRow.locator('[data-save]').click();
    await page.waitForFunction(()=>window.__authProd003Updates.length===1);
    let updates=await page.evaluate(()=>window.__authProd003Updates);
    assert.deepEqual(updates[0],{id:'p-staff',payload:{role:'STAFF',status:'ACTIVE',access_scope:''}});

    const managerRow=page.locator('#accountsBody tr[data-id="p-manager"]');
    await managerRow.locator('[data-account-status]').selectOption('ACTIVE');
    await managerRow.locator('[data-save]').click();
    await page.waitForFunction(()=>window.__authProd003Updates.length===2);
    updates=await page.evaluate(()=>window.__authProd003Updates);
    assert.deepEqual(updates[1],{id:'p-manager',payload:{role:'STORE_MANAGER',status:'ACTIVE',access_scope:'ALL'}});

    const accountantRow=page.locator('#accountsBody tr[data-id="p-accountant"]');
    await accountantRow.locator('[data-account-status]').selectOption('ACTIVE');
    await accountantRow.locator('[data-save]').click();
    await page.waitForFunction(()=>window.__authProd003Updates.length===3);
    updates=await page.evaluate(()=>window.__authProd003Updates);
    assert.deepEqual(updates[2],{id:'p-accountant',payload:{role:'ACCOUNTANT',status:'ACTIVE',access_scope:''}});

    assert.deepEqual(pageErrors,[]);
    assert.deepEqual(consoleErrors,[]);
    await context.close();
  }

  {
    const {context,page}=await open(browser,'STAFF');
    await page.locator('#denied:not(.hidden)').waitFor();
    assert.equal(await page.locator('#app.hidden').count(),1);
    const updates=await page.evaluate(()=>window.__authProd003Updates||[]);
    assert.deepEqual(updates,[]);
    await context.close();
  }

  console.log('AUTH_PROD_003_OWNER_ACTIVATION_BROWSER=PASS');
}finally{
  await browser.close();
}
