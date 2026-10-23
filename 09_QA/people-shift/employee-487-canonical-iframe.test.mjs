// #487 Employee: canonical hash hand-off and parent/child iframe readiness.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const bridgeHtml=readFileSync('06_EMPLOYEE/index.html','utf8');
const bridgeCode=[...bridgeHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).find(x=>x.includes('tokenView=Object.freeze'));
const consolidation=readFileSync('06_EMPLOYEE/workforce-ui-consolidation-v1.js','utf8');
assert.ok(bridgeCode,'Employee canonical bridge inline script exists');

async function bridge({token='employee-root',hash='',role='STAFF'}={}){
  let redirected=null,canonical=null;
  const iframe={hidden:true,src:''};
  const location={pathname:'/06_EMPLOYEE/',search:'?canonical='+token,hash,
    replace(target){redirected=target}};
  const window={MAGASIN_CORE:{
    supabase:{requireActive:async()=>({role,status:'ACTIVE'})},
    roles:{hasRole:(p,roles)=>roles.includes(p.role)}
  }};
  vm.runInNewContext(bridgeCode,{
    window,location,URLSearchParams,
    document:{getElementById:id=>id==='app'?iframe:null},
    history:{replaceState(_s,_t,target){canonical=target}},
    console
  },{timeout:1000});
  await new Promise(resolve=>setImmediate(resolve));
  return {redirected,canonical,iframe};
}

test('Employee canonical bridge preserves allowed hash deep links',async()=>{
  for(const [hash,expected] of [
    ['#profile','/employee/#profile'],
    ['#swap','/employee/#swap'],
    ['','/employee/'],
    ['#admin','/employee/']
  ]){
    const got=await bridge({hash});
    assert.equal(got.redirected,null,hash);
    assert.equal(got.canonical,expected,hash);
    assert.equal(got.iframe.hidden,false,hash);
    const innerHash=expected.includes('#')?expected.slice(expected.indexOf('#')):'';
    assert.ok(got.iframe.src.endsWith('employee-runtime-v1.html?v=20261021-mockup-d1'+innerHash),hash);
  }
  const schedule=await bridge({token:'employee-schedule',hash:'#schedule'});
  assert.equal(schedule.canonical,'/employee/schedule/');
});

test('Employee nonauthorized role cannot use canonical bridge',async()=>{
  const got=await bridge({role:'STORE_MANAGER',hash:'#profile'});
  assert.equal(got.canonical,null);
  assert.equal(got.redirected,'/manager/');
  assert.equal(got.iframe.hidden,true);
});

test('Parent iframe navigation waits until child showView is defined',()=>{
  const timers=[];
  let clicks=0;
  const childWindow={showView:undefined};
  const link={textContent:'',click(){
    assert.equal(typeof childWindow.showView,'function','never fire inline onclick before child boot');
    clicks++;
  }};
  const childDocument={
    querySelector:selector=>selector==='.nav [data-view="profile"]'?link:null,
    getElementById:()=>null
  };
  const iframe={
    contentDocument:childDocument,contentWindow:childWindow,
    addEventListener() {}
  };
  const rootDocument={
    readyState:'complete',
    getElementById:id=>id==='employeeApp'?iframe:null
  };
  vm.runInNewContext(consolidation,{
    document:rootDocument,location:{hash:'#profile'},
    window:{addEventListener(){}},
    setTimeout:fn=>{timers.push(fn);return timers.length},
    console
  },{timeout:1000});
  assert.equal(clicks,0,'premature activation must not click');
  assert.ok(timers.length>0,'must retry until child is initialized');
  childWindow.showView=()=>{};
  timers.shift()();
  assert.equal(clicks,1,'activate after child is ready');
});
