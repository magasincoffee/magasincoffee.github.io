import assert from 'node:assert/strict';
const origin='https://magasincoffee.github.io';
const paths=[
 '/05_MANAGER/SchedulingV2/index.html',
 '/05_MANAGER/SchedulingV2/editor-ui-v1.js',
 '/05_MANAGER/SchedulingV2/post-publish-ui-v1.js'
];
const fetchFiles=async()=>{
 const responses=await Promise.all(paths.map(async path=>{
  const url=origin+path+'?qa526_verify=606a1cd';
  const r=await fetch(url,{headers:{'cache-control':'no-cache'},redirect:'follow',signal:AbortSignal.timeout(15000)});
  assert.equal(r.status,200,path+' not HTTP 200');
  return await r.text();
 }));
 return responses;
};
for(let attempt=1;attempt<=12;attempt++){
 try{
  const [index,editor,post]=await fetchFiles();
  assert.ok(index.includes('editor-ui-v1.js?v=20261024-526-clock1'),'index lacks new draft JS cache key');
  assert.ok(index.includes('post-publish-ui-v1.js?v=20261024-526-clock1'),'index lacks new published JS cache key');
  for(const [name,js] of [['draft',editor],['published',post]]){
   assert.ok(js.includes('<select name="start" required aria-label="Giờ bắt đầu (24 giờ)"'),name+' start clock not deployed');
   assert.ok(js.includes('<select name="end" required aria-label="Giờ kết thúc (24 giờ)"'),name+' end clock not deployed');
   assert.ok(js.includes("['start',300,1290]")&&js.includes("['end',330,1320]"),name+' 05:00–22:00 boundaries not deployed');
   assert.ok(!js.includes('<input type="time" name="start"'),name+' stale native time widget deployed');
  }
  console.log('H4_PAGES_526_EXACT_LIVE_ASSETS_24H_PASS');
  console.log('H4_PAGES_526_POSTDEPLOY_READONLY_COMPLETE');
  process.exit(0);
 }catch(error){
  console.log('H4_PAGES_526_NOT_READY_ATTEMPT_'+attempt+': '+String(error.message).slice(0,170));
  if(attempt===12)throw error;
  await new Promise(resolve=>setTimeout(resolve,6000));
 }
}
