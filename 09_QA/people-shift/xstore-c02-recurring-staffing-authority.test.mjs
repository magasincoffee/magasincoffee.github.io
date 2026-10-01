import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql=fs.readFileSync(
  "07_DATABASE/migrations/20261001172500_xstore_c02_recurring_staffing_authority_v1.sql",
  "utf8"
);

test("XSTORE-C02 creates one recurring-only staffing authority",()=>{
  assert.match(sql,/create table if not exists public\.workforce_recurring_staffing_requirements/);
  assert.match(sql,/day_of_week smallint not null check \(day_of_week between 1 and 7\)/);
  assert.match(sql,/target_headcount integer not null check \(target_headcount between 1 and 20\)/);
  assert.match(sql,/constraint workforce_recurring_staffing_time_check check \(end_time > start_time\)/);
  assert.match(sql,/unique \(store_id, day_of_week, start_time, end_time\)/);
  assert.doesNotMatch(sql,/insert into public\.staffing_requirements/);
  assert.doesNotMatch(sql,/insert into public\.staffing_requirement_templates/);
  assert.doesNotMatch(sql,/skill_code|min_skill_level|minimum_headcount|maximum_headcount/);
});

test("XSTORE-C02 browser authority is RPC-only and role/store scoped",()=>{
  assert.match(sql,/alter table public\.workforce_recurring_staffing_requirements enable row level security/);
  assert.match(sql,/revoke all on table public\.workforce_recurring_staffing_requirements[\s\S]*from public, anon, authenticated/);
  assert.match(sql,/list_workforce_recurring_staffing_requirements_v1/);
  assert.match(sql,/replace_workforce_recurring_staffing_requirements_v1/);
  assert.match(sql,/security definer/gi);
  assert.match(sql,/v_role not in \('OWNER','STORE_MANAGER'\)/);
  assert.match(sql,/p\.status='ACTIVE'/);
  assert.match(sql,/public\.can_access_store\(r\.store_id\)/);
  assert.match(sql,/public\.can_access_store\(s\.id\)/);
  assert.match(sql,/STORE_NOT_ALLOWED/);
  assert.match(sql,/grant execute on function public\.list_workforce_recurring_staffing_requirements_v1\(\)[\s\S]*to authenticated/);
  assert.match(sql,/grant execute on function public\.replace_workforce_recurring_staffing_requirements_v1\(jsonb\)[\s\S]*to authenticated/);
});

test("XSTORE-C02 replacement validates all rows before scoped mutation",()=>{
  const validatePos=sql.indexOf("-- Validate the complete board payload before any mutation.");
  const deletePos=sql.indexOf("delete from public.workforce_recurring_staffing_requirements");
  assert.ok(validatePos>=0 && deletePos>validatePos);
  assert.match(sql,/REQUIREMENTS_MUST_BE_ARRAY/);
  assert.match(sql,/RECURRING_STAFFING_PAYLOAD_MALFORMED/);
  assert.match(sql,/RECURRING_STAFFING_FIELDS_REQUIRED/);
  assert.match(sql,/STORE_NOT_ACTIVE/);
  assert.match(sql,/DAY_OF_WEEK_OUT_OF_RANGE/);
  assert.match(sql,/INVALID_RECURRING_STAFFING_INTERVAL/);
  assert.match(sql,/STAFFING_HEADCOUNT_OUT_OF_RANGE/);
  assert.match(sql,/DUPLICATE_RECURRING_STAFFING_REQUIREMENT/);
  assert.match(sql,/where r\.store_id=any\(v_scope_store_ids\)/);
  assert.match(sql,/'accessible_store_count',cardinality\(v_scope_store_ids\)/);
});

console.log("XSTORE_C02_RECURRING_STAFFING_AUTHORITY=PASS");
