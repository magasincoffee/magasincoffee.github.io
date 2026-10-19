import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const get=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
for (const path of ['05_MANAGER/SchedulingV2/index.html','05_MANAGER/SchedulingV2/Demand/index.html']) {
  test(path+' navigates Manager pages in top-level window',async()=>{
    const html=await get(path);
    for(const href of ['/manager/','/manager/#staff','/manager/scheduling/','/manager/schedule/']) {
      const anchors=[...html.matchAll(/<a\b[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.includes('href="'+href+'"'));
      assert.ok(anchors.length>0,'missing '+href);
      assert.ok(anchors.every(tag=>tag.includes('target="_top"')),'iframe-trapped link '+href);
    }
  });
}
