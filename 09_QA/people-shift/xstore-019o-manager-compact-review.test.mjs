import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const draft=fs.readFileSync('05_MANAGER/Workforce/draft-publish-v1.js','utf8');
const boards=fs.readFileSync('05_MANAGER/Workforce/manager-five-board-v4.js','utf8');

test('XSTORE-019O all shift types must be visible without guessing legacy employment',()=>{
 const badge=draft.slice(draft.indexOf('function assignmentEmploymentBadge('),draft.indexOf('function groupOverlappingAssignments('));
 assert.match(badge,/employment_type/);
 for(const type of ['FULL_TIME','PART_TIME','Chưa phân loại'])assert.ok(badge.includes(type),'missing label '+type);
 assert.match(badge,/data-employment-type/);
 assert.match(draft,/msd-direct-name[^\n]*assignmentEmploymentBadge\(a\)/);
 assert.match(draft,/msd-cluster-meta[^\n]*assignmentEmploymentBadge\(a\)/);
 assert.doesNotMatch(badge,/PART_TIME.*\:\s*'PART_TIME'/);
});
test('XSTORE-019O Manager step 3 shows compact classification coverage, not fake FT/PT for unconfigured staff',()=>{
 assert.match(boards,/function syncEmploymentSummary\(sh,s\)/);
 assert.match(boards,/data-x19o-employment-summary/);
 assert.match(boards,/Chưa phân loại/);
 assert.match(boards,/Chức năng phân loại chưa được triển khai/);
 assert.match(boards,/syncEmploymentSummary\(sh,s\)/);
});
test('XSTORE-019O step 4 renders three overview metrics and disclosure for individual shortages',()=>{
 const from=boards.indexOf('function syncCheckRail('),to=boards.indexOf('function syncEmploymentSummary(',from);
 const body=boards.slice(from,to);
 assert.ok(body.length>100);
 assert.match(body,/railRow\(box,'Trạng thái lịch'/);
 assert.match(body,/railRow\(box,'Khoảng thiếu người'/);
 assert.match(body,/railRow\(box,'Kiểm tra xung đột'/);
 assert.match(body,/document\.createElement\('details'\)/);
 assert.match(body,/className='x19o-issue-details'/);
 assert.match(body,/details\.open=expanded/);
 assert.match(body,/list\.appendChild\(line\)/);
 assert.doesNotMatch(body,/line\.appendChild\(line\)/);
 assert.match(body,/jumpToCalendarIssue\(sh,x,i\)/);
});
test('XSTORE-019O issues disclosure stays compact even with many shortages',()=>{
 assert.match(boards,/\.x19o-issue-scroll\{max-height:210px;overflow-y:auto/);
 assert.match(boards,/\.x19o-employment-label/);
 assert.match(boards,/\.x19o-employment-unknown/);
 assert.match(boards,/\.x19o-employment-ft/);
 assert.match(boards,/\.x19o-employment-pt/);
});
