#!/usr/bin/env node
// XSTORE-019O. Replay only the genuine public ACL entries from the encrypted archive.
// Never print private TOC, SQL statements, table/function names, roles or data.
import fs from 'node:fs';
import assert from 'node:assert/strict';

function publicAclToc(toc) {
  const selected=[];
  let objectAclCount=0;
  for(const line of toc.split(/\r?\n/)) {
    const match=line.match(/^\s*\d+;\s+\d+\s+\d+\s+(ACL|DEFAULT ACL)\s+(public|-)\s+(.+)$/);
    if (/\b(?:ACL|DEFAULT ACL)\s+public\b/.test(line) && !match)
      throw Error('PUBLIC_ACL_TOC_UNSUPPORTED');
    if(!match) continue;
    const [,kind,scope,remainder]=match;
    if(scope==='public') {
      selected.push(line);
      if(kind==='ACL') objectAclCount++;
    } else if(kind==='ACL' && /^public\s+\S/.test(remainder)) {
      // The archive schema privilege entry is written as "ACL - public ...".
      selected.push(line);
    }
  }
  if (objectAclCount===0) throw Error('PUBLIC_OBJECT_ACL_ARCHIVE_MISSING');
  return {count:selected.length,content:'; private public ACL-only replay; no section filter\n'+selected.join('\n')+'\n'};
}
function selftest(){
  const sample=[
    '; Archive TOC',
    '100; 0 0 ACL public TABLE private_staff postgres',
    '101; 0 0 ACL public FUNCTION private_fn(integer) postgres',
    '102; 0 0 DEFAULT ACL public DEFAULT PRIVILEGES FOR TABLES postgres',
    '103; 0 0 ACL - public postgres',
    '104; 0 0 ACL auth TABLE secret_users postgres',
    '105; 0 0 ACL storage TABLE secret_objects postgres',
    '106; 0 0 TABLE DATA public staff postgres'
  ].join('\n');
  const r=publicAclToc(sample);
  assert.equal(r.count,4);
  assert(r.content.includes('ACL public TABLE'));
  assert(r.content.includes('ACL public FUNCTION'));
  assert(r.content.includes('DEFAULT ACL public'));
  assert(r.content.includes('ACL - public'));
  assert(!r.content.includes('ACL auth'));
  assert(!r.content.includes('ACL storage'));
  assert(!r.content.includes('TABLE DATA'));
  assert.throws(()=>publicAclToc('1; 0 0 TABLE DATA public x postgres'),/PUBLIC_OBJECT_ACL_ARCHIVE_MISSING/);
  assert.throws(()=>publicAclToc('2; 0 0 ACL public'),/PUBLIC_ACL_TOC_UNSUPPORTED/);
  console.log('XSTORE_019O_PUBLIC_ACL_TOC_SELFTEST=PASS; PRIVATE_TOC_NOT_PRINTED');
}
if(process.argv[2]==='selftest') selftest();
else if(process.argv.length===4){
  try{
    const result=publicAclToc(fs.readFileSync(process.argv[2],'utf8'));
    fs.writeFileSync(process.argv[3],result.content,{mode:0o600,flag:'wx'});
    console.log('XSTORE_019O_PUBLIC_ACL_TOC_PLAN=PASS; ITEMS='+result.count+'; NO_TOC_OUTPUT');
  }catch{
    console.error('::error::XSTORE_019O_PUBLIC_ACL_TOC_PLAN=FAIL_CLOSED; NO_TOC_OUTPUT');
    process.exitCode=1;
  }
}else{
  console.error('XSTORE_019O_PUBLIC_ACL_TOC_USAGE');
  process.exitCode=1;
}
