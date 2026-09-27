(()=>{
'use strict';
const qs=new URL(globalThis.location.href).searchParams;
const role=(qs.get('qaRole')||'OWNER').toUpperCase();
const loading=document.getElementById('loading'),denied=document.getElementById('denied'),app=document.getElementById('app');
const allowed=role==='OWNER'||role==='ACCOUNTANT';
if(!allowed){
 loading?.classList.add('hidden');app?.classList.add('hidden');denied?.classList.remove('hidden');
 const text=document.getElementById('deniedText');if(text)text.textContent='Tài khoản hiện tại chưa được cấp quyền Owner hoặc Kế toán.';
 return;
}
const user=document.getElementById('userName');if(user)user.textContent=(role==='OWNER'?'Owner QA · Owner':'Accounting QA · Kế toán');
loading?.classList.add('hidden');denied?.classList.add('hidden');app?.classList.remove('hidden');
const nav=document.getElementById('nav');
nav?.addEventListener('click',e=>{
 const b=e.target.closest('button[data-tab]');if(!b)return;
 nav.querySelectorAll('button[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
 document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='sec-'+b.dataset.tab));
});
const open=id=>document.getElementById(id)?.showModal();
document.getElementById('newOrderBtn')?.addEventListener('click',()=>open('orderDialog'));
document.getElementById('newProductBtn')?.addEventListener('click',()=>open('productDialog'));
document.getElementById('newSupplierBtn')?.addEventListener('click',()=>open('supplierDialog'));
document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>document.getElementById(x.dataset.close)?.close()));
})();