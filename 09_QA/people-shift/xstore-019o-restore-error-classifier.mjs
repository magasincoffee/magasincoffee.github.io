#!/usr/bin/env node
// XSTORE-019O private first SQL error + failed phase classifier.
// Never print raw SQL, PostgreSQL stderr, usernames, object names, JWTs or data.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const patterns = [
  ['MISSING_DATABASE_ROLE', /\brole\b.*\bdoes not exist\b/i],
  ['MISSING_ROLE_MEMBERSHIP', /\bmust be member of role\b/i],
  ['OWNER_PRIVILEGE', /\bmust be owner of\b|\bnot owner of\b/i],
  ['INSUFFICIENT_RESTORE_PRIVILEGE', /\bpermission denied\b|\binsufficient privilege\b|\bnot permitted\b/i],
  ['OBJECT_ALREADY_EXISTS', /\balready exists\b|\bduplicate (?:key|object|schema|relation)\b/i],
  ['MISSING_RELATION_OR_SCHEMA', /\b(?:relation|schema|table|view|sequence)\b.*\bdoes not exist\b/i],
  ['MISSING_FUNCTION_OR_TYPE', /\b(?:function|type|operator|procedure)\b.*\bdoes not exist\b/i],
  ['UNRECOGNIZED_CONFIGURATION', /\bunrecognized configuration parameter\b|\bunknown configuration parameter\b/i],
  ['EXTENSION_DEPENDENCY', /\bextension\b/i],
  ['SQL_SYNTAX_OR_VERSION', /\bsyntax error\b|\bunsupported\b|\bversion mismatch\b/i],
  ['INVALID_OBJECT_STATE', /\bcannot (?:alter|drop|create|assign|change|set|be changed)\b|\bwrong object type\b/i],
  ['CONNECTIVITY_OR_DATABASE', /\bcould not connect\b|\bconnection refused\b|\bconnection.*closed\b|\bdatabase\b.*\bdoes not exist\b/i],
  ['INPUT_IO_OR_ARCHIVE', /\bcould not (?:read|open|write)\b|\binvalid archive\b|\bunexpected EOF\b/i]
];

function firstPostgresError(raw) {
  const lines=raw.split(/\r?\n/);
  const first=lines.findIndex(x => /^\s*pg_restore:\s*error:/i.test(x));
  const begin=first<0 ? 0 : first;
  const window=lines.slice(begin,begin+20);
  // pg_restore often emits a generic header on one line and the *real*
  // PostgreSQL "ERROR: ..." on the next. Never classify only the header.
  const sqlErrors=window.flatMap((line,i) => {
    const inline=line.match(/\b(?:ERROR|FATAL|PANIC):\s*(.+)$/i);
    if (inline && inline[1].trim()) return [{message:inline[1].trim(),line:i}];
    return [];
  });
  const detail=sqlErrors[0];
  const message=detail?.message ||
    (window[0]||'ERROR_NOT_RECORDED').replace(/^pg_restore:\s*error:\s*/i,'').trim();
  // Command was: may be followed by the actual SQL statement on the next line.
  const commandIndex=window.findIndex(x=> /^\s*Command was:\s*/i.test(x));
  const commandStart=commandIndex>=0
    ? (window[commandIndex].replace(/^\s*Command was:\s*/i,'').trim() || window[commandIndex+1] || '')
    : '';
  const commandText=commandIndex>=0
    ? window.slice(commandIndex,commandIndex+5).join(' ')
        .replace(/^\s*Command was:\s*/i,'').trim()
    : '';
  let phase='UNKNOWN';
  if (/^\s*(?:ALTER\b.*\bOWNER TO\b|ALTER\b.*\bOWNER\b)/i.test(commandText)) phase='OWNER_CHANGE';
  else if (/^\s*GRANT\b/i.test(commandStart)) phase='ACL_GRANT';
  else if (/^\s*REVOKE\b/i.test(commandStart)) phase='ACL_REVOKE';
  else if (/^\s*(?:ALTER DEFAULT PRIVILEGES)\b/i.test(commandStart)) phase='DEFAULT_PRIVILEGES';
  else if (/^\s*ALTER\b/i.test(commandStart)) phase='ALTER_OBJECT';
  else if (/^\s*CREATE\s+EXTENSION\b/i.test(commandStart)) phase='CREATE_EXTENSION';
  else if (/^\s*CREATE\b/i.test(commandStart)) phase='CREATE_OBJECT';
  else if (/^\s*COPY\b/i.test(commandStart)) phase='RESTORE_DATA';
  else if (/^\s*SELECT\b/i.test(commandStart)) phase='RESTORE_SQL_CALL';
  return {message,phase};
}

function classify(raw) {
  const {message,phase}=firstPostgresError(raw);
  const category=patterns.find(([,regex]) => regex.test(message))?.[0] || 'UNCLASSIFIED_SQL_ERROR';
  // Group equivalent failures while stripping likely object identifiers,
  // quoted values and numeric IDs before deriving the fingerprint.
  const normalized=message.replace(/"[^"]*"/g,'"<OBJECT>')
    .replace(/'[^']*'/g,"'<VALUE>'")
    .replace(/\b\d+(?:\.\d+)?\b/g,'<NUMBER>');
  const fingerprint=crypto.createHash('sha256').update(normalized).digest('hex').slice(0,12);
  return {category,phase,fingerprint};
}

function selftest() {
  const samples=[
    ['pg_restore: error: could not execute query:\nERROR: role "private_role" does not exist\nCommand was: ALTER TABLE private OWNER TO private_role;', 'MISSING_DATABASE_ROLE','OWNER_CHANGE'],
    ['pg_restore: error: could not execute query: ERROR: role "another_private_role" does not exist\nCommand was: GRANT SELECT ON TABLE x TO another_private_role;', 'MISSING_DATABASE_ROLE','ACL_GRANT'],
    ['pg_restore: error: could not execute query:\nERROR: relation "staff_secret" already exists\nCommand was: CREATE TABLE "staff_secret" (id int);','OBJECT_ALREADY_EXISTS','CREATE_OBJECT'],
    ['pg_restore: error: could not execute query:\nERROR: unrecognized configuration parameter "private_config"\nCommand was: ALTER DATABASE abc SET private_config = 1;', 'UNRECOGNIZED_CONFIGURATION','ALTER_OBJECT'],
    ['pg_restore: error: could not execute query:\nERROR: must be owner of relation "staff_secret"\nCommand was: ALTER TABLE staff_secret OWNER TO abc;', 'OWNER_PRIVILEGE','OWNER_CHANGE'],
    ['pg_restore: error: could not execute query:\nERROR: permission denied for schema "staff_secret"\nCommand was: CREATE TABLE x (id int);', 'INSUFFICIENT_RESTORE_PRIVILEGE','CREATE_OBJECT'],
    ['pg_restore: error: could not execute query:\nERROR: some unknown error with contact jane@example.com\nCommand was: REVOKE ALL ON SCHEMA abc FROM a;', 'UNCLASSIFIED_SQL_ERROR','ACL_REVOKE']
  ];
  for(const [sample,category,phase] of samples) {
    const result=classify(sample);
    assert.equal(result.category,category);
    assert.equal(result.phase,phase);
    assert.match(result.fingerprint,/^[0-9a-f]{12}$/);
    for(const bad of ['jane@example.com','staff_secret','private_role','private_config']){
      assert(!JSON.stringify(result).includes(bad));
    }
  }
  // Same root message with distinct private role names must have one fingerprint.
  assert.equal(classify(samples[0][0]).fingerprint,
    classify(samples[0][0].replaceAll('private_role','other_role')).fingerprint);
  console.log('XSTORE_019O_FIRST_SQL_ERROR_SELFTEST=PASS; NO_SOURCE_STDERR_OUTPUT');
}

if (process.argv[2]==='selftest') selftest();
else if(process.argv.length===3) {
  try {
    const result=classify(fs.readFileSync(process.argv[2],'utf8'));
    console.log('XSTORE_019O_FIRST_RESTORE_ERROR='+result.category+
      '; PHASE='+result.phase+'; FINGERPRINT12='+result.fingerprint+'; NO_PII_OUTPUT');
  } catch {
    console.log('XSTORE_019O_FIRST_RESTORE_ERROR=NO_PRIVATE_LOG; NO_PII_OUTPUT');
    process.exitCode=1;
  }
} else {
  console.error('XSTORE_019O_RESTORE_ERROR_CLASSIFIER_USAGE');
  process.exitCode=1;
}
