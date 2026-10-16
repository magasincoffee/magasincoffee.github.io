#!/usr/bin/env node
// XSTORE-019O: replay only the original schema-scoped DEFAULT ACL before creating Public objects.
// The authenticated encrypted archive is the only source; never print SQL, roles or TOC names.
import fs from 'node:fs';
import assert from 'node:assert/strict';

function plan(toc) {
  const entries = [];
  for (const line of toc.split(/\r?\n/)) {
    if (/\bDEFAULT ACL public\b/.test(line)) {
      if (!/^\s*\d+;\s+\d+\s+\d+\s+DEFAULT ACL public \S/.test(line))
        throw Error('DEFAULT_ACL_TOC_FORMAT_UNSUPPORTED');
      entries.push(line);
    }
  }
  // The pinned MAGASIN-NOIBO snapshot has six Public default-ACL catalog records.
  // Fail closed rather than silently falling back to local Supabase defaults.
  if (entries.length !== 6) throw Error('PUBLIC_DEFAULT_ACL_ARCHIVE_COUNT_MISMATCH');
  if (new Set(entries).size !== entries.length) throw Error('PUBLIC_DEFAULT_ACL_DUPLICATE');
  return '; original public defaults BEFORE public pre-data; private archive entries\n' +
    entries.join('\n') + '\n';
}

function selftest() {
  const toc = [
    '; simulated archive only',
    ...Array.from({length: 6}, (_,i)=>String(i+100)+'; 0 0 DEFAULT ACL public DEFAULT PRIVILEGES FOR FUNCTIONS private_role'),
    '199; 0 0 ACL public TABLE unrelated postgres',
    '200; 0 0 DEFAULT ACL auth DEFAULT PRIVILEGES FOR TABLES postgres',
    '201; 0 0 TABLE DATA public private_data postgres'
  ].join('\n');
  const r=plan(toc);
  assert.equal(r.split('\n').filter(x=>x.includes('DEFAULT ACL public')).length, 6);
  assert(!r.includes('ACL auth') && !r.includes('ACL public TABLE') && !r.includes('TABLE DATA'));
  assert.throws(()=>plan(toc.replace('105; 0 0 DEFAULT ACL public','105; 0 0 DEFAULT ACL auth')),
    /PUBLIC_DEFAULT_ACL_ARCHIVE_COUNT_MISMATCH/);
  assert.throws(()=>plan(toc.replace('105; 0 0 DEFAULT ACL public','105; malformed DEFAULT ACL public')),
    /DEFAULT_ACL_TOC_FORMAT_UNSUPPORTED/);
  console.log('XSTORE_019O_EARLY_DEFAULT_ACL_SELFTEST=PASS; NO_TOC_OUTPUT');
}
if(process.argv[2] === 'selftest') selftest();
else if(process.argv.length === 4) {
  try {
    fs.writeFileSync(process.argv[3],plan(fs.readFileSync(process.argv[2],'utf8')),
      {mode:0o600,flag:'wx'});
    console.log('XSTORE_019O_EARLY_DEFAULT_ACL_PLAN=PASS; COUNT=6; NO_TOC_OUTPUT');
  } catch {
    console.error('::error::XSTORE_019O_EARLY_DEFAULT_ACL_PLAN=FAIL_CLOSED');
    process.exitCode=1;
  }
} else {
  console.error('XSTORE_019O_EARLY_DEFAULT_ACL_USAGE');
  process.exitCode=1;
}
