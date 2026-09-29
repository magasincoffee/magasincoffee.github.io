(()=>{'use strict';
if(window.MAGASIN_MANAGER_WORKFORCE_CONTEXT)return;

const U='https://menvbzlsncmpuvnaifxa.supabase.co';
const K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
let sb=null,actorCache=null,storesCache=null,pending=null;

const client=()=>{
  if(sb)return sb;
  if(!window.supabase?.createClient)throw Error('MANAGER_CONTEXT_SUPABASE_UNAVAILABLE');
  sb=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return sb;
};

async function loadActor(){
  const c=client();
  const u=await c.auth.getUser();
  if(u.error)throw u.error;
  const id=u.data?.user?.id;
  if(!id)throw Error('AUTH_REQUIRED');
  const q=await c.from('profiles').select('id,username,full_name,role,status,access_scope').eq('id',id).single();
  if(q.error)throw q.error;
  const actor=q.data||null;
  if(!actor)throw Error('PROFILE_NOT_FOUND');
  if(String(actor.status||'').toUpperCase()!=='ACTIVE')throw Error('ACTOR_NOT_ACTIVE');
  const role=String(actor.role||'').toUpperCase();
  if(!['OWNER','STORE_MANAGER'].includes(role))throw Error('ROLE_NOT_ALLOWED');
  return actor;
}

async function loadStores(){
  const q=await client().rpc('get_manager_accessible_stores');
  if(q.error)throw q.error;
  return (Array.isArray(q.data)?q.data:[]).filter(x=>x?.id&&String(x.status||'ACTIVE').toUpperCase()==='ACTIVE');
}

async function refresh(){
  if(pending)return pending;
  pending=(async()=>{
    const [actor,stores]=await Promise.all([loadActor(),loadStores()]);
    actorCache=actor;storesCache=stores;
    const snapshot=getSnapshot();
    document.dispatchEvent(new CustomEvent('magasin:manager-workforce-context',{detail:snapshot}));
    return snapshot;
  })();
  try{return await pending}finally{pending=null}
}

async function actor({force=false}={}){
  if(force||!actorCache)await refresh();
  return actorCache;
}

async function stores({force=false}={}){
  if(force||!storesCache)await refresh();
  return storesCache.map(x=>({...x}));
}

function invalidate(){
  actorCache=null;storesCache=null;
}

function getSnapshot(){
  return {
    actor:actorCache?{...actorCache}:null,
    stores:Array.isArray(storesCache)?storesCache.map(x=>({...x})):[],
    ready:!!actorCache&&Array.isArray(storesCache)
  };
}

window.MAGASIN_MANAGER_WORKFORCE_CONTEXT=Object.freeze({
  version:'1.0',
  client,
  refresh,
  actor,
  stores,
  invalidate,
  getSnapshot
});
})();