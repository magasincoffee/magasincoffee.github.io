#!/usr/bin/env node
// XSTORE-019O: redact PostgreSQL restore stderr into non-sensitive error class.
// Run ONLY within a private GitHub Actions worker. Never print source stderr,
// SQL, row values, role or relation names, tokens, archive contents or SQL text.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const patterns = [
 ['MISSING_DATABASE_ROLE', /\brole\b.*\bdoes not exist\b/i],
 ['MISSING_ROLE_MEMBERSHIP', /\bmust be member of role\b/i],
 ['OWNER_PRIVILEGE', /\bmust be owner of\b|\bnot owner of\b/i],
 ['INSUFFICIENT_RESTORE_PRIVILEGE', /\bpermission denied\b|\binsufficient privilege\b/i],
 ['OBJECT_ALREADY_EXISTS', /\balready exists\b|\bduplicate (?:key|object|schema|relation)\b/i],
 ['MISSING_RELATION_OR_SCHEMA', /\b(?:relation|schema|table|view|sequence)\b.*\bdoes not exist\b/i],
 ['MISSING_FUNCTION_OR_TYPE', /\b(?:function|type|operator|procedure)\b.*\bdoes not exist\b/i],
 ['EXTENSION_DEPENDENCY', /\bextension\b/i],
 ['SQL_SYNTAX_OR_VERSION', /\bsyntax error\b|\bunsupported\b|\bversion mismatch\b/i],
 ['INVALID_OBJECT_STATE', /\bcannot (?:alter|drop|create|assign|change|set|be changed)\b|\bwrong object type\b/i],
 ['CONNECTIVITY_OR_DATABASE', /\bcould not connect\b|\bconnection refused\b|\bconnection.*closed\b|\bdatabase\b.*\bdoes not exist\b/i],
 ['INPUT_IO_OR_ARCHIVE', /\bcould not (?:read|open|write)\b|\binvalid archive\b|\bunexpected EOF\b/i]
];
function firstError(text) {
  const lines = text.split(/\r?\n/);
  return lines.find(x => /^pg_restore:\s*error:/i.test(x)) ||
    lines.find(x=>/^\s*(?:ERROR|FATAL):/i.test(x)) ||
    lines.find(x=>/error|fatal/i.test(x)) || 'ERROR_NOT_RECORDED';
}
function classify(text) {
  const error=firstError(text);
  // A hash is emitted for deterministic grouping; never the original message.
  const fingerprint=crypto.createHash('sha256').update(error).digest('hex').slice(0,12);
  const match=patterns.find(([,regex])=>regex.test(error));
  const category=match?.[0] || 'UNCLASSIFIED_FIRST_ERROR';
  return {category,fingerprint};
}
function selftest(){
  for(const [message,category] of [
    ['pg_restore: error: could not execute query: ERROR: role "sample_private_role" does not exist','MISSING_DATABASE_ROLE'],
    ['pg_restore: error: could not execute query: ERROR: relation "employees" does not exist','MISSING_RELATION_OR_SCHEMA'],
    ['pg_restore: error: could not execute query: ERROR: function hidden_fn() does not exist','MISSING_FUNCTION_OR_TYPE'],
    ['pg_restore: error: could not execute query: ERROR: permission denied for table "private"','INSUFFICIENT_RESTORE_PRIVILEGE'],
    ['pg_restore: error: could not execute query: ERROR: configuration parameter "a" cannot be changed','INVALID_OBJECT_STATE'],
    ['pg_restore: error: input file appears to be a text format dump','UNCLASSIFIED_FIRST_ERROR']
  ]) {
    const r=classify(message);
    assert.equal(r.category,category);
    assert.match(r.fingerprint,/^[0-9a-f]{12}$/);
    assert(!JSON.stringify(r).includes('private'));
  }
  console.log('XSTORE_019O_RESTORE_ERROR_REDACTION_SELFTEST=PASS; NO_SOURCE_STDERR_OUTPUT');
}
if(process.argv[2]==='selftest') selftest();
else if(process.argv.length===3){
  try{
    const raw=fs.readFileSync(process.argv[2],'utf8');
    const out=classify(raw);
    console.log('XSTORE_019O_FIRST_RESTORE_ERROR='+out.category+'; FINGERPRINT12='+out.fingerprint+'; NO_PII_OUTPUT');
  }catch{
    console.log('XSTORE_019O_FIRST_RESTORE_ERROR=NO_PRIVATE_LOG; NO_PII_OUTPUT');
    process.exitCode=1;
  }
}else{
  console.error('XSTORE_019O_RESTORE_ERROR_CLASSIFIER_USAGE');
  process.exitCode=1;
}
