// Disposable HS256 signed PostgREST integration tests. No Supabase or real JWT.
import crypto from 'node:crypto';
const root=process.env.QA_POSTGREST_URL ?? 'http://127.0.0.1:3000';
const secret=process.env.QA_JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('QA_JWT_SECRET_REQUIRED');
const id={
 employee:'90000000-0000-4000-8000-000000000007',
 manager:'90000000-0000-4000-8000-000000000008',
 wrongManager:'90000000-0000-4000-8000-000000000009',
 owner:'90000000-0000-4000-8000-000000000010',
 cn3:'91000000-0000-4000-8000-000000000003',
 cn1:'91000000-0000-4000-8000-000000000001',
};
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=(sub,role='authenticated')=>{
 const content=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub,role,exp:Math.floor(Date.now()/1000)+600});
 return content+'.'+crypto.createHmac('sha256',secret).update(content).digest('base64url');
};
const date=new Date(Date.now()-3*86400000).toISOString().slice(0,10);
async function call(name,sub,body,expected=200,role='authenticated'){
 const headers={'content-type':'application/json'};
 if(sub) headers.authorization='Bearer '+token(sub,role);
 const response=await fetch(root+'/rpc/'+name,{method:'POST',headers,body:JSON.stringify(body)});
 const json=await response.json();
 if(response.status!==expected)throw Error(name+' '+response.status+' expected '+expected+' '+JSON.stringify(json));
 return json;
}
function check(ok,message){if(!ok)throw Error(message);}
const submission={p_store_id:id.cn3,p_work_date:date,p_actual_start:'12:00',p_actual_end:'15:00',p_reason:'Synthetic offshift request'};
const submit='submit_offschedule_attendance_request_v1';
const review='review_offschedule_attendance_request_v1';
const stores=await call('list_my_offschedule_stores_v1',id.employee,{});
check(stores.length===1&&stores[0].store_id===id.cn3,'pilot stores only');
const first=await call(submit,id.employee,submission);
check(first.status==='NEEDS_REVIEW' && first.already_submitted===false,'employee first submission');
const retry=await call(submit,id.employee,submission);
check(retry.already_submitted===true&&retry.request_id===first.request_id,'idempotent retry');
await call(submit,id.employee,{...submission,p_store_id:id.cn1},400);
await call(submit,id.employee,{...submission,p_actual_start:'14:00',p_actual_end:'16:00'},400);
await call(submit,id.owner,submission,400);
await call(submit,id.employee,{...submission,p_work_date:'2099-10-24'},400);
const employeeRows=await call('list_my_offschedule_attendance_requests_v1',id.employee,{});
check(Array.isArray(employeeRows)&&employeeRows.length===1&&employeeRows[0].request_id===first.request_id,'employee only own records');
const managerRows=await call('list_manager_offschedule_attendance_requests_v1',id.manager,{p_store_id:id.cn3});
check(Array.isArray(managerRows)&&managerRows.length===1&&managerRows[0].status==='NEEDS_REVIEW','Manager pending list');
await call('list_manager_offschedule_attendance_requests_v1',id.wrongManager,{p_store_id:id.cn3},400);
await call('list_manager_offschedule_attendance_requests_v1',id.employee,{p_store_id:id.cn3},400);
const ownerRows=await call('list_owner_offschedule_attendance_requests_v1',id.owner,{p_store_id:id.cn3});
check(Array.isArray(ownerRows)&&ownerRows.length===1,'Owner read-only projection');
await call('list_owner_offschedule_attendance_requests_v1',id.manager,{p_store_id:id.cn3},400);
const target={p_request_id:first.request_id,p_decision:'APPROVE'};
await call(review,id.employee,target,400);
await call(review,id.wrongManager,target,400);
await call(review,id.owner,target,400);
const approved=await call(review,id.manager,target);
check(approved.decision==='APPROVE' && approved.payroll_included===false && approved.schedule_created===false,'manager review and payroll firewall');
await call(review,id.manager,target,400);
const after=await call('list_my_offschedule_attendance_requests_v1',id.employee,{});
check(after.length===1&&after[0].status==='APPROVED'&&after[0].confirmed_minutes===180,'Employee sees review result');
const badToken=token(id.employee).replace(/.$/,'x');
const invalid=await fetch(root+'/rpc/'+submit,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+badToken},body:JSON.stringify(submission)});
check(invalid.status===401,'invalid jwt signature must fail');
const direct=await fetch(root+'/attendance_offschedule_requests_v1',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token(id.employee)},body:JSON.stringify({employee_id:id.employee,store_id:id.cn3,work_date:date,actual_start:'16:00',actual_end:'17:00',reason:'Forbidden'})});
check(direct.status===401||direct.status===403,'direct DML must be rejected');
console.log('OFFSCHEDULE_524_SIGNED_JWT_PASS employee/idempotency/store-manager-owner/approval/directDML/tamperedJWT');
