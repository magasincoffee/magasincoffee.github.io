import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const migrationUrl = new URL("07_DATABASE/migrations/20260923095500_task_103_payroll_calculation_integration_v1.sql", root);

async function sql() {
  return fs.readFile(migrationUrl, "utf8");
}

test("TASK-103 creates one canonical payroll_entries persistence surface", async () => {
  const source = await sql();
  assert.match(source, /create table public\.payroll_entries/i);
  assert.match(source, /unique \(period_start, period_end, employee_id, payroll_revision\)/i);
  assert.match(source, /state in \('ESTIMATED','REVIEWED','FINALIZED','PAID'\)/i);
});

test("TASK-103 builder is server-only and browser roles have no payroll mutation authority", async () => {
  const source = await sql();
  assert.match(source, /security definer/i);
  assert.match(source, /set search_path = public/i);
  assert.match(source, /revoke all on table public\.payroll_entries from public, anon, authenticated/i);
  assert.match(source, /revoke execute on function public\.build_payroll_estimate_v1[\s\S]*from public, anon, authenticated/i);
  assert.match(source, /grant execute on function public\.build_payroll_estimate_v1[\s\S]*to service_role, postgres/i);
});

test("TASK-103 source query consumes reviewed confirmed work time only", async () => {
  const source = await sql();
  assert.match(source, /a\.status = 'APPROVED' and a\.review_decision = 'APPROVE'/i);
  assert.match(source, /a\.status = 'ADJUSTED' and a\.review_decision = 'ADJUST'/i);
  assert.match(source, /a\.confirmed_start is not null/i);
  assert.match(source, /a\.confirmed_end is not null/i);
  assert.match(source, /a\.confirmed_minutes is not null/i);
  assert.match(source, /a\.reviewed_at is not null/i);
  assert.match(source, /a\.reviewed_by is not null/i);
});

test("TASK-103 never consumes legacy attendance payroll-like fields", async () => {
  const source = await sql();
  const executable = source
    .replace(/comment on[\s\S]*?;/gi, "")
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
  assert.doesNotMatch(executable, /a\.amount|attendance\.amount/i);
  assert.doesNotMatch(executable, /a\.hourly_rate|attendance\.hourly_rate/i);
  assert.doesNotMatch(executable, /a\.hours_worked|attendance\.hours_worked/i);
  assert.doesNotMatch(executable, /employee_grades/i);
});

test("TASK-103 requires explicit validated opaque pay-rule reference", async () => {
  const source = await sql();
  assert.match(source, /PAY_RULE_REFERENCE_REQUIRED/);
  assert.match(source, /PAY_RULE_NOT_VALIDATED/);
  assert.match(source, /pay_rule_validated is true/i);
});

test("TASK-103 uses a shared advisory lock and deterministic logical identity", async () => {
  const source = await sql();
  assert.match(source, /pg_advisory_xact_lock/i);
  assert.match(source, /payroll_estimate_v1:/i);
  assert.match(source, /p_period_start::text[\s\S]*p_period_end::text[\s\S]*p_employee_id::text[\s\S]*v_revision/i);
});

test("TASK-103 retry is idempotent and changed source requires a new payroll revision", async () => {
  const source = await sql();
  assert.match(source, /already_existing', true/i);
  assert.match(source, /PAYROLL_REVISION_CONFLICT/);
  assert.match(source, /confirmed_work_source_revision = v_source_revision/i);
});

test("TASK-103 creates ESTIMATED only and does not implement finalization", async () => {
  const source = await sql();
  assert.match(source, /'ESTIMATED'/);
  assert.doesNotMatch(source, /update public\.payroll_entries\s+set\s+state/i);
  assert.doesNotMatch(source, /PAYROLL_AUTHORIZED/);
});

test("TASK-103 deliberately does not calculate a monetary amount", async () => {
  const source = await sql();
  assert.doesNotMatch(source, /calculated_amount\s+numeric|amount\s+numeric/i);
  assert.match(source, /'monetary_amount', null/i);
  assert.match(source, /CANONICAL_PAY_RULE_EVALUATOR_UNRESOLVED/);
});
