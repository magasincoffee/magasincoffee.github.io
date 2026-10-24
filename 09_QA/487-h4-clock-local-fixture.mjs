import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const repo=resolve(process.cwd(),'candidate');
const allow=new Map([
 ['/09_QA/people-shift/scheduling-526-clock-fixture.html','text/html; charset=utf-8'],
 ['/05_MANAGER/SchedulingV2/editor-ui-v1.js','application/javascript; charset=utf-8'],
 ['/05_MANAGER/SchedulingV2/post-publish-ui-v1.js','application/javascript; charset=utf-8']
]);
const server=createServer(async (request,response)=>{
 const url=new URL(request.url,'http://127.0.0.1');
 if(!allow.has(url.pathname)){response.writeHead(403);response.end('ISOLATED_QA_ONLY');return}
 try {
  const file=join(repo,...url.pathname.split('/').filter(Boolean));
  const data=await readFile(file);
  response.writeHead(200,{'Content-Type':allow.get(url.pathname),'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self' 'unsafe-inline'; connect-src 'self'"});
  response.end(data);
 }catch(error){response.writeHead(500);response.end('QA_FIXTURE_NOT_FOUND')}
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const port=server.address().port;
let result=1;
try{
 const child=spawn(process.execPath,['09_QA/people-shift/scheduling-526-clock-browser.mjs'],{
  cwd:repo,stdio:'inherit',windowsHide:true,env:{
   ...process.env,QA_BASE_URL:'http://127.0.0.1:'+port,
   QA_CHROME_CHANNEL:'chrome',HOME:process.env.USERPROFILE||process.env.HOME
  }
 });
 const [code]=await once(child,'exit');
 result=typeof code==='number'?code:1;
 if(result===0)console.log('H4_QA526_LOCAL_CHROME_ISOLATED_PASS');
}finally{
 await new Promise(resolve=>server.close(resolve));
}
process.exitCode=result;
