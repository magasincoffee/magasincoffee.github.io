(()=>{'use strict';
/** MAGASIN Shared Core v1 — canonical cross-portal primitives. */
(function(global){
const SUPABASE_URL='https://menvbzlsncmpuvnaifxa.supabase.co',SUPABASE_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx',TZ='Asia/Ho_Chi_Minh';
const DAYS=['T2','T3','T4','T5','T6','T7','CN'],pad=n=>String(n).padStart(2,'0');
const dateKey=(d=new Date())=>{const p={};new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).forEach(x=>p[x.type]=x.value);return `${p.year}-${p.month}-${p.day}`};
const localDate=k=>new Date(`${String(k).slice(0,10)}T00:00:00+07:00`);
const addDays=(k,n)=>{const d=localDate(k);d.setUTCDate(d.getUTCDate()+n);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`};
const monday=k=>{const d=localDate(k||dateKey()),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-(day-1));return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`};
const weekDays=k=>Array.from({length:7},(_,i)=>addDays(k,i));
const formatDate=k=>{const p=String(k).slice(0,10).split('-');return `${p[2]}/${p[1]}`};
const time5=v=>String(v||'').slice(0,5),minutes=v=>{const x=time5(v);return Number(x.slice(0,2))*60+Number(x.slice(3,5))};
const shiftKind=start=>{const m=minutes(start);return m<720?'morning':m<1020?'afternoon':'evening'};
const escapeHtml=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const roleLabel={OWNER:'Chủ hệ thống',STORE_MANAGER:'Chủ cửa hàng',MANAGER:'Quản lý',INVENTORY_MANAGER:'Quản lý tồn hàng',EMPLOYEE:'Nhân viên',STAFF:'Nhân viên'};
let client=null;
const create=()=>global.supabase?.createClient?global.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const getSupabase=()=>client||(client=create());
const getSession=async()=>{const sb=getSupabase();if(!sb)throw Error('Supabase chưa sẵn sàng.');const q=await sb.auth.getSession();if(q.error)throw q.error;return q.data.session||null};
const getProfile=async()=>{const sb=getSupabase(),s=await getSession();if(!s)return null;const q=await sb.from('profiles').select('id,full_name,username,role,status').eq('id',s.user.id).single();if(q.error)throw q.error;return q.data};
const requireActive=async()=>{const p=await getProfile();if(!p)throw Error('Chưa đăng nhập.');if(String(p.status).toUpperCase()!=='ACTIVE')throw Error('Tài khoản chưa được kích hoạt.');return p};
const hasRole=(p,roles)=>roles.map(String).map(x=>x.toUpperCase()).includes(String(p?.role||'').toUpperCase());
const accessible=async()=>{const q=await getSupabase().rpc('get_manager_accessible_stores');if(q.error)throw q.error;return Array.isArray(q.data)?q.data:[]};
const activeStores=async()=>{const q=await getSupabase().from('stores').select('id,code,name,status').eq('status','ACTIVE').order('code');if(q.error)throw q.error;return Array.isArray(q.data)?q.data:[]};
const rpc=(name,args)=>getSupabase().rpc(name,args);
const ui={toast:(message,type='info')=>{let e=document.getElementById('sharedCoreToast');if(!e){e=document.createElement('div');e.id='sharedCoreToast';e.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99999;max-width:380px;padding:12px 14px;border-radius:10px;background:#10213b;color:#fff;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(16,33,59,.2)';document.body.appendChild(e)}e.textContent=message;e.dataset.type=type;e.hidden=false;clearTimeout(e._t);e._t=setTimeout(()=>e.hidden=true,3500)},setLoading:(e,on=true)=>{if(!e)return;e.toggleAttribute('aria-busy',on);e.style.opacity=on?'.65':'1';e.style.pointerEvents=on?'none':''}};
global.MAGASIN_CORE={version:'1.2.0',TZ,DAYS,date:{dateKey,localDate,addDays,monday,weekDays,formatDate},time:{time5,minutes,shiftKind},security:{escapeHtml},roles:{label:roleLabel,hasRole},supabase:{create,get:getSupabase,getSession,getProfile,requireActive,rpc},stores:{accessible,active:activeStores},ui};
})(globalThis);})();