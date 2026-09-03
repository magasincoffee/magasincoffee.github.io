(()=>{'use strict';
/**
 * MAGASIN Shared Core v1
 * One shared foundation for Employee / Owner / Manager portals.
 * Business modules should consume this API instead of creating duplicate auth,
 * Supabase, date/week, store, time and UI helpers.
 */
(function(global){
  const SUPABASE_URL='https://menvbzlsncmpuvnaifxa.supabase.co';
  const SUPABASE_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
  const TZ='Asia/Ho_Chi_Minh';
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=(d=new Date())=>{
    const p={};
    new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).forEach(x=>p[x.type]=x.value);
    return `${p.year}-${p.month}-${p.day}`;
  };
  const localDate=key=>new Date(`${String(key).slice(0,10)}T00:00:00+07:00`);
  const addDays=(key,n)=>{const d=localDate(key);d.setUTCDate(d.getUTCDate()+n);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`};
  const monday=key=>{const d=localDate(key||dateKey()),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-(day-1));return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`};
  const weekDays=week=>Array.from({length:7},(_,i)=>addDays(week,i));
  const formatDate=key=>{const p=String(key).slice(0,10).split('-');return `${p[2]}/${p[1]}`};
  const time5=v=>String(v||'').slice(0,5);
  const minutes=v=>{const x=time5(v);return Number(x.slice(0,2))*60+Number(x.slice(3,5))};
  const shiftKind=start=>{const m=minutes(start);return m<720?'morning':m<1020?'afternoon':'evening'};
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleLabel={OWNER:'Chủ hệ thống',STORE_MANAGER:'Chủ cửa hàng',MANAGER:'Quản lý',EMPLOYEE:'Nhân viên',STAFF:'Nhân viên'};
  const createSupabase=()=>global.supabase?.createClient?global.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  let sb=null;
  const getSupabase=()=>sb||(sb=createSupabase());
  const getSession=async()=>{const client=getSupabase();if(!client)throw new Error('Supabase chưa sẵn sàng.');const q=await client.auth.getSession();if(q.error)throw q.error;return q.data.session||null};
  const getProfile=async()=>{const client=getSupabase(),session=await getSession();if(!session)return null;const q=await client.from('profiles').select('id,full_name,username,role,status').eq('id',session.user.id).single();if(q.error)throw q.error;return q.data};
  const requireActive=async()=>{const p=await getProfile();if(!p)throw new Error('Chưa đăng nhập.');if(String(p.status).toUpperCase()!=='ACTIVE')throw new Error('Tài khoản chưa được kích hoạt.');return p};
  const hasRole=(profile,roles)=>roles.map(String).map(x=>x.toUpperCase()).includes(String(profile?.role||'').toUpperCase());
  const accessibleStores=async()=>{const q=await getSupabase().rpc('get_manager_accessible_stores');if(q.error)throw q.error;return Array.isArray(q.data)?q.data:[]};
  const ui={
    toast:(message,type='info')=>{let el=document.getElementById('sharedCoreToast');if(!el){el=document.createElement('div');el.id='sharedCoreToast';el.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99999;max-width:380px;padding:12px 14px;border-radius:10px;background:#10213b;color:#fff;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(16,33,59,.2)';document.body.appendChild(el)}el.textContent=message;el.dataset.type=type;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,3500)},
    setLoading:(el,on=true)=>{if(!el)return;el.toggleAttribute('aria-busy',on);el.style.opacity=on?'.65':'1';el.style.pointerEvents=on?'none':''}
  };
  global.MAGASIN_CORE={version:'1.0.0',TZ,DAYS:['T2','T3','T4','T5','T6','T7','CN'],date:{dateKey,localDate,addDays,monday,weekDays,formatDate},time:{time5,minutes,shiftKind},security:{escapeHtml},roles:{label:roleLabel,hasRole},supabase:{create:getSupabase,getSession,getProfile,requireActive,rpc:(name,args)=>getSupabase().rpc(name,args)},stores:{accessible:accessibleStores},ui};
})(globalThis);
})();