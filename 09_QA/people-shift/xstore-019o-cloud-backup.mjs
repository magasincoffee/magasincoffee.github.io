#!/usr/bin/env node
// XSTORE-019O cloud-only backup gate. No production writes, no secrets in stdout.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pipeline} from 'node:stream/promises';

const project='menvbzlsncmpuvnaifxa';
const work=path.resolve(process.env.BACKUP_WORK||'.xstore-019o-cloud-work');
const magic=Buffer.from('MAGASIN_DB_BACKUP_V1\n','ascii');
const filenames={dump:'production.dump',encrypted:'production.dump.aes256gcm',restored:'restore-check.dump',manifest:'manifest.json'};
const file=n=>path.join(work,n);
const fail=message=>{throw new Error(message)};
async function sha256(name){
 const digest=crypto.createHash('sha256');
 for await(const chunk of fs.createReadStream(name))digest.update(chunk);
 return digest.digest('hex');
}
function key(){
 const hex=process.env.BACKUP_KEY||'';
 if(!/^[a-f0-9]{64}$/i.test(hex))fail('BACKUP_ENCRYPTION_KEY_MUST_BE_64_HEX');
 return Buffer.from(hex,'hex');
}
async function prepare(){
 const raw=process.env.DB_URL||'';
 if(!raw)fail('MISSING_MAGASIN_NOIBO_BACKUP_DATABASE_URL');
 key(); // fail before any database connection if the encryption key is missing
 let u;try{u=new URL(raw)}catch{fail('INVALID_DATABASE_URL_FORMAT')}
 if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname.endsWith('.pooler.supabase.com')
   ||u.port!=='5432'||u.username!=='postgres.'+project
   ||u.pathname!=='/postgres'||u.search||u.hash){
   fail('DATABASE_URL_MUST_USE_PROJECT_SESSION_POOLER_PORT_5432');
 }
 const password=decodeURIComponent(u.password);
 if(!password||/[\r\n]/.test(password))fail('INVALID_DATABASE_PASSWORD_FORMAT');
 await fs.promises.mkdir(work,{recursive:true,mode:0o700});
 const safeHost=u.hostname;
 const service='[magasin]\nhost='+safeHost+'\nport=5432\ndbname=postgres\nuser=postgres.'+project+'\nsslmode=require\nconnect_timeout=25\n';
 const pgEscape=v=>v.replace(/\\/g,'\\\\').replace(/:/g,'\\:');
 const pgpass=pgEscape(safeHost)+':5432:postgres:postgres.'+project+':'+pgEscape(password)+'\n';
 await fs.promises.writeFile(file('service.conf'),service,{mode:0o600});
 await fs.promises.writeFile(file('pgpass.conf'),pgpass,{mode:0o600});
 await fs.promises.chmod(file('service.conf'),0o600);
 await fs.promises.chmod(file('pgpass.conf'),0o600);
 console.log('CLOUD_BACKUP_SECRETS_VALIDATED; SESSION_POOLER_CONFIGURED; NO_DATABASE_WRITE');
}
async function encrypt(){
 key();
 const input=file(filenames.dump),output=file(filenames.encrypted);
 const original=await fs.promises.stat(input);
 if(original.size<1000)fail('DATABASE_DUMP_MISSING_OR_TOO_SMALL');
 const iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
 const out=fs.createWriteStream(output,{mode:0o600});
 await new Promise((resolve,reject)=>out.write(Buffer.concat([magic,iv]),err=>err?reject(err):resolve()));
 await pipeline(fs.createReadStream(input),cipher,out);
 await fs.promises.appendFile(output,cipher.getAuthTag());
 const manifest={
   project_ref:project,source_type:'PostgreSQL custom-format full database dump',
   encrypted_algorithm:'AES-256-GCM',capture_utc:new Date().toISOString(),
   dump_sha256:await sha256(input),encrypted_sha256:await sha256(output),
   dump_bytes:original.size,encrypted_bytes:(await fs.promises.stat(output)).size,
   archive_catalog_verified:false,restore_verified:false,
   production_write_performed:false,
   warning:'Encryption key is required for recovery; do not store it with this artifact.'
 };
 await fs.promises.writeFile(file(filenames.manifest),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
 console.log('DATABASE_ARCHIVE_ENCRYPTED; MANIFEST_CREATED; RESTORE_NOT_YET_VERIFIED');
}
async function decrypt(){
 const encrypted=file(filenames.encrypted),manifest=JSON.parse(await fs.promises.readFile(file(filenames.manifest),'utf8'));
 if(await sha256(encrypted)!==manifest.encrypted_sha256)fail('ENCRYPTED_ARCHIVE_HASH_MISMATCH');
 const size=(await fs.promises.stat(encrypted)).size;
 if(size<magic.length+12+16+1000)fail('ENCRYPTED_ARCHIVE_INVALID_LENGTH');
 const fd=await fs.promises.open(encrypted,'r');
 let iv,tag;
 try{
   const prefix=Buffer.alloc(magic.length),nonce=Buffer.alloc(12),tail=Buffer.alloc(16);
   await fd.read(prefix,0,prefix.length,0);
   await fd.read(nonce,0,12,prefix.length);
   await fd.read(tail,0,16,size-16);
   if(!crypto.timingSafeEqual(prefix,magic))fail('ARCHIVE_FORMAT_MISMATCH');
   iv=nonce;tag=tail;
 }finally{await fd.close()}
 const decipher=crypto.createDecipheriv('aes-256-gcm',key(),iv);
 decipher.setAuthTag(tag);
 await pipeline(fs.createReadStream(encrypted,{start:magic.length+12,end:size-17}),decipher,fs.createWriteStream(file(filenames.restored),{mode:0o600}));
 if(await sha256(file(filenames.restored))!==manifest.dump_sha256)fail('DECRYPTED_ARCHIVE_HASH_MISMATCH');
 console.log('AES_GCM_AUTHENTICATED_DECRYPT=PASS; RESTORE_STILL_PENDING');
}
async function markRestore(){
 const m=JSON.parse(await fs.promises.readFile(file(filenames.manifest),'utf8'));
 if(await sha256(file(filenames.encrypted))!==m.encrypted_sha256)fail('MANIFEST_VERIFICATION_FAILED');
 if(await sha256(file(filenames.restored))!==m.dump_sha256)fail('RESTORED_INPUT_HASH_MISMATCH');
 m.archive_catalog_verified=true;m.restore_verified=true;m.restored_utc=new Date().toISOString();
 m.restore_target='isolated ephemeral PostgreSQL 17 container';
 m.release_authorized=false;
 await fs.promises.writeFile(file(filenames.manifest),JSON.stringify(m,null,2)+'\n',{mode:0o600});
 console.log('ISOLATED_RESTORE_GATE=PASS; PRODUCTION_DEPLOYMENT_STILL_SEPARATELY_GATED');
}
try{
 switch(process.argv[2]){
  case 'prepare':await prepare();break;
  case 'encrypt':await encrypt();break;
  case 'decrypt':await decrypt();break;
  case 'mark-restore':await markRestore();break;
  default:fail('EXPECTED_COMMAND_PREPARE_ENCRYPT_DECRYPT_OR_MARK_RESTORE');
 }
}catch(e){console.error('XSTORE_019O_BACKUP_BLOCKED: '+(e?.message||'UNKNOWN'));process.exitCode=1}
