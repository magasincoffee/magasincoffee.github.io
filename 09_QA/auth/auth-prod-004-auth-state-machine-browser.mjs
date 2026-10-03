import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl=process.env.QA_BASE_URL||'http://127.0.0.1:8769';

const mockSdk=String.raw`
(()=>{
  const params=new URLSearchParams(location.search);
  const scenario=params.get('scenario')||'no-session';
  const sessionKey='__auth_prod_004_session';
  const auditKey='__auth_prod_004_audit';
  const user={id:'user-004',email:'qa004@example.test'};

  const readAudit=()=>{try{return JSON.parse(localStorage.getItem(auditKey)||'{}')}catch(_){return {}}};
  const writeAudit=patch=>localStorage.setItem(auditKey,JSON.stringify({...readAudit(),...patch}));
  const readSession=()=>{try{const raw=localStorage.getItem(sessionKey);return raw?JSON.parse(raw):null}catch(_){return null}};
  const writeSession=session=>session?localStorage.setItem(sessionKey,JSON.stringify(session)):localStorage.removeItem(sessionKey);
  const makeSession=()=>({access_token:'mock-access',refresh_token:'mock-refresh',user});

  if(!localStorage.getItem('__auth_prod_004_initialized')){
    localStorage.setItem('__auth_prod_004_initialized','1');
    if(['active-boot','pending-boot','inactive-boot','profile-error','verify-pending'].includes(scenario))writeSession(makeSession());
  }

  const profile=()=>{
    if(scenario==='pending-boot'||scenario==='verify-pending'||scenario==='verify-code')return {role:'STAFF',status:'PENDING'};
    if(scenario==='inactive-boot')return {role:'STAFF',status:'INACTIVE'};
    return {role:'OWNER',status:'ACTIVE'};
  };

  window.supabase={
    createClient(){
      return {
        auth:{
          onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
          async getSession(){return {data:{session:readSession()},error:null};},
          async signOut(options){
            writeSession(null);
            const a=readAudit();
            writeAudit({signOut:(a.signOut||0)+1,signOutScope:options&&options.scope});
            return {error:null};
          },
          async signInWithPassword(){
            const s=makeSession();writeSession(s);return {data:{user,session:s},error:null};
          },
          async signUp(){
            const a=readAudit();writeAudit({signUp:(a.signUp||0)+1});
            if(scenario==='signup-session'){
              const s=makeSession();writeSession(s);return {data:{user,session:s},error:null};
            }
            return {data:{user,session:null},error:null};
          },
          async exchangeCodeForSession(code){
            const a=readAudit();writeAudit({exchange:(a.exchange||0)+1,code});
            if(scenario==='verify-code'&&code==='verify-code'){
              const s=makeSession();writeSession(s);return {data:{session:s},error:null};
            }
            return {data:{session:null},error:{code:'invalid'}};
          },
          async verifyOtp(input){
            const a=readAudit();writeAudit({verify:(a.verify||0)+1,verifyType:input&&input.type});
            const s=makeSession();writeSession(s);return {data:{session:s},error:null};
          },
          async resetPasswordForEmail(){return {data:{},error:null};},
          async updateUser(){return {data:{user},error:null};}
        },
        async rpc(name,args){
          if(name==='resolve_login_email'&&args?.p_username==='qa.auth004')return {data:null,error:null};
          return {data:'qa004@example.test',error:null};
        },
        from(table){
          return {
            select(){return this;},
            eq(){return this;},
            async single(){
              if(table!=='profiles')return {data:null,error:null};
              if(scenario==='profile-error')return {data:null,error:{message:'profile unavailable'}};
              return {data:profile(),error:null};
            }
          };
        }
      };
    }
  };
})();
`;

const browser=await chromium.launch({headless:true});

async function open(path){
  const context=await browser.newContext();
  await context.route('**/npm/@supabase/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:mockSdk}));
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.goto(baseUrl+path,{waitUntil:'networkidle'});
  return {context,page,errors};
}

async function register(page){
  await page.click('[data-view="register"]');
  await page.fill('#fullName','QA Auth Prod');
  await page.fill('#phone','0900000000');
  await page.fill('#email','qa004@example.test');
  await page.fill('#regUsername','qa.auth004');
  await page.fill('#regPassword','Password123');
  await page.click('#registerForm button[type="submit"]');
  await page.locator('#login.active').waitFor();
}

try{
  {
    const {context,page,errors}=await open('/03_PLATFORM/01_AUTH/?scenario=signup-session');
    await register(page);
    assert.match(await page.locator('#msg').textContent(),/chờ quản lý kích hoạt/i);
    const state=await page.evaluate(()=>({
      audit:JSON.parse(localStorage.getItem('__auth_prod_004_audit')||'{}'),
      session:localStorage.getItem('__auth_prod_004_session')
    }));
    assert.equal(state.audit.signUp,1);
    assert.equal(state.audit.signOut,1);
    assert.equal(state.audit.signOutScope,'local');
    assert.equal(state.session,null);
    assert.deepEqual(errors,[]);
    await context.close();
  }

  {
    const {context,page}=await open('/03_PLATFORM/01_AUTH/?scenario=signup-confirm');
    await register(page);
    assert.match(await page.locator('#msg').textContent(),/xác nhận email/i);
    const audit=await page.evaluate(()=>JSON.parse(localStorage.getItem('__auth_prod_004_audit')||'{}'));
    assert.equal(audit.signUp,1);
    assert.equal(audit.signOut||0,0);
    await context.close();
  }

  {
    const {context,page}=await open('/03_PLATFORM/01_AUTH/?scenario=active-boot');
    await page.waitForURL('**/owner/**',{waitUntil:'commit'});
    await context.close();
  }

  {
    const {context,page}=await open('/03_PLATFORM/01_AUTH/?scenario=pending-boot');
    await page.waitForURL('**/03_PLATFORM/01_AUTH/pending-access.html',{waitUntil:'commit'});
    await context.close();
  }

  {
    const {context,page}=await open('/03_PLATFORM/01_AUTH/?scenario=inactive-boot');
    await page.locator('#login.active').waitFor();
    assert.match(await page.locator('#msg').textContent(),/không hoạt động/i);
    let state=await page.evaluate(()=>({
      audit:JSON.parse(localStorage.getItem('__auth_prod_004_audit')||'{}'),
      session:localStorage.getItem('__auth_prod_004_session')
    }));
    assert.equal(state.audit.signOut,1);
    assert.equal(state.session,null);
    await page.reload({waitUntil:'networkidle'});
    await page.locator('#login.active').waitFor();
    assert.doesNotMatch(page.url(),/pending-access/);
    state=await page.evaluate(()=>({session:localStorage.getItem('__auth_prod_004_session')}));
    assert.equal(state.session,null);
    await context.close();
  }

  {
    const {context,page}=await open('/03_PLATFORM/01_AUTH/?scenario=profile-error');
    await page.locator('#login.active').waitFor();
    assert.match(await page.locator('#msg').textContent(),/Không thể xác minh quyền truy cập/i);
    const state=await page.evaluate(()=>({
      audit:JSON.parse(localStorage.getItem('__auth_prod_004_audit')||'{}'),
      session:localStorage.getItem('__auth_prod_004_session')
    }));
    assert.equal(state.audit.signOut,1);
    assert.equal(state.session,null);
    await context.close();
  }

  {
    const {context,page}=await open('/03_PLATFORM/01_AUTH/?auth=verify&scenario=verify-pending');
    await page.locator('#login.active').waitFor();
    await page.waitForFunction(()=>document.querySelector('#msg')?.textContent.includes('Email đã được xác nhận'));
    assert.match(await page.locator('#msg').textContent(),/đang chờ quản lý kích hoạt/i);
    assert.equal(new URL(page.url()).search,'');
    const audit=await page.evaluate(()=>JSON.parse(localStorage.getItem('__auth_prod_004_audit')||'{}'));
    assert.equal(audit.signOut,1);
    await context.close();
  }

  {
    const {context,page}=await open('/03_PLATFORM/01_AUTH/?auth=verify&code=verify-code&scenario=verify-code');
    await page.locator('#login.active').waitFor();
    await page.waitForFunction(()=>document.querySelector('#msg')?.textContent.includes('Email đã được xác nhận'));
    const audit=await page.evaluate(()=>JSON.parse(localStorage.getItem('__auth_prod_004_audit')||'{}'));
    assert.equal(audit.exchange,1);
    assert.equal(audit.code,'verify-code');
    assert.equal(audit.signOut,1);
    assert.equal(new URL(page.url()).search,'');
    await context.close();
  }

  console.log('AUTH_PROD_004_AUTH_STATE_MACHINE_BROWSER=PASS');
}finally{
  await browser.close();
}
