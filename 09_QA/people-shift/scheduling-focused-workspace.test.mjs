import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
test('focused Scheduling workspace preserves authoritative controls and loads after services',async()=>{
 const [html,controller,css]=await Promise.all([
  load('05_MANAGER/SchedulingV2/index.html'),
  load('05_MANAGER/SchedulingV2/focused-workspace-v1.js'),
  load('05_MANAGER/SchedulingV2/schedule-v2.css')
 ]);
 for(const id of ['sv2Store','sv2Week','sv2Refresh','sv2Table','sv2Rows','sv2Stage'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/focused-workspace-v1\.js\?v=20261022-p1-inline1/);
 assert.ok(html.indexOf('post-publish-ui-v1.js')<html.indexOf('focused-workspace-v1.js'));
 assert.match(controller,/getElementById\('sv2AddShift'\)/);
 assert.match(controller,/add\.click\(\)/);
 assert.match(controller,/MutationObserver\(moveExtras\)/);
 assert.match(controller,/content\.appendChild\(el\)/);
 assert.match(controller,/magasin:scheduling-v2-week-loaded/);
 assert.match(css,/\.sv2-editor-layer\{place-items:stretch end/);
 assert.match(css,/\.sv2-roster\{padding:16px/);
 assert.doesNotMatch(controller,/\.rpc\(|\.from\(|fetch\(/);
});


test('mockup C uses approved morning yellow, afternoon red and evening blue on draft and published shifts',async()=>{
 const css=await load('05_MANAGER/SchedulingV2/schedule-v2.css');
 for(const [kind,bg] of [['morning','#fff3bd'],['afternoon','#ffe0e4'],['evening','#dcedff']]){
  assert.ok(css.includes('.sv2-roster .sv2-shift.sv2-band-'+kind+'{background:'+bg),kind);
 }
 assert.match(css,/\.sv2-roster \.sv2-shift\.sv2-draft\{outline:2px dashed/);
 assert.match(css,/\.sv2-roster \.sv2-shift\.sv2-official\{border-style:solid/);
});
