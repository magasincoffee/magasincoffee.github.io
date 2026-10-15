#!/usr/bin/env node
// XSTORE-019O. Order original Auth archive DATA by real local FK dependencies.
// Never print archive TOC, object names, SQL, Auth records or identities.
import fs from 'node:fs';
import assert from 'node:assert/strict';

function orderedAuthToc(toc, fkTsv) {
  const tableLines=new Map(), sequences=[];
  for (const line of toc.split(/\r?\n/)) {
    const table=line.match(/^\s*\d+;\s+\d+\s+\d+\s+TABLE DATA auth ([a-z_][a-z0-9_]*)\s+/);
    const seq=line.match(/^\s*\d+;\s+\d+\s+\d+\s+SEQUENCE SET auth ([a-z_][a-z0-9_]*)\s+/);
    if (/\bTABLE DATA auth\b/.test(line) && !table) throw Error('AUTH_TOC_UNSUPPORTED_NAME');
    if (/\bSEQUENCE SET auth\b/.test(line) && !seq) throw Error('AUTH_TOC_UNSUPPORTED_SEQUENCE');
    if (table) {
      if (tableLines.has(table[1])) throw Error('AUTH_TOC_DUPLICATE');
      tableLines.set(table[1],line);
    }
    if (seq) sequences.push(line);
  }
  if (!tableLines.has('users') || tableLines.size < 2) throw Error('AUTH_TOC_INCOMPLETE');
  const parents=new Map([...tableLines.keys()].map(name=>[name,new Set()]));
  let edgeCount=0;
  for (const raw of fkTsv.trim().split(/\r?\n/)) {
    if (!raw) continue;
    const parts=raw.split('\t');
    if (parts.length!==2) throw Error('AUTH_FK_FORMAT');
    const child=parts[0].trim(), parent=parts[1].trim();
    if (!/^auth\.[a-z_][a-z0-9_]*$/.test(child) || !/^[a-z_]+\.[a-z_][a-z0-9_]*$/.test(parent))
      throw Error('AUTH_FK_UNEXPECTED_SCOPE');
    const childName=child.slice(5), parentName=parent.startsWith('auth.')?parent.slice(5):null;
    if (!tableLines.has(childName)) continue;
    if (!parentName || !tableLines.has(parentName)) throw Error('AUTH_FK_PARENT_NOT_IN_ARCHIVE');
    if (childName!==parentName) parents.get(childName).add(parentName);
    edgeCount++;
  }
  if (edgeCount===0) throw Error('AUTH_FK_GRAPH_EMPTY');
  const remaining=new Set(tableLines.keys()), ordered=[];
  while (remaining.size) {
    const ready=[...remaining].filter(name=>[...parents.get(name)].every(p=>!remaining.has(p))).sort();
    if (!ready.length) throw Error('AUTH_FK_GRAPH_CYCLE');
    const next=ready[0]; ordered.push(tableLines.get(next)); remaining.delete(next);
  }
  return {content:'; private Auth TABLE DATA topological replay; no schema or policy changes\n'+ordered.join('\n')+'\n'+sequences.join('\n')+'\n', tables:ordered.length, edges:edgeCount};
}

function selftest() {
  const toc=[
    '; mock archive; data only',
    '123; 0 55 TABLE DATA auth identities postgres',
    '124; 0 56 TABLE DATA auth users postgres',
    '125; 0 57 TABLE DATA auth sessions postgres',
    '126; 0 58 SEQUENCE SET auth sessions_id_seq postgres',
    '127; 0 59 TABLE DATA public profiles postgres'
  ].join('\n');
  const graph='auth.identities\tauth.users\nauth.sessions\tauth.users\n';
  const ok=orderedAuthToc(toc,graph);
  assert.equal(ok.tables,3);
  assert.equal(ok.edges,2);
  assert(ok.content.indexOf('TABLE DATA auth users')<ok.content.indexOf('TABLE DATA auth identities'));
  assert(!ok.content.includes('TABLE DATA public'));
  assert(ok.content.includes('SEQUENCE SET auth sessions_id_seq'));
  assert.throws(()=>orderedAuthToc(toc,'auth.users\tauth.identities\n'+graph),/AUTH_FK_GRAPH_CYCLE/);
  assert.throws(()=>orderedAuthToc(toc,'auth.identities\tstorage.objects'),/AUTH_FK_PARENT_NOT_IN_ARCHIVE/);
  assert.throws(()=>orderedAuthToc(toc.replace('TABLE DATA auth users','TABLE DATA auth unknown'),'auth.identities\tauth.users'),/AUTH_TOC_INCOMPLETE/);
  console.log('XSTORE_019O_AUTH_FK_ORDER_SELFTEST=PASS; NO_ARCHIVE_OUTPUT');
}

if (process.argv[2]==='selftest') selftest();
else if(process.argv.length===5) {
  try {
    const result=orderedAuthToc(fs.readFileSync(process.argv[2],'utf8'),fs.readFileSync(process.argv[3],'utf8'));
    fs.writeFileSync(process.argv[4],result.content,{mode:0o600,flag:'wx'});
    console.log('XSTORE_019O_AUTH_FK_ORDER_PLAN=PASS; FK_ENFORCED; NO_TOC_OUTPUT');
  } catch {
    console.error('::error::XSTORE_019O_AUTH_FK_ORDER_PLAN=FAIL_CLOSED; NO_TOC_OUTPUT');
    process.exitCode=1;
  }
} else {
  console.error('XSTORE_019O_AUTH_FK_ORDER_USAGE');
  process.exitCode=1;
}
