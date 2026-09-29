import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql=fs.readFileSync("07_DATABASE/migrations/20260929071500_xstore_weekly_plan_union_order_repair.sql","utf8");

test("cross-store weekly plan wraps UNION before ORDER BY",()=>{
  assert.match(sql,/from\s*\(\s*select[\s\S]*union all[\s\S]*\) q\s*order by q\.store_code,q\.work_date,q\.start_time,q\.employee_name,q\.user_id;/i);
  assert.match(sql,/as store_code/);
  assert.match(sql,/as employee_name/);
  assert.match(sql,/grant execute on function public\.get_cross_store_weekly_plan_v1\(date\) to authenticated/);
});

console.log("XSTORE_WEEKLY_PLAN_UNION_ORDER_REPAIR=PASS");
