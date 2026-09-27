import fs from "node:fs";
import path from "node:path";

const ROOT=process.env.QA_ROOT||"qa-artifacts";
const OUT=path.join(ROOT,"ui2-cross-role");
fs.mkdirSync(OUT,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const requirePass=(label,r)=>{if(r.status!=="PASS")throw new Error(label+" status="+r.status)};

const auth=read("ui2-cross-role/ui2-016-auth-responsive-report.json");
const sched=read("people-shift/sched-07-ui-responsive-report.json");
const secondary=read("people-shift/ui2-008-employee-secondary-report.json");
const people=read("people-shift/ui2-009-employee-people-report.json");
const m11=read("people-shift/ui2-011-manager-shell-today-report.json");
const m12=read("people-shift/ui2-012-manager-scheduling-report.json");
const m13=read("people-shift/ui2-013-manager-operations-report.json");
const o14=read("control-tower/ui2-014-owner-oversight-report.json");
const o15=read("control-tower/ui2-015-owner-drilldown-report.json");
for(const [n,r] of Object.entries({auth,sched,secondary,people,m11,m12,m13,o14,o15}))requirePass(n,r);

const checks=(report,patterns)=>report.checks.filter(x=>patterns.some(p=>p.test(x.name))).map(x=>({name:x.name,status:x.status,detail:x.detail}));
const matrix={
  generated_at:new Date().toISOString(),
  status:"PASS",
  production_gap:{
    gap:"Shared Manager/Owner shell enters drawer mode at <=1024px while menu/nav/logout touch targets remained 40px until <=600px.",
    fix:"Shared shell now applies --m-control-touch-height (44px) to menu/icon/nav/logout controls throughout the <=1024px drawer breakpoint; affected cache chains bumped to UI2-016.",
    authority:"Presentation sizing/cache only; no route, RPC/API, data source, writer, state machine, RLS, schema or business logic change."
  },
  roles:[
    {role:"Auth",viewports:[390,768,1280],surfaces:["login","register","recovery","reset-checking","reset-error","reset","pending"],evidence:checks(auth,[/ui2_016_auth_/])},
    {role:"Employee",viewports:[360,390,430,768],surfaces:["shell","Today","Schedule","Availability","Swap-Give","Attendance","Payroll","Profile"],evidence:[
      ...checks(sched,[/ui2_005_employee_.*bottom_nav_bounds_touch_and_no_overflow/,/ui2_006_employee_today_.*responsive_touch_no_collision/,/ui2_007_employee_schedule_.*responsive_touch_no_collision/]),
      ...checks(secondary,[/ui2_008_availability_.*responsive_touch_focus_safe_area/,/ui2_008_swap_.*touch_focus_no_overflow/]),
      ...checks(people,[/ui2_009_(attendance|payroll|profile)_.*phone_contract/])
    ]},
    {role:"Manager",viewports:[1440,1024,768,390],surfaces:["shell","Today","Scheduling","Swap-Give","Attendance","Employees","Payroll"],evidence:[
      ...checks(m11,[/ui2_011_(1440|1024|768|390)_shell_today_layout_focus_nav/]),
      ...checks(m12,[/ui2_012_(1440|1024|768|390)_hierarchy_no_page_overflow_touch_focus/]),
      ...checks(m13,[/ui2_013_(1440|1024|768|390)_.*_(hierarchy_responsive|keyboard_focus)/])
    ]},
    {role:"Owner",viewports:[1280,768,390],surfaces:["Overview","Attention","Workforce","Procurement","Access","Finance unavailable"],evidence:[
      ...checks(o14,[/ui2_014_owner_(1280|768|390)_/]),
      ...checks(o15,[/ui2_015_(workforce|procurement|access)_(1280|768|390)_/,/ui2_015_finance_has_no_clickable_route_or_runtime/,/ui2_015_.*reload|round_trip|friendly_source/])
    ]}
  ],
  representative_screenshots:[
    "ui2-cross-role/ui2-016-auth-login-390.png",
    "people-shift/ui2-007-employee-schedule-phone-360.png",
    "people-shift/ui2-007-employee-schedule-phone-390.png",
    "people-shift/ui2-007-employee-schedule-phone-430.png",
    "people-shift/ui2-011-manager-today-1440.png",
    "people-shift/ui2-011-manager-today-1024.png",
    "people-shift/ui2-011-manager-today-768.png",
    "people-shift/ui2-011-manager-today-390.png",
    "control-tower/ui2-014-owner-1280.png",
    "control-tower/ui2-014-owner-768.png",
    "control-tower/ui2-014-owner-390.png"
  ]
};
for(const role of matrix.roles){
  if(!role.evidence.length)throw new Error(role.role+" matrix has no evidence");
  const failed=role.evidence.filter(x=>x.status!=="PASS");
  if(failed.length)throw new Error(role.role+" failed "+JSON.stringify(failed));
}
for(const rel of matrix.representative_screenshots){
  if(!fs.existsSync(path.join(ROOT,rel)))throw new Error("missing representative screenshot "+rel);
}
fs.writeFileSync(path.join(OUT,"ui2-016-cross-role-matrix.json"),JSON.stringify(matrix,null,2));
console.log("UI2_016_CROSS_ROLE_MATRIX=PASS");
