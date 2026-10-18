import fs from 'node:fs';
import path from 'node:path';
const required = [
 'public.profiles', 'public.stores','public.work_schedules',
 'public.employee_store_priorities','public.schedule_generation_assignments'
];
const manifest=process.env.LIFECYCLE_FULL_SCHEMA_MANIFEST||'09_QA/people-shift/lifecycle-full-schema-manifest.json';
if(!fs.existsSync(manifest)){
 console.error('ID78_BLOCKED: no verified full-schema manifest. Synthetic fixture is not full-schema parity.');
 process.exit(2);
}
let m;
try{m=JSON.parse(fs.readFileSync(manifest,'utf8'))}catch{console.error('ID78_BLOCKED: invalid manifest');process.exit(2)}
if(m.source_project_ref!=='menvbzlsncmpuvnaifxa'||m.schema_only!==true||m.isolated_restore_success!==true||m.owner_acl_rls_parity_success!==true||!Array.isArray(m.tables)||!required.every(t=>m.tables.includes(t))||!/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(String(m.schema_digest||''))||!/^https:\/\/github.com\/magasincoffee\/magasincoffee.github.io\/actions\/runs\/\d+$/.test(String(m.evidence_run_url||''))){
 console.error('ID78_BLOCKED: manifest lacks required source, coverage, restore and ACL/RLS evidence.');
 process.exit(2);
}
console.log('ID78 full-schema manifest shape validated; verify evidence run independently before PASS.');
