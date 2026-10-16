#!/usr/bin/env node
// XSTORE-019O. Order original Storage archive DATA by real local FK dependencies.
// Never print archive TOC, object names, SQL, Storage records or identities.
import fs from 'node:fs';
import assert from 'node:assert/strict';

function orderedStorageToc(toc, fkTsv, protectedTsv) {
  const tableLines=new Map(), sequences=[];
  for (const line of toc.split(/\r?\n/)) {
    const table=line.match(/^\s*\d+;\s+\d+\s+\d+\s+TABLE DATA storage ([a-z_][a-z0-9_]*)\s+/);
    const seq=line.match(/^\s*\d+;\s+\d+\s+\d+\s+SEQUENCE SET storage ([a-z_][a-z0-9_]*)\s+/);
    if (/\bTABLE DATA storage\b/.test(line) && !table) throw Error('STORAGE_TOC_UNSUPPORTED_NAME');
    if (/\bSEQUENCE SET storage\b/.test(line) && !seq) throw Error('STORAGE_TOC_UNSUPPORTED_SEQUENCE');
    if (table) {
      if (tableLines.has(table[1])) throw Error('STORAGE_TOC_DUPLICATE');
      tableLines.set(table[1],line);
    }
    if (seq) sequences.push(line);
  }
  if (!tableLines.has('buckets') || tableLines.size < 2) throw Error('STORAGE_TOC_INCOMPLETE');
  const parents=new Map([...tableLines.keys()].map(name=>[name,new Set()]));
  let edgeCount=0;
  for (const raw of fkTsv.trim().split(/\r?\n/)) {
    if (!raw) continue;
    const parts=raw.split('|');
    if (parts.length!==2) throw Error('STORAGE_FK_FORMAT');
    const child=parts[0].trim(), parent=parts[1].trim();
    if (!/^storage\.[a-z_][a-z0-9_]*$/.test(child) || !/^[a-z_]+\.[a-z_][a-z0-9_]*$/.test(parent))
      throw Error('STORAGE_FK_UNEXPECTED_SCOPE');
    const childName=child.slice(8), parentName=parent.startsWith('storage.')?parent.slice(8):null;
    if (!tableLines.has(childName)) continue;
    if (!parentName || !tableLines.has(parentName)) throw Error('STORAGE_FK_PARENT_NOT_IN_ARCHIVE');
    if (childName!==parentName) parents.get(childName).add(parentName);
    edgeCount++;
  }
  if (edgeCount===0) throw Error('STORAGE_FK_GRAPH_EMPTY');
  const remaining=new Set(tableLines.keys()), ordered=[], orderNames=[];
  while (remaining.size) {
    const ready=[...remaining].filter(name=>[...parents.get(name)].every(p=>!remaining.has(p))).sort();
    if (!ready.length) throw Error('STORAGE_FK_GRAPH_CYCLE');
    const next=ready[0]; ordered.push(tableLines.get(next)); orderNames.push(next); remaining.delete(next);
  }
  // A real initialized Storage schema protects objects/buckets via DELETE triggers.
  // Never bypass those triggers: require their initialized tables to be empty.
  const protectedNames=new Set();
  for(const raw of protectedTsv.trim().split(/\\r?\\n/)) {
    if(!raw) continue;
    const n=raw.trim();
    if(!/^[a-z_][a-z0-9_]*$/.test(n) || !tableLines.has(n)) throw Error('STORAGE_DELETE_TRIGGER_INVENTORY_INVALID');
    protectedNames.add(n);
  }
  if (!protectedNames.has('objects') || !protectedNames.has('buckets'))
    throw Error('STORAGE_PROTECTED_DELETE_TRIGGER_MISSING');
  const guards=[...protectedNames].sort().map(n=>
    'DO $xstore$ BEGIN IF EXISTS (SELECT 1 FROM storage."'+n+'") THEN '+
    "RAISE EXCEPTION 'XSTORE_019O_STORAGE_PROTECTED_SEED_ROWS_PRESENT'; "+
    'END IF; END; $xstore$;');
  const clear=[...orderNames].reverse().filter(n=>!protectedNames.has(n))
    .map(n=>'DELETE FROM storage."'+n+'";');
  const clearSql='BEGIN;\n'+guards.join('\n')+'\n'+clear.join('\n')+'\nCOMMIT;\n';
  return {content:'; private Storage TABLE DATA topological replay; no schema or policy changes\n'+ordered.join('\n')+'\n'+sequences.join('\n')+'\n', clearSql, tables:ordered.length, edges:edgeCount};
}

function selftest() {
  const toc=[
    '; mock archive; data only',
    '123; 0 55 TABLE DATA storage objects postgres',
    '124; 0 56 TABLE DATA storage buckets postgres',
    '125; 0 57 TABLE DATA storage migrations postgres',
    '126; 0 58 SEQUENCE SET storage sessions_id_seq postgres',
    '127; 0 59 TABLE DATA public profiles postgres'
  ].join('\n');
  const graph='storage.objects|storage.buckets\nstorage.migrations|storage.buckets\n';
  const protectedTsv='objects\nbuckets\n';
  const ok=orderedStorageToc(toc,graph,protectedTsv);
  assert.equal(ok.tables,3);
  assert.equal(ok.edges,2);
  assert(ok.clearSql.startsWith('BEGIN;'));
  assert(ok.clearSql.endsWith('COMMIT;\n'));
  assert(!ok.clearSql.includes('DELETE FROM storage."objects"'));
  assert(!ok.clearSql.includes('DELETE FROM storage."buckets"'));
  assert(ok.clearSql.includes('DELETE FROM storage."migrations"'));
  assert(ok.clearSql.includes('XSTORE_019O_STORAGE_PROTECTED_SEED_ROWS_PRESENT'));
  assert(ok.clearSql.includes('IF EXISTS (SELECT 1 FROM storage."objects")'));
  assert(ok.clearSql.includes('IF EXISTS (SELECT 1 FROM storage."buckets")'));
  assert(!ok.clearSql.includes('CASCADE')&&!ok.clearSql.includes('TRUNCATE'));
  assert(!ok.clearSql.includes('session_replication_role'));
  assert(ok.content.indexOf('TABLE DATA storage buckets')<ok.content.indexOf('TABLE DATA storage objects'));
  assert(!ok.content.includes('TABLE DATA public'));
  assert(ok.content.includes('SEQUENCE SET storage sessions_id_seq'));
  assert.throws(()=>orderedStorageToc(toc,'storage.buckets|storage.objects\n'+graph,protectedTsv),/STORAGE_FK_GRAPH_CYCLE/);
  assert.throws(()=>orderedStorageToc(toc,'storage.objects|auth.users',protectedTsv),/STORAGE_FK_PARENT_NOT_IN_ARCHIVE/);
  assert.throws(()=>orderedStorageToc(toc.replace('TABLE DATA storage buckets','TABLE DATA storage unknown'),'storage.objects|storage.buckets',protectedTsv),/STORAGE_TOC_INCOMPLETE/);
  assert.throws(()=>orderedStorageToc(toc,graph,'objects\n'),/STORAGE_PROTECTED_DELETE_TRIGGER_MISSING/);
  assert.throws(()=>orderedStorageToc(toc,graph,'objects\nbuckets\npublic'),/STORAGE_DELETE_TRIGGER_INVENTORY_INVALID/);
  console.log('XSTORE_019O_STORAGE_FK_ORDER_SELFTEST=PASS; PROTECTED_DELETE_GUARDS=PASS; NO_ARCHIVE_OUTPUT');
}

if (process.argv[2]==='selftest') selftest();
else if(process.argv.length===7) {
  try {
    const result=orderedStorageToc(fs.readFileSync(process.argv[2],'utf8'),fs.readFileSync(process.argv[3],'utf8'),fs.readFileSync(process.argv[4],'utf8'));
    fs.writeFileSync(process.argv[5],result.content,{mode:0o600,flag:'wx'});
    fs.writeFileSync(process.argv[6],result.clearSql,{mode:0o600,flag:'wx'});
    console.log('XSTORE_019O_STORAGE_FK_ORDER_PLAN=PASS; FK_ENFORCED; NO_TOC_OUTPUT');
  } catch {
    console.error('::error::XSTORE_019O_STORAGE_FK_ORDER_PLAN=FAIL_CLOSED; NO_TOC_OUTPUT');
    process.exitCode=1;
  }
} else {
  console.error('XSTORE_019O_STORAGE_FK_ORDER_USAGE');
  process.exitCode=1;
}
